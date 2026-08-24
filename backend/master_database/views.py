from django.db.models import Count, Q
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import CanManageOperations
from .models import MasterOperation
from .serializers import MasterOperationListSerializer, MasterOperationDetailSerializer


class MasterOperationPagination(PageNumberPagination):
    """Smaller page size than the site default — this table can grow into the tens of thousands."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class MasterOperationViewSet(viewsets.ModelViewSet):
    """
    Search and filtering happen here in Django, not in the browser — the
    frontend never downloads the whole table, only the current page of
    matching results. Stays fast even at tens of thousands of records.
    """
    queryset = MasterOperation.objects.all()
    permission_classes = [CanManageOperations]
    pagination_class = MasterOperationPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transport_mode', 'status', 'operation_type', 'customer_name']
    search_fields = [
        'operation_number', 'customer_name', 'declaration_number', 'container_number',
        'bill_number', 'truck_plate_number', 'driver_name', 'awb_number',
        'shipping_line', 'vessel', 'transport_provider', 'inland_transport_mode', 'remark',
        'destination_airport',
    ]
    ordering_fields = ['created_at', 'operation_number', 'customer_name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MasterOperationDetailSerializer
        return MasterOperationListSerializer


class MasterOperationStatsView(APIView):
    """KPI cards for the Master Operations dashboard, scoped to a transport mode (or all)."""
    permission_classes = [CanManageOperations]

    def get(self, request):
        mode = request.query_params.get('mode')
        qs = MasterOperation.objects.all()
        if mode and mode != 'all':
            qs = qs.filter(transport_mode=mode)

        by_status = dict(qs.values_list('status').annotate(count=Count('id')).order_by())
        by_mode = dict(
            MasterOperation.objects.values_list('transport_mode').annotate(count=Count('id')).order_by()
        )

        # One provider breakdown across all transport structures.
        # Examples: DHL, FedEx, airline names, ESL Truck, ESL Train, Our Truck.
        sub_breakdown = list(
            qs.exclude(transport_provider='')
            .values('transport_provider')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        inland_breakdown = list(
            qs.exclude(inland_transport_mode='')
            .values('inland_transport_mode')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        active_operations = (
            by_status.get('pending', 0) + by_status.get('in_progress', 0) + by_status.get('at_customs', 0)
        )
        esl_train = qs.filter(transport_provider__icontains='ESL Train').count()
        esl_truck = qs.filter(transport_provider__icontains='ESL Truck').count()
        # "Currently unloading at the factory": it's arrived, but the operation
        # hasn't been marked completed/cancelled yet. No dedicated
        # unloading-finished field exists, so this is the closest honest proxy.
        factory_unloading = (
            qs.exclude(factory_arrival_date='')
            .exclude(status__in=['completed', 'cancelled'])
            .count()
        )

        return Response({
            'total': qs.count(),
            'pending': by_status.get('pending', 0),
            'in_progress': by_status.get('in_progress', 0),
            'at_customs': by_status.get('at_customs', 0),
            'completed': by_status.get('completed', 0),
            'cancelled': by_status.get('cancelled', 0),
            'active_operations': active_operations,
            'trucks_in_transit': by_status.get('in_progress', 0),
            'esl_train': esl_train,
            'esl_truck': esl_truck,
            'air_shipments': by_mode.get('air', 0),
            'factory_unloading': factory_unloading,
            'mode_counts': {
                'air': by_mode.get('air', 0),
                'multimodal': by_mode.get('multimodal', 0),
                'unimodal': by_mode.get('unimodal', 0),
                'other': by_mode.get('other', 0),
            },
            'sub_breakdown': sub_breakdown,
            'inland_breakdown': inland_breakdown,
        })
