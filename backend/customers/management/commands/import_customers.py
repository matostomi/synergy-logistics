"""
Bulk-import customer names from an Excel operations tracker.

Usage:
    python manage.py import_customers "C:\\path\\to\\your\\file.xlsx"

Scans every sheet in the workbook for a column literally named "Customer"
(case/whitespace-insensitive), collects every unique, non-empty value found,
and creates a Customer record for each one that doesn't already exist.
Existing customers (matched by company_name) are left untouched.
"""
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from customers.models import Customer


class Command(BaseCommand):
    help = "Import unique customer names from an Excel file into the Customer table."

    def add_arguments(self, parser):
        parser.add_argument('excel_path', type=str, help='Path to the .xlsx file')

    def handle(self, *args, **options):
        path = options['excel_path']

        try:
            xl = pd.ExcelFile(path)
        except FileNotFoundError:
            raise CommandError(f'File not found: {path}')
        except Exception as exc:
            raise CommandError(f'Could not open the Excel file: {exc}')

        found_names = set()

        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(xl, sheet_name=sheet_name)
            except Exception:
                continue

            # Find a column named "Customer" regardless of stray spaces/casing
            customer_col = None
            for col in df.columns:
                if str(col).strip().lower() == 'customer':
                    customer_col = col
                    break

            if customer_col is None:
                continue

            values = df[customer_col].dropna().astype(str).str.strip()
            values = values[values != '']
            found_names.update(values.tolist())

        if not found_names:
            self.stdout.write(self.style.WARNING(
                'No "Customer" column found in any sheet, or it was empty. Nothing imported.'
            ))
            return

        created_count = 0
        skipped_count = 0

        for name in sorted(found_names):
            obj, created = Customer.objects.get_or_create(company_name=name)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  + Added: {name}'))
            else:
                skipped_count += 1
                self.stdout.write(f'  - Already exists: {name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} new customers added, {skipped_count} already existed.'
        ))
