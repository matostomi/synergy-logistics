from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import CanManageOperations
from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [CanManageOperations]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['company_name', 'contact_name', 'email']
    ordering_fields = ['company_name', 'created_at']

    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        """
        Merge another customer INTO this one: reassigns all of the other
        customer's shipments here, fills in any blank fields on this
        customer from the other one, then deletes the other customer.

        This is a manual, human-triggered action on purpose — two similarly
        named customers (e.g. "WANG" vs "WANGHAIFENG") could genuinely be
        different people, so this never happens automatically during sync.
        """
        from shipments.models import Shipment

        keep = self.get_object()
        merge_id = request.data.get('merge_id')
        if not merge_id:
            return Response({'detail': 'merge_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if str(merge_id) == str(keep.id):
            return Response({'detail': 'Cannot merge a customer into itself.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other = Customer.objects.get(pk=merge_id)
        except Customer.DoesNotExist:
            return Response({'detail': 'The customer to merge was not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            reassigned = Shipment.objects.filter(customer=other).update(customer=keep)

            for field in ['contact_name', 'phone_number', 'billing_address', 'factory_location']:
                if not getattr(keep, field) and getattr(other, field):
                    setattr(keep, field, getattr(other, field))
            if not keep.email and other.email:
                keep.email = other.email
            keep.save()

            other.delete()

        return Response({
            'customer': CustomerSerializer(keep).data,
            'shipments_reassigned': reassigned,
        })
