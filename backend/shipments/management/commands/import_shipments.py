"""
Bulk-import shipment/container records from the Excel operations tracker.

Usage:
    python manage.py import_shipments "C:\\path\\to\\your\\file.xlsx"
    python manage.py import_shipments "C:\\path\\to\\your\\file.xlsx" --clear

Reads the four operational sheets (Original, Air Shipment, Completed
operations, Detail completed operations), matches each row's "Customer" to
an existing Customer (creating one if it doesn't exist yet), and creates one
Shipment record per row, copying every recognized column across as-is.

Every row becomes its own record — no de-duplication — because the source
sheet can legitimately repeat the same container/operation number across
rows (e.g. multi-stage tracking entries), and guessing which repeats are
"real" versus accidental isn't reliable. Pass --clear to wipe all existing
imported shipments first, so re-running the command doesn't pile up copies.
"""
import math
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from customers.models import Customer
from shipments.models import Shipment

# sheet name -> default status assigned to rows imported from it
SHEET_CONFIG = {
    'ORIGINAL': Shipment.Status.PENDING,
    'AIR SHIPMENT': Shipment.Status.IN_TRANSIT,
    'Completed operations ': Shipment.Status.DELIVERED,
    'DETAIL COMPLETED OPERATIONS': Shipment.Status.DELIVERED,
}

# Excel column name -> Shipment model field
COLUMN_MAP = {
    'Operation Number': 'operation_number',
    'Bill number': 'bill_number',
    'NO. OF CONTAINER': 'container_count',
    'Container Number': 'container_number',
    'LINER': 'liner',
    'Weight/With': 'weight_kg',
    'Border crossing': 'border_crossing',
    'Customs': 'customs_office',
    'Decl#': 'declaration_number',
    'Destination': 'destination_address',
    'Document Received Date': 'document_received_date',
    'VESSLE ARRIVAL DATE': 'vessel_arrival_date',
    'Truck plate number': 'truck_plate_number_raw',
    'Loading Date': 'loading_date',
    'Customs arrival': 'customs_arrival',
    'Customs released': 'customs_released',
    'Factory arrival': 'factory_arrival',
    'Factory unloading': 'factory_unloading',
    'Empty container return Date': 'empty_container_return_date',
    'Items': 'items',
    'Remark': 'remark',
    'RATE': 'rate',
}


def clean(value):
    """Normalize a pandas cell into a plain Python value, blank string for empties."""
    if value is None:
        return ''
    if isinstance(value, float) and math.isnan(value):
        return ''
    text = str(value).strip()
    if text.lower() in ('nan', 'nat', 'none'):
        return ''
    return text


class Command(BaseCommand):
    help = 'Import shipment/container rows from the Excel operations tracker.'

    def add_arguments(self, parser):
        parser.add_argument('excel_path', type=str, help='Path to the .xlsx file')
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete all existing shipments before importing, so re-running does not duplicate data.'
        )

    def handle(self, *args, **options):
        path = options['excel_path']

        try:
            xl = pd.ExcelFile(path)
        except FileNotFoundError:
            raise CommandError(f'File not found: {path}')
        except Exception as exc:
            raise CommandError(f'Could not open the Excel file: {exc}')

        if options['clear']:
            deleted, _ = Shipment.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Cleared existing shipments first ({deleted} rows removed).'))

        total_created = 0
        total_skipped_blank = 0

        for sheet_name, default_status in SHEET_CONFIG.items():
            if sheet_name not in xl.sheet_names:
                self.stdout.write(self.style.WARNING(f'Sheet "{sheet_name}" not found, skipping.'))
                continue

            df = pd.read_excel(xl, sheet_name=sheet_name)
            # normalize column names (strip stray whitespace)
            df.columns = [str(c).strip() for c in df.columns]

            if 'Customer' not in df.columns:
                self.stdout.write(self.style.WARNING(f'Sheet "{sheet_name}" has no Customer column, skipping.'))
                continue

            self.stdout.write(f'\n--- {sheet_name} ({len(df)} rows) ---')
            created_here = 0

            for _, row in df.iterrows():
                customer_name = clean(row.get('Customer'))
                if not customer_name:
                    total_skipped_blank += 1
                    continue

                customer, _ = Customer.objects.get_or_create(company_name=customer_name)

                field_values = {}
                for excel_col, model_field in COLUMN_MAP.items():
                    if excel_col not in df.columns:
                        continue
                    raw = clean(row.get(excel_col))
                    field_values[model_field] = raw

                # numeric fields need real types, not strings
                for numeric_field in ('weight_kg', 'rate'):
                    val = field_values.get(numeric_field, '')
                    if val == '':
                        field_values[numeric_field] = None
                    else:
                        try:
                            field_values[numeric_field] = float(val)
                        except ValueError:
                            field_values[numeric_field] = None

                remark_text = field_values.get('remark', '')
                status = Shipment.Status.DELIVERED if remark_text.upper() == 'COMPLETED' else default_status

                shipment = Shipment(
                    customer=customer,
                    status=status,
                    **field_values,
                )
                shipment._status_note = f"Imported from sheet — container {field_values.get('container_number') or 'n/a'}"
                shipment._status_location = field_values.get('destination_address', '') or field_values.get('border_crossing', '')
                shipment.save()
                created_here += 1
                total_created += 1

            self.stdout.write(self.style.SUCCESS(f'  {created_here} shipments created from this sheet.'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {total_created} shipments created in total '
            f'({total_skipped_blank} rows skipped for having no customer name).'
        ))
