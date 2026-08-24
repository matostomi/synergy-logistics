"""
Import historical operations from the company's master Google Sheet
("operation list" tab) into the MasterOperation table. Separate from, and
does not touch, the existing Shipment sync — this is a distinct dataset.

Usage:
    python manage.py import_master_operations
    python manage.py import_master_operations --sheet-id 1RnnHo... --tab "operation list"
    python manage.py import_master_operations --dry-run

Column matching is resilient: it first tries an exact match (ignoring case/
whitespace) against the expected header text, and falls back to keyword
matching for anything that doesn't match exactly — since sheet headers can
have small wording differences (extra spaces, slightly different phrasing).
"""
import re
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

DEFAULT_SHEET_ID = '1RnnHo8sEXyhCDp-EBnkOBczVAaPo1FFg'
DEFAULT_TAB = 'operation list'

# normalized exact header text -> model field
EXACT_MAP = {
    'operation number': 'operation_number',
    'customer name': 'customer_name',
    'operation type': 'operation_type',
    'complete document received date': 'document_received_date',
    'customs branch': 'customs_branch',
    'model': 'customs_model',
    'declaration number': 'declaration_number',
    'bill number': 'bill_number',
    'number of containers': 'num_containers',
    'shipper/exporter': 'shipper_exporter',
    'notify party': 'notify_party',
    'port of loading': 'port_of_loading',
    'port of discharge': 'port_of_discharge',
    'container number': 'container_number',
    'ci number': 'ci_number',
    'pl number': 'pl_number',
    'carrier': 'shipping_line',
    'departure date from pol': 'departure_date',
    'eta/ata at pod': 'eta',
    'mode of transport': '_mode_of_transport',  # handled specially, not a direct field
    'do collection date': 'do_collection_date',
    'truck assigned date': 'truck_assigned_date',
    'weight including container': 'weight_incl_container',
    'gross weight': 'gross_weight',
    'net weight': 'net_weight',
    'number of items': 'num_items',
    'number of package': 'num_packages',
    'number of packages': 'num_packages',
    'transport rate': 'transport_rate',
    'truck plate number': 'truck_plate_number',
    'driver name': 'driver_name',
    'driver djibouti phone': 'driver_phone_djibouti',
    'driver ethiopia phone': 'driver_phone_ethiopia',
    'transport association name': 'transport_association',
    'association phone': 'association_phone',
    'owner name': 'owner_name',
    'owner phone': 'owner_phone',
    'gate pass date': 'gate_pass_date',
    'loading date': 'loading_date',
    'exit date': 'exit_date',
    'customs arrival date': 'customs_arrival_date',
    'tax payment date': 'tax_payment_date',
    'customs release date': 'customs_release_date',
    'factory/warehouse arrival date': 'factory_arrival_date',
    'offloading date': 'offloading_date',
    'container return paper given date': 'container_return_paper_date',
    'empty return date': 'empty_return_date',
    'if multi modal': 'is_multimodal',
    'dry port name': 'dry_port_name',
    'dryport arrival date': 'dryport_arrival_date',
    'dryport departure date': 'dryport_departure_date',
    'final declaration collected date': 'final_declaration_collected_date',
    'container bond opening date': 'container_bond_opening_date',
    'remarkr': 'remark',
    'remark': 'remark',
    'status': '_status',  # handled specially
}

# fallback: normalized header CONTAINS keyword -> field (checked in order, first match wins)
KEYWORD_FALLBACKS = [
    ('operation number', 'operation_number'),
    ('customer', 'customer_name'),
    ('declaration', 'declaration_number'),
    ('bill number', 'bill_number'),
    ('container number', 'container_number'),
    ('number of container', 'num_containers'),
    ('shipper', 'shipper_exporter'),
    ('notify', 'notify_party'),
    ('port of loading', 'port_of_loading'),
    ('port of discharge', 'port_of_discharge'),
    ('carrier', 'shipping_line'),
    ('driver name', 'driver_name'),
    ('djibouti', 'driver_phone_djibouti'),
    ('ethiopia phone', 'driver_phone_ethiopia'),
    ('truck plate', 'truck_plate_number'),
    ('transport association', 'transport_association'),
    ('owner name', 'owner_name'),
    ('owner phone', 'owner_phone'),
    ('transport rate', 'transport_rate'),
    ('gross weight', 'gross_weight'),
    ('net weight', 'net_weight'),
    ('customs arrival', 'customs_arrival_date'),
    ('customs release', 'customs_release_date'),
    ('tax payment', 'tax_payment_date'),
    ('factory', 'factory_arrival_date'),
    ('offload', 'offloading_date'),
    ('empty return', 'empty_return_date'),
    ('container return paper', 'container_return_paper_date'),
    ('dry port', 'dry_port_name'),
    ('remark', 'remark'),
]

STATUS_KEYWORDS = [
    ('COMPLET', 'completed'),
    ('CANCEL', 'cancelled'),
    ('CUSTOM', 'at_customs'),
    ('PROGRESS', 'in_progress'),
    ('TRANSIT', 'in_progress'),
]


def normalize(text):
    return ' '.join(str(text).strip().split()).lower()


def guess_status(status_cell, remark_cell):
    text = f'{status_cell} {remark_cell}'.upper()
    for keyword, status in STATUS_KEYWORDS:
        if keyword in text:
            return status
    return 'pending'


def _find_existing(operation_number, customer_name, container_number, bill_number):
    """
    Same tiered matching used for the Shipments Google Sheet sync, applied
    here too — a row without a container/bill number yet (common early in
    an operation's life) must still match itself on a later re-import once
    that field gets filled in, rather than spawning a duplicate record.

    Tier 1 (most reliable): customer + operation number + container number.
    Tier 2 (no container yet): customer + operation number + bill number —
      only if that combination is unambiguous (exactly one candidate).
    Tier 3 (no bill number either): customer + operation number alone —
      only if unambiguous.
    """
    from master_database.models import MasterOperation

    if container_number:
        match = MasterOperation.objects.filter(
            operation_number__iexact=operation_number,
            customer_name__iexact=customer_name,
            container_number__iexact=container_number,
        ).order_by('id').first()
        if match:
            return match

    if bill_number:
        candidates = MasterOperation.objects.filter(
            operation_number__iexact=operation_number,
            customer_name__iexact=customer_name,
            bill_number__iexact=bill_number,
        )
        if candidates.count() == 1:
            return candidates.first()

    candidates = MasterOperation.objects.filter(
        operation_number__iexact=operation_number,
        customer_name__iexact=customer_name,
    )
    if candidates.count() == 1:
        return candidates.first()

    return None


def get_worksheet(sheet_id, tab_name):
    if not settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        raise CommandError('GOOGLE_SERVICE_ACCOUNT_FILE is not set in .env')
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        raise CommandError('Run "pip install gspread google-auth" first.')

    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    creds = Credentials.from_service_account_file(settings.GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(sheet_id)
    try:
        return sheet.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        available = ', '.join(ws.title for ws in sheet.worksheets())
        raise CommandError(f'No tab named "{tab_name}" found. Available tabs: {available}')


class Command(BaseCommand):
    help = 'Import the master operation list from the company Google Sheet into MasterOperation.'

    def add_arguments(self, parser):
        parser.add_argument('--sheet-id', default=DEFAULT_SHEET_ID)
        parser.add_argument('--tab', default=DEFAULT_TAB)
        parser.add_argument('--dry-run', action='store_true', help='Preview only, do not write to the database.')

    def handle(self, *args, **options):
        from master_database.models import MasterOperation

        ws = get_worksheet(options['sheet_id'], options['tab'])
        all_values = ws.get_all_values()
        if not all_values:
            self.stdout.write(self.style.WARNING('Sheet is empty.'))
            return

        headers = [normalize(h) for h in all_values[0]]

        # resolve each column index to a field name once
        column_field_map = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            if header in EXACT_MAP:
                column_field_map[idx] = EXACT_MAP[header]
                continue
            for keyword, field in KEYWORD_FALLBACKS:
                if keyword in header:
                    column_field_map[idx] = field
                    break

        unmatched = [all_values[0][i] for i in range(len(headers)) if i not in column_field_map and headers[i]]
        if unmatched:
            self.stdout.write(self.style.WARNING(f'Columns not recognized (skipped): {unmatched}'))

        created, updated, skipped = 0, 0, 0

        for row in all_values[1:]:
            field_values = {}
            status_raw = ''
            for idx, field in column_field_map.items():
                if idx >= len(row):
                    continue
                raw = row[idx].strip()
                if field == '_status':
                    status_raw = raw
                elif field == '_mode_of_transport':
                    continue  # informational only, transport_mode is inferred from the sheet itself (all road for now)
                elif field == 'is_multimodal':
                    field_values[field] = raw.strip().lower() in ('yes', 'true', '1')
                else:
                    field_values[field] = raw

            customer_name = field_values.get('customer_name', '').strip()
            operation_number = field_values.get('operation_number', '').strip()
            if not customer_name or not operation_number:
                skipped += 1
                continue

            field_values['status'] = guess_status(status_raw, field_values.get('remark', ''))

            # This sheet is road-freight only, but a shipment can still be the
            # inland leg of a multimodal (ocean + Djibouti dry port) movement
            # — the sheet's own "if multi modal" column tells us which.
            if field_values.get('is_multimodal'):
                field_values['transport_mode'] = MasterOperation.TransportMode.MULTIMODAL
            else:
                field_values['transport_mode'] = MasterOperation.TransportMode.UNIMODAL

            # Best-effort carrier name: whatever the sheet already told us
            # about who's operating this leg. Left blank rather than guessed
            # ("Our Truck") when the sheet doesn't say — safer to have a
            # human fill it in than to silently mislabel a third-party carrier.
            provider = field_values.get('transport_association') or field_values.get('owner_name') or ''
            if provider:
                field_values['transport_provider'] = provider

            container_number = field_values.get('container_number', '')

            if options['dry_run']:
                created += 1
                continue

            existing = _find_existing(operation_number, customer_name, container_number, field_values.get('bill_number', ''))

            if existing:
                for key, value in field_values.items():
                    setattr(existing, key, value)
                existing.save()
                updated += 1
            else:
                MasterOperation.objects.create(**field_values)
                created += 1

        verb = 'Would create/update' if options['dry_run'] else 'Created/updated'
        self.stdout.write(self.style.SUCCESS(
            f'{verb}: {created} new, {updated} updated. Skipped {skipped} rows with no customer/operation number.'
        ))
