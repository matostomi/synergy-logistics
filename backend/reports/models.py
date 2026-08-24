from django.conf import settings
from django.db import models


class Report(models.Model):
    """A saved/generated report, e.g. monthly delivery performance."""

    class ReportType(models.TextChoices):
        SHIPMENTS_SUMMARY = 'shipments_summary', 'Shipments Summary'
        DRIVER_PERFORMANCE = 'driver_performance', 'Driver Performance'
        CUSTOMER_ACTIVITY = 'customer_activity', 'Customer Activity'
        REVENUE = 'revenue', 'Revenue'

    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=30, choices=ReportType.choices)
    date_from = models.DateField()
    date_to = models.DateField()
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reports'
    )
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.get_report_type_display()})'
