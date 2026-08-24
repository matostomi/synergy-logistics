from django.db.models import Count, Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import CanViewReports
from .models import Report
from .serializers import ReportSerializer
from shipments.models import Shipment
from drivers.models import Driver


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [CanViewReports]

    def perform_create(self, serializer):
        report = serializer.save(generated_by=self.request.user)
        report.data = self._build_report_data(report)
        report.save(update_fields=['data'])

    def _build_report_data(self, report):
        qs = Shipment.objects.filter(created_at__date__range=[report.date_from, report.date_to])

        if report.report_type == Report.ReportType.SHIPMENTS_SUMMARY:
            return {
                'total_shipments': qs.count(),
                'by_status': list(qs.values('status').annotate(count=Count('id'))),
            }
        if report.report_type == Report.ReportType.DRIVER_PERFORMANCE:
            return {
                'drivers': list(
                    Driver.objects.annotate(
                        completed=Count('shipments', filter=None)
                    ).values('full_name', 'completed')
                )
            }
        if report.report_type == Report.ReportType.REVENUE:
            return {'total_revenue': str(qs.aggregate(total=Sum('cost'))['total'] or 0)}
        return {}
