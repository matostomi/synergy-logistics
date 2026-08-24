import io
import json
from django.core import management
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsAdmin


class BackupDownloadView(APIView):
    """Admin-only: download a full JSON backup of all app data."""
    permission_classes = [IsAdmin]

    def get(self, request):
        buffer = io.StringIO()
        management.call_command(
            'dumpdata',
            '--exclude', 'contenttypes', '--exclude', 'auth.permission', '--exclude', 'admin.logentry',
            '--indent', '2',
            stdout=buffer,
        )
        content = buffer.getvalue()
        response = HttpResponse(content, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="synergy_logistics_backup.json"'
        return response


class BackupRestoreView(APIView):
    """Admin-only: restore data from a previously downloaded backup JSON file."""
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get('backup_file')
        if not uploaded_file:
            return Response({'detail': 'No backup file provided.'}, status=400)

        try:
            data = uploaded_file.read().decode('utf-8')
            json.loads(data)  # validate it's real JSON before handing to Django
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response({'detail': 'That file is not valid JSON.'}, status=400)

        tmp_path = '/tmp/restore_upload.json' if not hasattr(request, '_win_tmp') else None
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            management.call_command('loaddata', tmp_path)
        except Exception as exc:
            return Response({'detail': f'Restore failed: {exc}'}, status=400)

        return Response({'detail': 'Backup restored successfully.'})
