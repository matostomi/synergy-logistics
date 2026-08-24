from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Shipment, ShipmentEvent

STATUS_MESSAGES = {
    Shipment.Status.IN_TRANSIT: 'is now in transit',
    Shipment.Status.AT_CUSTOMS: 'has reached customs',
    Shipment.Status.WAITING_CARGO_RELEASE: 'is waiting on cargo release',
    Shipment.Status.FACTORY_UNLOADING: 'is being unloaded at the factory',
    Shipment.Status.EMPTY_CONTAINER_RETURNED: 'had its empty container returned',
    Shipment.Status.DELIVERED: 'was completed',
    Shipment.Status.TECHNICAL_ISSUES: 'reported a technical issue / delay',
    Shipment.Status.CANCELLED: 'was cancelled',
    Shipment.Status.PENDING: 'is pending',
}


STATUS_TO_NOTIF_TYPE = {
    'waiting_cargo_release': 'customs_release',
    'factory_unloading': 'factory_unloading',
    'empty_container_returned': 'container_returned',
}


def _notify_customer_by_email(shipment):
    customer_email = getattr(shipment.customer, 'email', None)
    if not customer_email:
        return
    subject = f'Shipment Update — {shipment.tracking_number}'
    body = (
        f'Dear {shipment.customer.company_name},\n\n'
        f'Your shipment {shipment.tracking_number} (container {shipment.container_number or "N/A"}) '
        f'{STATUS_MESSAGES.get(shipment.status, "was updated")}.\n\n'
        f'Destination: {shipment.destination_address or "N/A"}\n'
        f'Current status: {shipment.get_status_display()}\n\n'
        f'— Synergy Plus Logistics Service'
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer_email], fail_silently=True)
    except Exception:
        # Never let a broken/unconfigured email setup block a shipment save.
        pass


@receiver(pre_save, sender=Shipment)
def _capture_previous_status(sender, instance, **kwargs):
    """Stash the prior status on the instance so post_save can compare."""
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        instance._previous_status = Shipment.objects.only('status').get(pk=instance.pk).status
    except Shipment.DoesNotExist:
        instance._previous_status = None


@receiver(post_save, sender=Shipment)
def _log_status_change(sender, instance, created, **kwargs):
    """Create a ShipmentEvent (which powers notifications) whenever status changes."""
    previous = getattr(instance, '_previous_status', None)

    if created:
        # brand-new shipment: log its starting status once
        note = getattr(instance, '_status_note', '') or 'Shipment created'
        location = getattr(instance, '_status_location', '') or instance.destination_address or instance.border_crossing or ''
        ShipmentEvent.objects.create(
            shipment=instance,
            status=instance.status,
            location=location,
            note=note,
        )
        return

    if previous is not None and previous != instance.status:
        note = getattr(instance, '_status_note', '') or STATUS_MESSAGES.get(instance.status, 'status updated')
        location = getattr(instance, '_status_location', '') or instance.destination_address or instance.border_crossing or ''
        ShipmentEvent.objects.create(
            shipment=instance,
            status=instance.status,
            location=location,
            note=note,
        )
        _notify_customer_by_email(instance)

        from dashboard.models import Notification
        already_pending = Notification.objects.filter(
            shipment=instance, message=note, is_read=False
        ).exists()
        if not already_pending:
            Notification.objects.create(
                notif_type=STATUS_TO_NOTIF_TYPE.get(instance.status, 'status_change'),
                title=f'{instance.customer.company_name} — {instance.get_status_display()}',
                message=note,
                shipment=instance,
            )
