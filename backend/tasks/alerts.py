"""
Deadline alert engine.

Not real-time — this needs to be triggered (a button click, or a scheduled
Windows Task Scheduler job) to actually check for approaching deadlines.
See the setup guide for automating it.

For every shipment with a container_return_deadline within ALERT_WINDOW_DAYS
that hasn't been returned yet, creates one high-priority Task (if one doesn't
already exist for that shipment) and one ShipmentEvent notification.
"""
from datetime import timedelta
from django.utils import timezone

ALERT_WINDOW_DAYS = 2


def check_deadlines():
    from shipments.models import Shipment, ShipmentEvent
    from .models import Task

    today = timezone.localdate()
    window_end = today + timedelta(days=ALERT_WINDOW_DAYS)

    approaching = Shipment.objects.filter(
        container_return_deadline__isnull=False,
        container_return_deadline__gte=today,
        container_return_deadline__lte=window_end,
    ).exclude(status=Shipment.Status.EMPTY_CONTAINER_RETURNED).exclude(status=Shipment.Status.CANCELLED)

    created_count = 0

    for shipment in approaching:
        alert_key = f'deadline-{shipment.id}-{shipment.container_return_deadline}'

        already_alerted = Task.objects.filter(auto_generated_key=alert_key).exists()
        if already_alerted:
            continue

        days_left = (shipment.container_return_deadline - today).days
        Task.objects.create(
            title=f'Return empty container — {shipment.container_number or shipment.tracking_number}',
            description=(
                f'{shipment.customer.company_name} — container return deadline is '
                f'{"today" if days_left == 0 else f"in {days_left} day(s)"} '
                f'({shipment.container_return_deadline}).'
            ),
            due_date=shipment.container_return_deadline,
            priority=Task.Priority.URGENT if days_left <= 0 else Task.Priority.HIGH,
            shipment=shipment,
            auto_generated=True,
            auto_generated_key=alert_key,
        )

        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            location=shipment.destination_address or '',
            note=f'⚠ Container return deadline approaching ({shipment.container_return_deadline})',
        )
        created_count += 1

    return created_count
