from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .notification_serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.select_related('shipment', 'shipment__customer')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        notif_type = self.request.query_params.get('notif_type')
        is_read = self.request.query_params.get('is_read')
        if notif_type:
            qs = qs.filter(notif_type=notif_type)
        if is_read is not None:
            qs = qs.filter(is_read=(is_read.lower() == 'true'))
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        qs = self.get_queryset().filter(is_read=False)
        count = qs.update(is_read=True)
        return Response({'marked_read': count})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        return Response({'unread_count': self.get_queryset().filter(is_read=False).count()})

    @action(detail=False, methods=['post'])
    def check_delays(self, request):
        """Scan for overdue shipments (past ETA, not completed/cancelled) and notify once each."""
        from shipments.models import Shipment

        now = timezone.now()
        overdue = Shipment.objects.filter(estimated_delivery__lt=now).exclude(
            status__in=[Shipment.Status.DELIVERED, Shipment.Status.CANCELLED]
        )

        created = 0
        for shipment in overdue:
            already_notified = Notification.objects.filter(shipment=shipment, notif_type='delay').exists()
            if already_notified:
                continue
            Notification.objects.create(
                notif_type='delay',
                title=f'{shipment.customer.company_name} — shipment overdue',
                message=f'{shipment.tracking_number} was expected {shipment.estimated_delivery.date()}.',
                shipment=shipment,
            )
            created += 1

        return Response({'delay_alerts_created': created})
