from django.core.management.base import BaseCommand, CommandError
from integrations.google_sheets import sync_all, pull_from_sheet, push_to_sheet, SyncRefused


class Command(BaseCommand):
    help = 'Sync shipments with the configured Google Sheet (pull edits in, then push current data out).'

    def add_arguments(self, parser):
        parser.add_argument('--pull-only', action='store_true', help='Only pull sheet edits into the database.')
        parser.add_argument('--push-only', action='store_true', help='Only push database data out to the sheet.')
        parser.add_argument('--force', action='store_true', help='Override the bulk-deletion safety limit.')

    def handle(self, *args, **options):
        try:
            if options['pull_only']:
                created, updated, deleted = pull_from_sheet(force=options['force'])
                self.stdout.write(self.style.SUCCESS(
                    f'Pulled: {created} created, {updated} updated, {deleted} deleted.'))
            elif options['push_only']:
                count = push_to_sheet()
                self.stdout.write(self.style.SUCCESS(f'Pushed {count} shipments to the sheet.'))
            else:
                result = sync_all(force=options['force'])
                self.stdout.write(self.style.SUCCESS(
                    f"Pulled: {result['pulled_created']} created, "
                    f"{result['pulled_updated']} updated, {result['deleted']} deleted."
                ))
        except SyncRefused as exc:
            raise CommandError(f'{exc}\n\nRe-run with --force if this is expected.')
        except RuntimeError as exc:
            raise CommandError(str(exc))
