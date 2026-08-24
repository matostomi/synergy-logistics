"""
Two-way sync between the app and your "Operations" Google Sheet tab.

Requires GOOGLE_SERVICE_ACCOUNT_FILE and GOOGLE_SHEET_ID to be set in .env.
See the setup guide for how to obtain those.

Sync model (honest limitation): this is not instant/real-time. Calling
sync_all() does two passes —
  1. PULL: read every row from the "Operations" tab and upsert into the
     database, matched by (Customer, Operation Number, Container Number) —
     the same combination that's naturally unique in your sheet.
  2. PUSH: overwrite the tab with the database's current state, so anything
     created/edited in the app also shows up in the sheet.
Run it whenever you want the two sides reconciled — e.g. a button click.

Note: pushing rewrites the whole tab's values. Any dropdown validation rules
tied to specific columns should keep working (validation is a column-level
rule in Sheets, not tied to specific cell contents), but double-check your
dropdowns after the first push, just in case.
"""
from django.conf import settings

WORKSHEET_NAME = 'ALL DETAIL'

# Column order in the sheet <-> Shipment model field. Keep this in the same
# order as your actual sheet columns so pushes line up correctly.
SHEET_COLUMNS = [
    ('Customer', 'customer_name'),  # special-cased, not a direct model field
    ('Operation Number', 'operation_number'),
    ('Bill number', 'bill_number'),
    ('NO. OF CONTAINER', 'container_count'),
    ('Container Number', 'container_number'),
    ('LINER', 'liner'),
    ('Weight/With', 'weight_kg'),
    ('Border crossing', 'border_crossing'),
    ('Customs', 'customs_office'),
    ('Decl#', 'declaration_number'),
    ('Destination', 'destination_address'),
    ('Document Received Date', 'document_received_date'),
    ('VESSLE ARRIVAL DATE', 'vessel_arrival_date'),
    ('Truck plate number', 'truck_plate_number_raw'),
    ('Loading Date', 'loading_date'),
    ('Customs arrival', 'customs_arrival'),
    ('Customs released', 'customs_released'),
    ('Factory arrival', 'factory_arrival'),
    ('Factory unloading', 'factory_unloading'),
    ('Empty container return Date', 'empty_container_return_date'),
    ('Items', 'items'),
    ('Remark', 'remark'),
]

# Your Remark column doubles as the status indicator. Matched by keyword so
# typos/variants ("WATING", "REGESTER", "DOCMENT") still work.
STATUS_KEYWORDS = [
    # MUST stay first. 'Cancelled the order from customer.' contains the substring
    # CUSTOM (inside "customer"), so the CUSTOM rule below would otherwise claim
    # every cancelled row and file it as at_customs.
    ('CANCEL', 'cancelled'),
    ('COMPLET', 'delivered'),
    ('EMPTY CONTAINER', 'empty_container_returned'),
    ('FACTORY UNLOAD', 'factory_unloading'),
    ('FACTORY', 'factory_unloading'),
    ('CARGO RELEASE', 'waiting_cargo_release'),
    ('CUSTOM', 'at_customs'),
    ('TECHNICAL', 'technical_issues'),
    ('ISSUE', 'technical_issues'),
    ('TRAIN', 'in_transit'),
    ('TRANSIT', 'in_transit'),
    ('DOCMENT', 'pending'),
    ('DOCUMENT', 'pending'),
    ('REGESTER', 'pending'),
    ('REGISTER', 'pending'),
]


def _guess_status(remark_text):
    text = (remark_text or '').upper()
    # "Waiting/Wating for empty container return" means the container hasn't come
    # back yet — the shipment is still at the factory-unloading stage. Naive
    # substring matching on "EMPTY CONTAINER" alone would misread this as already
    # returned, so check for a waiting-word first and treat it as still in progress.
    if 'EMPTY CONTAINER' in text and ('WAIT' in text or 'WATING' in text):
        return 'factory_unloading'
    for keyword, status in STATUS_KEYWORDS:
        if keyword in text:
            return status
    return 'pending'


def _status_note_override(remark_text, resolved_status):
    """
    For a few statuses, the generic STATUS_MESSAGES text ('is being unloaded at
    the factory') doesn't match what the remark actually says. Return a more
    accurate note in those cases, or None to fall back to the default.
    """
    text = (remark_text or '').upper()
    if resolved_status == 'factory_unloading' and 'EMPTY CONTAINER' in text and ('WAIT' in text or 'WATING' in text):
        return 'Factory unloading done — currently waiting for empty container return.'
    return None


def _get_worksheet():
    """Returns an authenticated gspread Worksheet, or raises a clear error if not configured."""
    if not settings.GOOGLE_SHEET_ID or not settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        raise RuntimeError(
            'Google Sheets isn\'t configured yet. Set GOOGLE_SHEET_ID and '
            'GOOGLE_SERVICE_ACCOUNT_FILE in backend/.env — see the setup guide.'
        )
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        raise RuntimeError('Run "pip install gspread google-auth" first.')

    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    creds = Credentials.from_service_account_file(settings.GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(settings.GOOGLE_SHEET_ID)
    try:
        return sheet.worksheet(WORKSHEET_NAME)
    except gspread.WorksheetNotFound:
        raise RuntimeError(f'No tab named "{WORKSHEET_NAME}" found in the sheet. Check the tab name.')


def _normalize_header(text):
    return ' '.join(str(text).strip().split()).lower()


def _normalize_whitespace(text):
    """Collapse internal double-spaces and trim — keeps casing intact, unlike _normalize_header."""
    return ' '.join(str(text).strip().split())


def _read_rows_as_dicts(ws):
    """
    Like ws.get_all_records(), but matches header names case/whitespace-
    insensitively — tolerant of stray spaces or capitalization differences
    in the sheet's header row that would otherwise silently break matching.
    """
    all_values = ws.get_all_values()
    if not all_values:
        return []

    header_row = all_values[0]
    normalized_headers = [_normalize_header(h) for h in header_row]

    rows = []
    for raw_row in all_values[1:]:
        row_dict = {}
        for col_index, norm_header in enumerate(normalized_headers):
            if not norm_header:
                continue
            value = raw_row[col_index] if col_index < len(raw_row) else ''
            row_dict[norm_header] = value
        rows.append(row_dict)
    return rows


def _identity(customer, operation_number, container_number, bill_number):
    """
    Content identity of one shipment: who it's for, plus the three references
    that name it. Case- and whitespace-insensitive, because the sheet is typed
    by hand and 'TLLU 3715072' and 'tllu3715072' are the same container.
    """
    return (
        _normalize_header(customer),
        _normalize_header(operation_number),
        _normalize_header(container_number),
        _normalize_header(bill_number),
    )


def _sheet_row_identity(row):
    return _identity(
        row.get('customer', ''), row.get('operation number', ''),
        row.get('container number', ''), row.get('bill number', ''),
    )


def _shipment_identity(shipment):
    return _identity(
        shipment.customer.company_name if shipment.customer else '',
        shipment.operation_number, shipment.container_number, shipment.bill_number,
    )


# A sync that would remove more than this share of the database is treated as a
# mistake (a half-loaded sheet, a wrong tab, a permissions change) rather than a
# genuine bulk deletion, and is refused unless explicitly forced.
MAX_DELETE_FRACTION = 0.34


class SyncRefused(RuntimeError):
    """Raised when a sync looks destructive enough that a human should confirm it."""


def _row_field_values(row, Customer):
    """Map one sheet row onto Shipment field values. Returns None to skip the row."""
    customer_name = _normalize_whitespace(row.get('customer', ''))
    if not customer_name:
        return None

    operation_number = str(row.get('operation number', '')).strip()
    container_number = str(row.get('container number', '')).strip()
    bill_number = str(row.get('bill number', '')).strip()
    remark = str(row.get('remark', '')).strip()

    # Nothing identifying at all: an empty/template row, not a shipment.
    if not operation_number and not container_number and not bill_number and not remark:
        return None

    customer = Customer.objects.filter(company_name__iexact=customer_name).first()
    if not customer:
        customer = Customer.objects.create(company_name=customer_name)
    elif customer.company_name != customer_name:
        # The sheet is the source of truth for spelling/casing.
        customer.company_name = customer_name
        customer.save(update_fields=['company_name'])

    field_values = {'customer': customer, 'status': _guess_status(remark)}
    for sheet_col, model_field in SHEET_COLUMNS:
        if model_field == 'customer_name':
            continue
        field_values[model_field] = str(row.get(_normalize_header(sheet_col), '')).strip()

    weight_raw = field_values.get('weight_kg', '')
    try:
        field_values['weight_kg'] = float(weight_raw) if weight_raw else None
    except ValueError:
        field_values['weight_kg'] = None

    return field_values


def pull_from_sheet(force=False):
    """
    Make the database mirror the sheet: one Shipment per sheet row, no more.

    Identity is the row's *content* (customer + operation + container + bill),
    never its position, so re-sorting or inserting rows in the sheet is harmless.
    Rows that are identical even on all four references — genuine break-bulk
    consignments booked under one operation number — are paired off in order:
    the Nth such row in the sheet owns the Nth such record in the database. That
    keeps the counts equal without inventing a false distinction between them.

    Anything in the database that no longer appears in the sheet is deleted, so
    the two sides cannot drift. Two guards stand in front of that deletion: an
    empty read is always refused, and a run that would delete more than
    MAX_DELETE_FRACTION of the table is refused unless force=True.

    Returns (created, updated, deleted).
    """
    from collections import Counter, defaultdict
    from customers.models import Customer
    from shipments.models import Shipment

    ws = _get_worksheet()
    rows = _read_rows_as_dicts(ws)

    # An empty read means a broken connection, an emptied tab, or the wrong
    # worksheet — never a legitimate instruction to delete every shipment.
    if not rows:
        raise SyncRefused(
            f'The "{WORKSHEET_NAME}" tab came back empty. Refusing to sync, because '
            'that would delete every shipment. Check the sheet and try again.'
        )

    # What the sheet says should exist, in sheet order.
    wanted = []
    occurrences = Counter()
    for row in rows:
        field_values = _row_field_values(row, Customer)
        if field_values is None:
            continue
        identity = _sheet_row_identity(row)
        occurrences[identity] += 1
        wanted.append((identity, occurrences[identity], field_values, str(row.get('remark', '')).strip()))

    # What the database currently holds, bucketed by the same identity. Ordering
    # by id makes the pairing of duplicate rows stable across runs.
    existing = defaultdict(list)
    for shipment in Shipment.objects.select_related('customer').order_by('id'):
        existing[_shipment_identity(shipment)].append(shipment)

    created, updated, keep_ids = 0, 0, set()

    for identity, occurrence, field_values, remark in wanted:
        bucket = existing.get(identity, [])
        shipment = bucket[occurrence - 1] if occurrence <= len(bucket) else None

        if shipment is not None:
            for key, value in field_values.items():
                setattr(shipment, key, value)
            shipment._status_note = _status_note_override(remark, field_values['status']) or 'Updated from Google Sheet'
            shipment.save()
            updated += 1
        else:
            shipment = Shipment(**field_values)
            shipment._status_note = _status_note_override(remark, field_values['status']) or 'Created from Google Sheet'
            shipment.save()
            created += 1
        keep_ids.add(shipment.id)

    stale = Shipment.objects.exclude(id__in=keep_ids)
    stale_count = stale.count()
    total_before = Shipment.objects.count()

    if stale_count and not force:
        limit = int(total_before * MAX_DELETE_FRACTION)
        if stale_count > limit:
            raise SyncRefused(
                f'This sync would delete {stale_count} of {total_before} shipments, which is more '
                f'than the {int(MAX_DELETE_FRACTION * 100)}% safety limit. Nothing has been deleted. '
                f'Check that the sheet is complete, then re-run with force=True to proceed.'
            )

    deleted = stale_count
    if stale_count:
        stale.delete()

    return created, updated, deleted



def push_to_sheet():
    """Overwrite the Operations tab with the database's current shipment list. Returns row count written."""
    from shipments.models import Shipment

    ws = _get_worksheet()
    shipments = Shipment.objects.select_related('customer').order_by('-created_at')

    header = [col for col, _ in SHEET_COLUMNS]
    rows = [header]
    for s in shipments:
        row = []
        for sheet_col, model_field in SHEET_COLUMNS:
            if model_field == 'customer_name':
                row.append(s.customer.company_name if s.customer else '')
            elif model_field == 'weight_kg':
                row.append(str(s.weight_kg) if s.weight_kg is not None else '')
            else:
                row.append(getattr(s, model_field, '') or '')
        rows.append(row)

    ws.update(rows, 'B1')
    return len(rows) - 1


def sync_all(force=False):
    """
    Pull sheet edits into the app, and remove anything the sheet no longer
    lists, so the two sides mirror each other exactly. Pass force=True to
    override the bulk-deletion safety limit (see pull_from_sheet).

    Read-only against the sheet by design: this never writes
    back to the sheet. An earlier version pushed the database's data back to
    the sheet, but that rewrote row order (sorted by database insertion time)
    and risked disturbing your dropdown formatting — not worth the risk on a
    sheet you edit by hand daily. If you ever want a one-off export instead,
    ask for that separately rather than running it automatically.
    """
    created, updated, deleted = pull_from_sheet(force=force)
    return {'pulled_created': created, 'pulled_updated': updated, 'deleted': deleted}
