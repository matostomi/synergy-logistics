from rest_framework import serializers
from .models import MasterOperation


class MasterOperationListSerializer(serializers.ModelSerializer):
    """Slim serializer for the table view — only what the list needs."""

    class Meta:
        model = MasterOperation
        fields = [
            'id', 'transport_mode', 'transport_provider', 'inland_transport_mode', 'operation_number', 'customer_name',
            'declaration_number', 'container_number', 'driver_name',
            'truck_plate_number', 'awb_number', 'shipping_line', 'status',
        ]


class MasterOperationDetailSerializer(serializers.ModelSerializer):
    """Full record — every field, used for the detail drill-down."""

    class Meta:
        model = MasterOperation
        fields = '__all__'
