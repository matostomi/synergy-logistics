from rest_framework import serializers
from .models import Driver, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'


class DriverSerializer(serializers.ModelSerializer):
    vehicle_detail = VehicleSerializer(source='vehicle', read_only=True)

    class Meta:
        model = Driver
        fields = [
            'id', 'user_account', 'full_name', 'license_number', 'phone_number',
            'vehicle', 'vehicle_detail', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
