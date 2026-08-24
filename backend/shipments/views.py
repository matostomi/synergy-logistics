import re
import django_filters
from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import CanManageOperations
from .models import AWAITING_REGISTRATION_MARKER, Shipment, ShipmentDocument
from .serializers import ShipmentSerializer, ShipmentEventSerializer, ShipmentDocumentSerializer, PublicTrackingSerializer


class ShipmentFilter(django_filters.FilterSet):
    """Backs the Advanced Filters panel: customer, driver, status, customs office,
    destination, and a created-at date range."""
    customs = django_filters.CharFilter(field_name='customs_office', lookup_expr='icontains')
    destination = django_filters.CharFilter(field_name='destination_address', lookup_expr='icontains')
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    awaiting_registration = django_filters.BooleanFilter(
        method='filter_awaiting_registration',
        label='Not yet issued an operation number',
    )

    def filter_awaiting_registration(self, queryset, name, value):
        """Matches the Awaiting Registration dashboard card exactly, cancelled orders and all."""
        if value is None:
            return queryset
        awaiting = Q(operation_number__contains=AWAITING_REGISTRATION_MARKER) & ~Q(status=Shipment.Status.CANCELLED)
        return queryset.filter(awaiting) if value else queryset.exclude(awaiting)

    class Meta:
        model = Shipment
        fields = [
            'status', 'priority', 'customer', 'driver', 'customs', 'destination',
            'date_from', 'date_to', 'awaiting_registration',
        ]


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('customer', 'driver').prefetch_related('events', 'documents')
    serializer_class = ShipmentSerializer
    permission_classes = [CanManageOperations]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ShipmentFilter
    search_fields = [
        'tracking_number', 'origin_address', 'destination_address',
        'container_number', 'operation_number', 'bill_number', 'declaration_number',
        'truck_plate_number_raw', 'customer__company_name', 'driver__full_name',
    ]
    ordering_fields = ['created_at', 'estimated_delivery', 'cost']

    def get_permissions(self):
        # Public QR-code tracking: no login required, but only exposes safe fields
        # (see PublicTrackingSerializer — no cost, rate, or internal notes).
        if self.action == 'track':
            return [permissions.AllowAny()]
        return super().get_permissions()

    @staticmethod
    def _operation_sort_key(shipment):
        """
        Sort by the numeric part of the operation number (e.g. 'SPLS0079/2026' -> 79),
        newest/highest first — matching how new rows are always added at the bottom of
        the Google Sheet. Falls back to created_at for rows with no operation number.
        """
        match = re.search(r'(\d+)', shipment.operation_number or '')
        number = int(match.group(1)) if match else -1
        return (number, shipment.created_at)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        if not request.query_params.get('ordering'):
            queryset = sorted(queryset, key=self._operation_sort_key, reverse=True)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Move a shipment to a new status. A ShipmentEvent (and notification) is created automatically."""
        shipment = self.get_object()
        new_status = request.data.get('status')
        location = request.data.get('location', '')
        note = request.data.get('note', '')

        valid_statuses = dict(Shipment.Status.choices)
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.status = new_status
        shipment._status_location = location
        shipment._status_note = note
        shipment.save(update_fields=['status', 'updated_at'])

        return Response(self.get_serializer(shipment).data)

    @action(detail=False, methods=['get'])
    def track(self, request):
        """Public lookup by tracking number for QR-code scans, e.g. ?number=SLX-XXXX"""
        number = request.query_params.get('number')
        if not number:
            return Response({'detail': 'A tracking number is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            shipment = Shipment.objects.get(tracking_number=number)
        except Shipment.DoesNotExist:
            return Response({'detail': 'Shipment not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicTrackingSerializer(shipment).data)


class ShipmentDocumentViewSet(viewsets.ModelViewSet):
    queryset = ShipmentDocument.objects.select_related('shipment', 'uploaded_by')
    serializer_class = ShipmentDocumentSerializer
    permission_classes = [CanManageOperations]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['shipment', 'doc_type']

    def perform_create(self, serializer):
        document = serializer.save(uploaded_by=self.request.user)

        from dashboard.models import Notification
        Notification.objects.create(
            notif_type='document_uploaded',
            title=f'{document.shipment.customer.company_name} — {document.get_doc_type_display()} uploaded',
            message=f'{document.shipment.tracking_number}',
            shipment=document.shipment,
        )
