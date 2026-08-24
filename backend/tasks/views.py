import calendar as calendar_module
from datetime import date

from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import CanManageOperations
from shipments.models import Shipment
from .models import Task
from .serializers import TaskSerializer
from .alerts import check_deadlines


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related('assigned_to', 'shipment', 'shipment__customer')
    serializer_class = TaskSerializer
    permission_classes = [CanManageOperations]

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Returns everything with a date in the given month: tasks (by due_date)
        and shipment container-return deadlines (by container_return_deadline),
        merged into one list of calendar events.
        Query params: year, month (both required, e.g. ?year=2026&month=7)
        """
        try:
            year = int(request.query_params.get('year'))
            month = int(request.query_params.get('month'))
        except (TypeError, ValueError):
            today = timezone.localdate()
            year, month = today.year, today.month

        last_day = calendar_module.monthrange(year, month)[1]
        start = date(year, month, 1)
        end = date(year, month, last_day)

        events = []

        tasks = Task.objects.filter(due_date__gte=start, due_date__lte=end).select_related('shipment', 'shipment__customer')
        for t in tasks:
            events.append({
                'type': 'task',
                'id': t.id,
                'date': t.due_date,
                'title': t.title,
                'priority': t.priority,
                'status': t.status,
                'shipment_id': t.shipment_id,
                'auto_generated': t.auto_generated,
            })

        shipments = Shipment.objects.filter(
            container_return_deadline__gte=start, container_return_deadline__lte=end,
        ).exclude(status=Shipment.Status.EMPTY_CONTAINER_RETURNED).select_related('customer')
        for s in shipments:
            events.append({
                'type': 'deadline',
                'id': s.id,
                'date': s.container_return_deadline,
                'title': f'{s.customer.company_name} — container return due',
                'priority': 'high',
                'status': s.status,
                'shipment_id': s.id,
                'auto_generated': False,
            })

        return Response(events)


class CheckDeadlinesView(APIView):
    """Manually trigger the alert engine (in production, schedule this instead)."""
    permission_classes = [CanManageOperations]

    def post(self, request):
        created = check_deadlines()
        return Response({'alerts_created': created})
