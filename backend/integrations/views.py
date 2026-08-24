from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from .google_sheets import SyncRefused, sync_all


class GoogleSheetSyncView(APIView):
    """Admin-only: trigger a pull-then-push sync with the configured Google Sheet."""
    permission_classes = [IsAdmin]

    def post(self, request):
        # force=true overrides the bulk-deletion safety limit. Deliberately opt-in
        # per request: the guard exists to stop a half-loaded sheet wiping the table.
        force = str(request.data.get('force', '')).lower() in ('1', 'true', 'yes')
        try:
            result = sync_all(force=force)
        except SyncRefused as exc:
            return Response({'detail': str(exc), 'needs_confirmation': True}, status=409)
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=400)
        except Exception as exc:
            return Response({'detail': f'Sync failed: {exc}'}, status=400)
        return Response(result)
