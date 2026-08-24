from django.contrib import admin
from .models import Driver, Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['plate_number', 'vehicle_type', 'capacity_kg', 'is_active']
    list_filter = ['vehicle_type', 'is_active']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'license_number', 'status', 'vehicle']
    list_filter = ['status']
    search_fields = ['full_name', 'license_number']
