from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, default=None)
    shipment_tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True, default=None)
    customer_name = serializers.CharField(source='shipment.customer.company_name', read_only=True, default=None)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'due_date', 'priority', 'status',
            'assigned_to', 'assigned_to_name', 'shipment', 'shipment_tracking_number',
            'customer_name', 'auto_generated', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'auto_generated', 'created_at', 'updated_at']
