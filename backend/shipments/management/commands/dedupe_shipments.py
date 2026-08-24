"""
One-time cleanup for duplicate Shipment records created by sync-matching bugs.

Three known causes, all now fixed going forward in integrations/google_sheets.py:
  1. Case/whitespace mismatches on (customer, operation number, container number)
     caused the same real shipment to be matched as "new" on some syncs.
  2. Rows without a container number assigned yet had NO reliable matching key
     at all, so every single sync run created a fresh duplicate of the same
     sheet row — this is the much bigger source of duplicates in practice.
  3. Rows with a blank Operation Number altogether (but a real container or
     bill number) fell through every tier and duplicated on every sync too.

This command finds all of these duplicate groups, keeps the most-recently-
updated row in each group, reassigns any events/documents/notifications from
the duplicates onto the keeper (so nothing is silently lost), then deletes
the duplicates.

Usage:
    python manage.py dedupe_shipments          # preview only, changes nothing
    python manage.py dedupe_shipments --apply  # actually merge/delete duplicates
"""
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from shipments.models import Shipment, ShipmentEvent, ShipmentDocument


def _table_exists(table_name):
    return table_name in connection.introspection.table_names()


class Command(BaseCommand):
    help = 'Find and merge duplicate shipments created by sync-matching bugs.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Actually merge/delete duplicates (default is preview-only).')

    def handle(self, *args, **options):
        apply_changes = options['apply']

        with_container = defaultdict(list)
        without_container = defaultdict(list)
        no_op_container = defaultdict(list)
        no_op_bill = defaultdict(list)

        for s in Shipment.objects.select_related('customer').all():
            op = (s.operation_number or '').strip().lower()
            container = (s.container_number or '').strip().lower()
            bill = (s.bill_number or '').strip().lower()

            if op and container:
                with_container[((s.customer.company_name or '').strip().lower(), op, container)].append(s)
            elif op and bill:
                # No container assigned yet, but operation number + bill number
                # together are specific enough to treat as the same shipment.
                # (Deliberately does NOT group rows that share only a bare
                # operation number with no bill number either — that's too
                # weak a key and risks merging genuinely different shipments,
                # e.g. several real orders all still carrying a shared
                # placeholder operation number like "SPLS00--/2026".)
                without_container[((s.customer.company_name or '').strip().lower(), op, bill)].append(s)
            elif not op and container:
                # No operation number at all, but a real container number —
                # about as unique as it gets on its own.
                no_op_container[((s.customer.company_name or '').strip().lower(), 'container', container)].append(s)
            elif not op and not container and bill:
                # Weakest tier: neither op# nor container, just a bill number.
                no_op_bill[((s.customer.company_name or '').strip().lower(), 'bill', bill)].append(s)

        all_groups = {**with_container, **without_container, **no_op_container, **no_op_bill}
        duplicate_groups = {k: v for k, v in all_groups.items() if len(v) > 1}

        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS('No duplicates found.'))
            return

        total_deleted = 0
        total_reassigned = 0

        for key, shipments in duplicate_groups.items():
            # keep the one most recently updated (most likely to have the fullest data)
            shipments.sort(key=lambda s: s.updated_at, reverse=True)
            keeper, dupes = shipments[0], shipments[1:]

            label = f'{keeper.customer.company_name} — {keeper.operation_number or "(no op#)"} / {keeper.container_number or "(no container)"}'
            self.stdout.write(f'\n{label}')
            self.stdout.write(self.style.SUCCESS(f'  KEEP:   id={keeper.id} (updated {keeper.updated_at})'))

            for d in dupes:
                events = ShipmentEvent.objects.filter(shipment=d)
                docs = ShipmentDocument.objects.filter(shipment=d)
                n_events, n_docs = events.count(), docs.count()

                try:
                    from tasks.models import Task
                    tasks_qs = Task.objects.filter(shipment=d)
                    n_tasks = tasks_qs.count()
                except Exception:
                    tasks_qs, n_tasks = None, 0

                # Leftover table from a pre-refactor "notifications" app — no longer
                # has a Django model (dashboard.Notification replaced it), but the
                # table and its FK constraint are still physically in the database.
                n_legacy = 0
                if _table_exists('notifications_notification'):
                    with connection.cursor() as c:
                        c.execute('SELECT COUNT(*) FROM notifications_notification WHERE shipment_id = %s', [d.id])
                        n_legacy = c.fetchone()[0]

                parts = []
                if n_events: parts.append(f'{n_events} event(s)')
                if n_docs: parts.append(f'{n_docs} document(s)')
                if n_tasks: parts.append(f'{n_tasks} task(s)')
                if n_legacy: parts.append(f'{n_legacy} legacy notification(s)')
                extra = f', reassigning {", ".join(parts)}' if parts else ''
                self.stdout.write(self.style.WARNING(f'  REMOVE: id={d.id} (updated {d.updated_at}){extra}'))

                if apply_changes:
                    with transaction.atomic():
                        events.update(shipment=keeper)
                        docs.update(shipment=keeper)
                        if tasks_qs is not None:
                            tasks_qs.update(shipment=keeper)
                        try:
                            from dashboard.models import Notification
                            Notification.objects.filter(shipment=d).update(shipment=keeper)
                        except Exception:
                            pass
                        if n_legacy:
                            with connection.cursor() as c:
                                c.execute(
                                    'UPDATE notifications_notification SET shipment_id = %s WHERE shipment_id = %s',
                                    [keeper.id, d.id],
                                )
                        d.delete()
                    total_reassigned += n_events + n_docs + n_tasks + n_legacy

                total_deleted += 1

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(
                f'\nDone. Merged {total_deleted} duplicate shipment(s), '
                f'reassigned {total_reassigned} related record(s).'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f'\nPreview only — {total_deleted} duplicate(s) found across '
                f'{len(duplicate_groups)} group(s), nothing changed. Re-run with --apply to merge them.'
            ))
