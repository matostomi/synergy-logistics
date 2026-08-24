"""
Read-only diagnostic report on the Shipment table. Changes nothing — just
prints what's actually going on, so we can see why 'dedupe_shipments' isn't
catching whatever's driving Total Shipments upward.

Usage:
    python manage.py diagnose_shipments
"""
from collections import Counter, defaultdict
from django.core.management.base import BaseCommand
from shipments.models import Shipment


class Command(BaseCommand):
    help = 'Read-only diagnostic report on Shipment duplicates/blank-field patterns.'

    def handle(self, *args, **options):
        total = Shipment.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Total shipments: {total}\n'))

        blank_op = Shipment.objects.filter(operation_number='').count()
        blank_container = Shipment.objects.filter(container_number='').count()
        blank_bill = Shipment.objects.filter(bill_number='').count()
        all_three_blank = Shipment.objects.filter(
            operation_number='', container_number='', bill_number='',
        ).count()
        self.stdout.write(f'Blank operation_number: {blank_op}')
        self.stdout.write(f'Blank container_number: {blank_container}')
        self.stdout.write(f'Blank bill_number:      {blank_bill}')
        self.stdout.write(f'ALL THREE blank:        {all_three_blank}\n')

        # Which single operation_number value appears on the most rows?
        # A placeholder like "SPLS00--/2026" shared across many genuinely
        # different shipments would show up here with a large count.
        op_counts = Counter(
            Shipment.objects.exclude(operation_number='').values_list('operation_number', flat=True)
        )
        top_shared_op_numbers = op_counts.most_common(10)
        self.stdout.write('Top 10 most-repeated non-blank operation numbers:')
        for op, count in top_shared_op_numbers:
            if count > 1:
                self.stdout.write(f'  {count:>4} shipments share operation_number = "{op}"')
        self.stdout.write('')

        # Which customer has the most shipments, and of those, how many
        # look like exact content duplicates (same everything except id)?
        by_customer = Counter(Shipment.objects.values_list('customer__company_name', flat=True))
        self.stdout.write('Top 10 customers by shipment count:')
        for name, count in by_customer.most_common(10):
            self.stdout.write(f'  {count:>4}  {name}')
        self.stdout.write('')

        # True content-duplicate check: group by every descriptive field at
        # once. If sync repeatedly created a fresh row for the exact same
        # sheet row, these fields should be identical across the duplicates
        # even when operation/container/bill are all blank.
        groups = defaultdict(list)
        for s in Shipment.objects.select_related('customer').only(
            'id', 'customer_id', 'operation_number', 'container_number', 'bill_number',
            'destination_address', 'weight_kg', 'description', 'remark', 'items',
            'declaration_number', 'liner', 'created_at',
        ):
            key = (
                (s.customer.company_name or '').strip().lower(),
                (s.destination_address or '').strip().lower(),
                (s.description or '').strip().lower(),
                (s.remark or '').strip().lower(),
                (s.items or '').strip().lower(),
                str(s.weight_kg or ''),
                (s.declaration_number or '').strip().lower(),
                (s.liner or '').strip().lower(),
            )
            # Skip fully-blank keys — grouping on "everything blank" would
            # lump together unrelated shipments that just have no data yet.
            if any(key[1:]):
                groups[key].append(s)

        content_dupe_groups = {k: v for k, v in groups.items() if len(v) > 1}
        total_excess = sum(len(v) - 1 for v in content_dupe_groups.values())
        self.stdout.write(self.style.WARNING(
            f'Content-duplicate groups found (same customer + destination + description + '
            f'remark + items + weight + declaration + liner, regardless of op#/container/bill): '
            f'{len(content_dupe_groups)} groups, {total_excess} excess rows\n'
        ))

        shown = 0
        for key, rows in sorted(content_dupe_groups.items(), key=lambda kv: -len(kv[1])):
            if shown >= 8:
                self.stdout.write(f'... and {len(content_dupe_groups) - shown} more groups not shown')
                break
            customer_name = rows[0].customer.company_name if rows[0].customer else '(no customer)'
            self.stdout.write(f'Group of {len(rows)} — customer "{customer_name}", destination "{key[1][:40]}":')
            for s in rows[:5]:
                self.stdout.write(
                    f'    id={s.id}  op="{s.operation_number}"  container="{s.container_number}"  '
                    f'bill="{s.bill_number}"  created={s.created_at:%Y-%m-%d %H:%M}'
                )
            if len(rows) > 5:
                self.stdout.write(f'    ... and {len(rows) - 5} more in this group')
            shown += 1
