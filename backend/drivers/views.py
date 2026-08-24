from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import CanManageOperations
from .models import Driver, Vehicle
from .serializers import DriverSerializer, VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [CanManageOperations]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vehicle_type', 'is_active']
    search_fields = ['plate_number']


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [CanManageOperations]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['full_name', 'license_number']
    ordering_fields = ['full_name', 'created_at']
