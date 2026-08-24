from rest_framework import serializers
from .models import Destination, CustomsLocation, BorderCrossing, StatusColor


class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'name']


class CustomsLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomsLocation
        fields = ['id', 'name']


class BorderCrossingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BorderCrossing
        fields = ['id', 'name']


class StatusColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusColor
        fields = ['id', 'status', 'color']
