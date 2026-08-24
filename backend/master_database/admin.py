from django.contrib import admin
from .models import MasterOperation


@admin.register(MasterOperation)
class MasterOperationAdmin(admin.ModelAdmin):
    list_display = ['operation_number', 'customer_name', 'transport_mode', 'transport_provider', 'inland_transport_mode', 'status', 'container_number', 'truck_plate_number']
    list_filter = ['transport_mode', 'transport_provider', 'inland_transport_mode', 'status', 'operation_type']
    search_fields = ['operation_number', 'customer_name', 'container_number', 'declaration_number']
