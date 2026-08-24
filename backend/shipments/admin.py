from django.contrib import admin
from .models import Shipment, ShipmentEvent, ShipmentDocument


class ShipmentEventInline(admin.TabularInline):
    model = ShipmentEvent
    extra = 0
    readonly_fields = ['timestamp']


class ShipmentDocumentInline(admin.TabularInline):
    model = ShipmentDocument
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ['tracking_number', 'customer', 'driver', 'status', 'priority', 'container_return_deadline', 'created_at']
    list_filter = ['status', 'priority']
    search_fields = ['tracking_number']
    inlines = [ShipmentEventInline, ShipmentDocumentInline]


@admin.register(ShipmentDocument)
class ShipmentDocumentAdmin(admin.ModelAdmin):
    list_display = ['shipment', 'doc_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['doc_type']
