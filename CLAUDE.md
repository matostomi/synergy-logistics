# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Freight-forwarding operations system for Synergy Plus Logistics (Djibouti → Ethiopia import/transit corridor). Django REST API in `backend/`, React + Vite SPA in `frontend/`. Not a git repository — there is no version history to consult.

## Commands

This project was developed on Windows and copied to macOS. Both `backend/venv/` and the original `frontend/node_modules/` were Windows builds; a working macOS environment is set up at `backend/.venv/` (Python 3.12) and node_modules has been reinstalled for darwin-arm64.

**`python3` on this machine is Apple's 3.9.6, which Django 5.0 does not support.** Use Homebrew's 3.12 if the venv ever needs rebuilding:

```bash
cd backend && /opt/homebrew/bin/python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

3.14 is also installed but has no prebuilt wheels for the pinned `pandas 2.2.2` / `psycopg2-binary 2.9.9`.

**Always run `manage.py` from inside `backend/`.** `DB_NAME` in `.env` is the relative string `db.sqlite3`, so the database resolves against the *working directory* — running `python backend/manage.py runserver` from the project root silently creates an empty database at the root and every query fails with `no such table`. `.claude/launch.json` wraps the backend in `sh -c 'cd backend && ...'` for this reason.

```bash
cd backend
.venv/bin/python manage.py runserver 8001
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser
```

Frontend (from `frontend/`):

```bash
npm run dev      # :5173
npm run build
npm run lint     # note: no eslint config file exists yet, so this currently fails
```

Port 8000 is occupied on this machine by Colima's SSH forward, so the backend runs on **8001** and `frontend/.env` sets `VITE_API_BASE_URL=http://localhost:8001/api`. Note that `api.js` uses an absolute base URL, so Vite's `/api` proxy in `vite.config.js` is dead config — changing the backend port means changing `frontend/.env`, not the proxy.

Both servers are defined in `.claude/launch.json` (`backend`, `frontend`).

There is **no test suite** — no `test*.py`, no frontend test runner. Verify changes by running both servers and exercising the UI, or via `manage.py shell`.

### Data-loading and maintenance commands

These are the real operational tooling; read each file's module docstring before running one, since several are destructive or have `--dry-run`/`--apply` gates.

```bash
python manage.py sync_google_sheet [--pull-only|--push-only]
python manage.py import_shipments "<file.xlsx>" [--clear]
python manage.py import_customers "<file.xlsx>"
python manage.py import_master_operations [--sheet-id ...] [--tab ...] [--dry-run]
python manage.py diagnose_shipments          # read-only duplicate report
python manage.py dedupe_shipments [--apply]  # preview by default
```

**Landmine**: `import_master_operations` exists in *both* `shipments/management/commands/` and `master_database/management/commands/`. The `master_database` copy is the maintained one (tiered duplicate matching, multimodal/provider inference); the `shipments` copy is stale and references `MasterOperation.TransportMode.ROAD`, which no longer exists on the model. Django's `get_commands()` iterates `reversed(INSTALLED_APPS)`, so the earlier app wins — meaning the **stale `shipments` copy is what actually runs**. Delete it before relying on this command.

## Architecture

### Two parallel shipment datasets — do not conflate them

- **`Shipment`** (`shipments/`) — live, in-flight operations. Synced from the `ALL DETAIL` tab of the operations Google Sheet. Drives the dashboard, notifications, documents, and public tracking.
- **`MasterOperation`** (`master_database/`) — historical archive (2023+) imported from the `operation list` tab, one wide table covering air/multimodal/unimodal with mode-specific columns left blank when they don't apply. Read-mostly, its own pagination (25/page vs. the global 500), server-side search/filter only.

They share no foreign keys and no sync path.

### Auth and permissions

JWT (simplejwt) with a custom `accounts.User` carrying a `role` field: `admin`, `operations_officer`, `manager`, `driver`, `customer`. Three permission classes in `accounts/permissions.py` gate everything:

- `IsAdmin` — user management, backup/restore, Google Sheet sync
- `CanManageOperations` — read for all authenticated users, write for admin/operations_officer (shipments, customers, drivers, master ops)
- `CanViewReports` — admin/manager only

DRF's global default is `IsAuthenticated`. Two endpoints deliberately opt out: `GET /api/shipments/track/?number=` (QR-code lookup, exposes only `PublicTrackingSerializer` fields — no cost, rate, or internal notes) and `GET /api/dashboard/public-stats/`.

Login and token-refresh views set `authentication_classes = []` on purpose — DRF runs authentication before permission checks, so a stale browser token would otherwise 401 a valid login. Don't "fix" this.

### Signal-driven event and notification pipeline

`shipments/signals.py` (wired via `ShipmentsConfig.ready()`) is the single source of shipment history:

`Shipment.save()` → `pre_save` stashes the old status → `post_save` compares → on change, creates a `ShipmentEvent`, emails the customer, and creates a `dashboard.Notification`.

So **never bypass `.save()`** for status changes — a `queryset.update()` produces no event, no email, no notification. Callers can attach `_status_note` / `_status_location` to the instance before saving to control the event text (see `ShipmentViewSet.update_status`).

Email falls back to the console backend unless `EMAIL_HOST_USER` is set, and `send_mail` is wrapped so a broken SMTP config can never block a save.

### Google Sheets sync

`integrations/google_sheets.py`. `sync_all()` is **pull-only against the sheet** — an earlier version pushed back and scrambled the hand-maintained row order and dropdown formatting. `push_to_sheet()` still exists but is only reachable via `--push-only`.

The database **mirrors** the sheet: one Shipment per sheet row, and anything absent from the sheet is deleted. Two guards protect that deletion — an empty read raises `SyncRefused` rather than wiping the table, and a run that would delete more than `MAX_DELETE_FRACTION` (34%) of records refuses unless `force=True` (`--force` on the command, `{"force": true}` on the endpoint, which returns 409 with `needs_confirmation` when refused).

Two fragile-by-necessity pieces:

- **Status inference**: the sheet's free-text `Remark` column *is* the status field. `STATUS_KEYWORDS` matches misspellings deliberately (`WATING`, `DOCMENT`, `REGESTER`). Order is load-bearing and the list is checked top-down: `CANCEL` **must** stay first because `"Cancelled the order from customer."` contains `CUSTOM` inside "customer" — that collision silently filed every cancelled order as `at_customs` until Aug 2026. `"waiting for empty container"` is likewise special-cased ahead of `EMPTY CONTAINER`.
- **Row identity**: a row is identified by its *content* — customer + operation number + container + bill, case- and whitespace-insensitive. Rows identical on all four (genuine break-bulk consignments under one operation number) are paired by occurrence: the Nth such sheet row owns the Nth such database record. Identity is deliberately **not** positional, so re-sorting or inserting rows in the sheet is harmless. This replaced a five-tier fallback cascade that generated a fresh duplicate on every sync for any row missing an operation or container number; that cascade is why `dedupe_shipments.py` exists.

Verify a sync change by running `sync_all()` three times in a row — it must report `created=0` after the first.

`AutoSyncContext` on the frontend polls this endpoint on a user-configurable interval, admin-only, mirroring the backend permission.

### Deliberate schema choices

Most timeline dates on both `Shipment` and `MasterOperation` are `CharField`, not `DateField` — the source sheets mix `dd/mm/yyyy`, `"24 -3 -2026"`, and converted Excel serials, and coercion loses data. Only `container_return_deadline` (manually set, drives the alert engine) is a real `DateField`. `transport_mode` is intentionally blank-by-default rather than guessed.

### Awaiting Registration

An operation number is only issued at registration; until then the sheet carries a placeholder with dashes for the digits (`SPLS00--/2026`). `AWAITING_REGISTRATION_MARKER` in `shipments/models.py` is the single definition — match on the dashes, never the literal string, so it survives the year rolling over. The dashboard card and the `awaiting_registration` filter on `ShipmentFilter` both exclude cancelled orders, which have their own card.

### Orphaned `notifications_notification` table

A pre-refactor `notifications` app was replaced by `dashboard.Notification`, but its table and its `django_migrations` row survive with a **non-cascading FK to `shipments_shipment`**. Django's collector doesn't know about it, so any bulk `Shipment.delete()` fails with `IntegrityError: FOREIGN KEY constraint failed`. Clear `shipment_id` on that table first (it's nullable). `dedupe_shipments.py` works around the same table in raw SQL.

### Known-broken: Master Operations

The `master_database` table in the current `db.sqlite3` is missing the `transport_provider` column, so any query against `MasterOperation` raises `OperationalError` and the **Master Operations page fails**. Three migrations are written but unapplied (`0002_transport_structure`, `0002_transport_provider`, and their merge), plus there are model changes with no migration yet (index renames and a `transport_mode` alteration, from `ROAD` being dropped from the choices). The table also holds 0 rows — the historical archive was never imported into this database. Everything else (shipments, dashboard, customers) works.

Nothing runs on a scheduler. `tasks/alerts.py::check_deadlines()` and the delay scan (`POST /api/dashboard/notifications/check_delays/`) only fire when triggered from the UI or a management/cron invocation, and each is idempotent (dedupes on `Task.auto_generated_key` / unread-notification lookup).

### Frontend

- `src/services/api.js` is the **only** place axios is called — every backend endpoint has a named method on a `*Service` object. Add new endpoints there, not inline in components.
- Auth interceptor refreshes the access token once on a 401 then retries; a failed refresh clears tokens and hard-redirects to `/login`. Tokens live in `localStorage` (remember me) or `sessionStorage`, read through `tokenStorage.js`.
- Five context providers wrap the app in a fixed order in `App.jsx`: Auth → Theme → Notification → StatusColor → AutoSync. `AutoSync` depends on `useAuth`, so it must stay inside `AuthProvider`.
- Styling is one 1600-line global `src/index.css` — plain CSS custom properties, no framework, no CSS modules. Status pill colors are admin-editable at runtime via `dashboard.StatusColor` and applied through `StatusColorContext`, so hardcoding a status color in CSS will be overridden.
- Routes are all-or-nothing wrapped by `withLayout()` (`ProtectedRoute` + sidebar shell) except `/login` and `/track/:trackingNumber`.

## Configuration

`backend/.env` (see `.env.example`). Defaults to SQLite (`db.sqlite3`, committed with real data); switch to Postgres via `DB_ENGINE`/`DB_*`. `GOOGLE_SERVICE_ACCOUNT_FILE` in the example still points at a Windows path — set it to the local `backend/google-credentials.json`.

`backend/.env`, `backend/google-credentials.json`, and `backend/db.sqlite3` all contain live production data and credentials; there is no `.gitignore` yet, so be careful if this ever becomes a git repo.
