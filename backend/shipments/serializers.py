from django.utils import timezone
from rest_framework import serializers
from .models import Shipment, ShipmentEvent, ShipmentDocument

# Ordered pipeline used to compute a rough "progress %" for a shipment.
PROGRESS_STAGES = [
    Shipment.Status.PENDING,
    Shipment.Status.IN_TRANSIT,
    Shipment.Status.AT_CUSTOMS,
    Shipment.Status.WAITING_CARGO_RELEASE,
    Shipment.Status.FACTORY_UNLOADING,
    Shipment.Status.EMPTY_CONTAINER_RETURNED,
    Shipment.Status.DELIVERED,
]


def compute_progress_percent(obj):
    if obj.status == Shipment.Status.CANCELLED:
        return 0
    if obj.status == Shipment.Status.TECHNICAL_ISSUES:
        return None  # stalled — no meaningful position on the pipeline
    try:
        index = PROGRESS_STAGES.index(obj.status)
    except ValueError:
        return None
    return round((index / (len(PROGRESS_STAGES) - 1)) * 100)


def compute_eta_display(obj):
    if not obj.estimated_delivery:
        return None
    now = timezone.now()
    delta = obj.estimated_delivery - now
    if delta.total_seconds() <= 0:
        return 'Overdue'
    hours, remainder = divmod(int(delta.total_seconds()), 3600)
    minutes = remainder // 60
    if hours >= 24:
        days = hours // 24
        return f'{days}d {hours % 24}h'
    return f'{hours}h {minutes}m'


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ['id', 'shipment', 'status', 'location', 'note', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class ShipmentDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True, default=None)
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentDocument
        fields = ['id', 'shipment', 'doc_type', 'file', 'file_name', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']

    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else None


class ShipmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True, default='')
    driver_name = serializers.CharField(source='driver.full_name', read_only=True, default=None)
    events = ShipmentEventSerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()
    eta_display = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            'id', 'tracking_number', 'customer', 'customer_name', 'customer_phone', 'driver', 'driver_name',
            'origin_address', 'destination_address', 'weight_kg', 'description',
            'status', 'priority', 'estimated_delivery', 'delivered_at', 'cost',
            'operation_number', 'bill_number', 'container_count', 'container_number',
            'liner', 'border_crossing', 'customs_office', 'declaration_number',
            'items', 'remark', 'rate',
            'document_received_date', 'vessel_arrival_date', 'truck_plate_number_raw',
            'loading_date', 'customs_arrival', 'customs_released', 'factory_arrival',
            'factory_unloading', 'empty_container_return_date', 'container_return_deadline',
            'progress_percent', 'eta_display',
            'created_at', 'updated_at', 'events',
        ]
        read_only_fields = ['id', 'tracking_number', 'created_at', 'updated_at']

    def get_progress_percent(self, obj):
        return compute_progress_percent(obj)

    def get_eta_display(self, obj):
        return compute_eta_display(obj)


class PublicTrackingSerializer(serializers.ModelSerializer):
    """
    Fields shown to anyone who scans a shipment's QR code — no login required.
    Deliberately excludes cost, rate, and internal remarks.
    """
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True, default=None)
    eta_display = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            'tracking_number', 'customer_name', 'driver_name', 'status',
            'destination_address', 'container_number', 'estimated_delivery',
            'eta_display', 'progress_percent',
        ]

    def get_eta_display(self, obj):
        return compute_eta_display(obj)

    def get_progress_percent(self, obj):
        return compute_progress_percent(obj)
