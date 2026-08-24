from django.conf import settings
from django.db import models


class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        VAN = 'van', 'Van'
        TRUCK = 'truck', 'Truck'
        TRAILER = 'trailer', 'Trailer'
        MOTORCYCLE = 'motorcycle', 'Motorcycle'

    class FuelType(models.TextChoices):
        DIESEL = 'diesel', 'Diesel'
        PETROL = 'petrol', 'Petrol'
        ELECTRIC = 'electric', 'Electric'

    plate_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices)
    capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.plate_number} ({self.get_vehicle_type_display()})'


class Driver(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        ON_ROUTE = 'on_route', 'On Route'
        OFF_DUTY = 'off_duty', 'Off Duty'

    user_account = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='driver_profile'
    )
    full_name = models.CharField(max_length=255)
    license_number = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='drivers')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name
