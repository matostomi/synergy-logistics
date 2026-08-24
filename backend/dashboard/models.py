from django.db import models


class Notification(models.Model):
    class NotifType(models.TextChoices):
        STATUS_CHANGE = 'status_change', 'Status Change'
        DELAY = 'delay', 'Delay'
        CUSTOMS_RELEASE = 'customs_release', 'Customs Release'
        FACTORY_UNLOADING = 'factory_unloading', 'Factory Unloading'
        CONTAINER_RETURNED = 'container_returned', 'Container Returned'
        DOCUMENT_UPLOADED = 'document_uploaded', 'Document Uploaded'
        DEADLINE = 'deadline', 'Deadline'

    notif_type = models.CharField(max_length=30, choices=NotifType.choices)
    title = models.CharField(max_length=255)
    message = models.CharField(max_length=500, blank=True)
    shipment = models.ForeignKey(
        'shipments.Shipment', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Destination(models.Model):
    """Reference list of destinations, managed from Settings. Shipment.destination_address
    stays a free-text field (existing rows aren't affected) — this list just powers
    autocomplete/consistency going forward and the Settings admin screen."""
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomsLocation(models.Model):
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class BorderCrossing(models.Model):
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StatusColor(models.Model):
    """One row per shipment status, so Settings can let an admin recolor the
    status pills/board without touching CSS. Falls back to the CSS defaults
    for any status that doesn't have a row yet."""
    status = models.CharField(max_length=30, unique=True)
    color = models.CharField(max_length=7, help_text='Hex color, e.g. #ff7a30')

    class Meta:
        ordering = ['status']

    def __str__(self):
        return f'{self.status} = {self.color}'
