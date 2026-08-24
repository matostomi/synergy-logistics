from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from .models import Destination, CustomsLocation, BorderCrossing, StatusColor
from .reference_serializers import (
    DestinationSerializer, CustomsLocationSerializer, BorderCrossingSerializer, StatusColorSerializer,
)

# Sensible defaults for every known shipment status, so the Status Colors screen
# always shows a complete, distinct-looking set even before an admin customizes
# anything — several of these previously had no dedicated CSS color at all.
DEFAULT_STATUS_COLORS = {
    'pending': '#e0b13c',
    'in_transit': '#ff7a30',
    'at_customs': '#4a9fe0',
    'technical_issues': '#d8564a',
    'waiting_cargo_release': '#b47fd6',
    'factory_unloading': '#5fb6c9',
    'empty_container_returned': '#6f8fd6',
    'delivered': '#4fb286',
    'cancelled': '#8a94a0',
}


class ReadWriteAdminViewSet(viewsets.ModelViewSet):
    """Base for the simple name-only reference lists — admin-only, everyone else
    read-only isn't needed since these are only surfaced on the admin Settings page."""
    permission_classes = [IsAdmin]


class DestinationViewSet(ReadWriteAdminViewSet):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer


class CustomsLocationViewSet(ReadWriteAdminViewSet):
    queryset = CustomsLocation.objects.all()
    serializer_class = CustomsLocationSerializer


class BorderCrossingViewSet(ReadWriteAdminViewSet):
    queryset = BorderCrossing.objects.all()
    serializer_class = BorderCrossingSerializer


class StatusColorView(APIView):
    """
    GET returns every known status with its color (DB override if set, otherwise
    the built-in default) — always the full set of 9, never a partial list.
    Any logged-in user can read this (needed to render status pills correctly
    everywhere); only admins can change it.
    PATCH accepts {"colors": {"<status>": "#rrggbb", ...}} for any subset and
    upserts just those rows.
    """

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        overrides = {row.status: row.color for row in StatusColor.objects.all()}
        merged = {**DEFAULT_STATUS_COLORS, **overrides}
        return Response({'colors': merged, 'defaults': DEFAULT_STATUS_COLORS})

    def patch(self, request):
        colors = request.data.get('colors', {})
        if not isinstance(colors, dict):
            return Response({'detail': '"colors" must be an object of status -> hex color.'}, status=400)
        for status_key, color in colors.items():
            if status_key not in DEFAULT_STATUS_COLORS:
                continue
            StatusColor.objects.update_or_create(status=status_key, defaults={'color': color})
        overrides = {row.status: row.color for row in StatusColor.objects.all()}
        merged = {**DEFAULT_STATUS_COLORS, **overrides}
        return Response({'colors': merged, 'defaults': DEFAULT_STATUS_COLORS})
