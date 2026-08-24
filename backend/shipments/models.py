import uuid
from django.db import models
from customers.models import Customer
from drivers.models import Driver


# An operation number is only issued once the shipment is registered. Until then
# the sheet carries a placeholder with dashes standing in for the digits, e.g.
# 'SPLS00--/2026'. Match on the dashes rather than the literal text so the rule
# survives the year rolling over — 'SPLS00--/2027' must keep working in January.
AWAITING_REGISTRATION_MARKER = '--'


class Shipment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_TRANSIT = 'in_transit', 'In Transit'
        AT_CUSTOMS = 'at_customs', 'At Customs'
        TECHNICAL_ISSUES = 'technical_issues', 'Technical Issues'
        WAITING_CARGO_RELEASE = 'waiting_cargo_release', 'Waiting Cargo Release'
        FACTORY_UNLOADING = 'factory_unloading', 'Factory Unloading'
        EMPTY_CONTAINER_RETURNED = 'empty_container_returned', 'Empty Container Returned'
        DELIVERED = 'delivered', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    class Priority(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        EXPRESS = 'express', 'Express'
        URGENT = 'urgent', 'Urgent'

    class TransportMode(models.TextChoices):
        AIR = 'air', 'Air'
        MULTIMODAL = 'multimodal', 'Multimodal (Ocean + Djibouti Dry Port + inland leg)'
        UNIMODAL = 'unimodal', 'Unimodal (Road only, Djibouti \u2192 Ethiopia)'
        OTHER = 'other', 'Other'

    tracking_number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='shipments')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')

    origin_address = models.TextField(blank=True)
    destination_address = models.TextField(blank=True)

    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.CharField(max_length=500, blank=True)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.STANDARD)

    # Left blank by design (no default) — existing shipments genuinely don't
    # have this classified yet. Blank shows as "Unspecified" in the UI rather
    # than silently guessing a mode/carrier that might be wrong.
    transport_mode = models.CharField(max_length=12, choices=TransportMode.choices, blank=True, db_index=True)
    transport_provider = models.CharField(max_length=100, blank=True, db_index=True)

    estimated_delivery = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # --- Freight operations detail, imported directly from the Excel tracker ---
    operation_number = models.CharField(max_length=50, blank=True)
    bill_number = models.CharField(max_length=100, blank=True)
    container_count = models.CharField(max_length=20, blank=True, help_text='e.g. 1X40')
    container_number = models.CharField(max_length=50, blank=True)
    liner = models.CharField(max_length=50, blank=True)
    border_crossing = models.CharField(max_length=100, blank=True)
    customs_office = models.CharField(max_length=100, blank=True)
    declaration_number = models.CharField(max_length=50, blank=True)
    items = models.CharField(max_length=255, blank=True)
    remark = models.CharField(max_length=500, blank=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Dates kept as raw text: the source sheet mixes several date formats
    # (dd/mm/yyyy, "24 -3 -2026", Excel serials already converted, etc.)
    # and coercing them all correctly isn't reliable, so we preserve them as-is.
    document_received_date = models.CharField(max_length=50, blank=True)
    vessel_arrival_date = models.CharField(max_length=50, blank=True)
    truck_plate_number_raw = models.CharField(max_length=50, blank=True)
    loading_date = models.CharField(max_length=50, blank=True)
    customs_arrival = models.CharField(max_length=50, blank=True)
    customs_released = models.CharField(max_length=50, blank=True)
    factory_arrival = models.CharField(max_length=50, blank=True)
    factory_unloading = models.CharField(max_length=50, blank=True)
    empty_container_return_date = models.CharField(max_length=50, blank=True)
    container_return_deadline = models.DateField(
        null=True, blank=True,
        help_text='Free-time / demurrage deadline for returning the empty container. Set manually.'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            self.tracking_number = f'SLX-{uuid.uuid4().hex[:10].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.tracking_number


class ShipmentEvent(models.Model):
    """Audit trail of status changes / tracking checkpoints for a shipment."""

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='events')
    status = models.CharField(max_length=30, choices=Shipment.Status.choices)
    location = models.CharField(max_length=255, blank=True)
    note = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.shipment.tracking_number} -> {self.status}'


def shipment_document_path(instance, filename):
    return f'shipment_documents/{instance.shipment.tracking_number}/{filename}'


class ShipmentDocument(models.Model):
    """A file attached to a shipment: invoice, packing list, POD, etc."""

    class DocType(models.TextChoices):
        COMMERCIAL_INVOICE = 'commercial_invoice', 'Commercial Invoice'
        PACKING_LIST = 'packing_list', 'Packing List'
        BILL_OF_LADING = 'bill_of_lading', 'Bill of Lading'
        POD = 'pod', 'Proof of Delivery (POD)'
        CUSTOMS_DECLARATION = 'customs_declaration', 'Customs Declaration'
        EXIT_PASS = 'exit_pass', 'Exit Pass'
        PHOTO = 'photo', 'Photo'
        OTHER = 'other', 'Other'

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DocType.choices, default=DocType.OTHER)
    file = models.FileField(upload_to=shipment_document_path)
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.shipment.tracking_number} — {self.get_doc_type_display()}'
