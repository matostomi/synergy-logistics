from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True, default=None)
    customer_name = serializers.CharField(source='shipment.customer.company_name', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = [
            'id', 'notif_type', 'title', 'message', 'shipment',
            'tracking_number', 'customer_name', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
