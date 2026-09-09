import re
from collections import defaultdict, OrderedDict
from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import CanManageOperations
from customers.models import Customer
from drivers.models import Driver
from shipments.models import (
    AWAITING_REGISTRATION_MARKER,
    Shipment,
    ShipmentEvent,
)

STATUS_LABELS = dict(Shipment.Status.choices)


class PublicStatsView(APIView):
    """
    Public, no-login stats for the login screen — safe aggregate counts only
    (no financial data, no customer/shipment details).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'total_shipments': Shipment.objects.count(),
            'completed': Shipment.objects.filter(status=Shipment.Status.DELIVERED).count(),
            'in_transit': Shipment.objects.filter(status=Shipment.Status.IN_TRANSIT).count(),
            'total_customers': Customer.objects.filter(is_active=True).count(),
        })


class DashboardSummaryView(APIView):
    """Aggregate KPIs for the dashboard landing page."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_30_days = now - timedelta(days=30)

        # Completed filter: finished or returned containers
        completed_filter = Q(status=Shipment.Status.DELIVERED) | Q(
            status=Shipment.Status.EMPTY_CONTAINER_RETURNED
        )

        # Active unique operations (excludes completed to match live Google Sheet count ~231)
        active_shipments_qs = Shipment.objects.exclude(completed_filter)
        total_active_operations = (
            active_shipments_qs.exclude(operation_number='')
            .values('operation_number')
            .distinct()
            .count()
            + active_shipments_qs.filter(operation_number='').count()
        )

        by_status = dict(
            Shipment.objects.values_list('status').annotate(count=Count('id')).order_by()
        )

        # Awaiting registration count by unique Bill
        awaiting_qs = Shipment.objects.filter(
            operation_number__contains=AWAITING_REGISTRATION_MARKER,
        ).exclude(status=Shipment.Status.CANCELLED)
        awaiting_registration = (
            awaiting_qs.exclude(bill_number='').values('bill_number').distinct().count()
            + awaiting_qs.filter(bill_number='').count()
        )

        # Trucks in Transit (includes both unimodal and multimodal / on-the-way transit)
        in_transit_filter = (
            Q(status=Shipment.Status.IN_TRANSIT)
            | Q(transport_mode=Shipment.TransportMode.MULTIMODAL)
        )
        trucks_in_transit_count = (
            Shipment.objects.filter(in_transit_filter)
            .values('operation_number')
            .distinct()
            .count()
        )

        shipment_counts = {
            'total': total_active_operations,
            'completed': by_status.get(Shipment.Status.DELIVERED, 0),
            'in_transit': trucks_in_transit_count,
            'at_customs': by_status.get(Shipment.Status.AT_CUSTOMS, 0),
            'technical_issues': by_status.get(Shipment.Status.TECHNICAL_ISSUES, 0),
            'waiting_cargo_release': by_status.get(Shipment.Status.WAITING_CARGO_RELEASE, 0),
            'factory_unloading': by_status.get(Shipment.Status.FACTORY_UNLOADING, 0),
            'empty_container_returned': by_status.get(Shipment.Status.EMPTY_CONTAINER_RETURNED, 0),
            'pending': by_status.get(Shipment.Status.PENDING, 0),
            'cancelled': by_status.get(Shipment.Status.CANCELLED, 0),
            'awaiting_registration': awaiting_registration,
        }

        trends = {
            'created_today': Shipment.objects.filter(created_at__gte=today_start).count(),
            'arriving_today': Shipment.objects.filter(
                estimated_delivery__gte=today_start,
                estimated_delivery__lt=today_start + timedelta(days=1),
            ).count(),
        }

        active_statuses = [
            Shipment.Status.PENDING,
            Shipment.Status.IN_TRANSIT,
            Shipment.Status.AT_CUSTOMS,
            Shipment.Status.TECHNICAL_ISSUES,
            Shipment.Status.WAITING_CARGO_RELEASE,
            Shipment.Status.FACTORY_UNLOADING,
        ]

        operations = {
            'active_operations': total_active_operations,
            'ocean_shipments': Shipment.objects.filter(
                transport_mode=Shipment.TransportMode.MULTIMODAL
            ).count(),
            'air_shipments': Shipment.objects.filter(
                transport_mode=Shipment.TransportMode.AIR
            ).count(),
            'trucks_in_transit': trucks_in_transit_count,
            'esl_train': Shipment.objects.filter(transport_provider__icontains='ESL Train').count(),
            'esl_truck': Shipment.objects.filter(transport_provider__icontains='ESL Truck').count(),
            'factory_deliveries_today': ShipmentEvent.objects.filter(
                status=Shipment.Status.FACTORY_UNLOADING, timestamp__gte=today_start,
            ).values('shipment_id').distinct().count(),
        }

        revenue_30d = Shipment.objects.filter(created_at__gte=last_30_days).aggregate(
            total=Sum('cost')
        )['total'] or 0

        operations_counts = self._get_master_operations_summary(now)

        data = {
            'shipments': shipment_counts,
            'trends': trends,
            'operations': operations,
            'master_operations': operations_counts,
            'revenue_last_30_days': revenue_30d,
            'active_drivers': Driver.objects.filter(status=Driver.Status.AVAILABLE).count(),
            'total_drivers': Driver.objects.count(),
            'total_customers': Customer.objects.filter(is_active=True).count(),
            'generated_at': now,
        }
        return Response(data)

    def _get_master_operations_summary(self, now):
        try:
            from master_database.models import MasterOperation
        except ImportError:
            return {
                'active_operations': 0,
                'air_shipments': 0,
                'trucks_in_transit': 0,
                'factory_deliveries_today': 0,
            }

        active_statuses = [
            MasterOperation.Status.PENDING,
            MasterOperation.Status.IN_PROGRESS,
            MasterOperation.Status.AT_CUSTOMS,
        ]
        active_operations = MasterOperation.objects.filter(status__in=active_statuses).count()
        air_shipments = MasterOperation.objects.filter(
            transport_mode=MasterOperation.TransportMode.AIR
        ).count()
        trucks_in_transit = MasterOperation.objects.filter(
            status=MasterOperation.Status.IN_PROGRESS,
        ).count()

        today_variants = set(filter(None, [
            now.strftime('%Y-%m-%d'),
            now.strftime('%d/%m/%Y'),
            now.strftime('%d-%m-%Y'),
        ]))
        factory_deliveries_today = 0
        for variant in today_variants:
            factory_deliveries_today += MasterOperation.objects.filter(
                factory_arrival_date__icontains=variant
            ).count()

        return {
            'active_operations': active_operations,
            'air_shipments': air_shipments,
            'trucks_in_transit': trucks_in_transit,
            'factory_deliveries_today': factory_deliveries_today,
        }


class GroupedShipmentsView(APIView):
    """
    Returns shipments grouped as:
    Customer -> Bill/Operation -> List of individual Containers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        status_param = request.query_params.get('status')
        queryset = Shipment.objects.select_related('customer', 'driver').all()

        if status_param == 'in_transit':
            queryset = queryset.filter(
                Q(status=Shipment.Status.IN_TRANSIT)
                | Q(transport_mode=Shipment.TransportMode.MULTIMODAL)
            )
        elif status_param == 'delivered':
            queryset = queryset.filter(
                Q(status=Shipment.Status.DELIVERED)
                | Q(status=Shipment.Status.EMPTY_CONTAINER_RETURNED)
            )
        elif status_param:
            queryset = queryset.filter(status=status_param)

        grouped_data = defaultdict(lambda: defaultdict(list))

        for item in queryset:
            customer_name = (
                item.customer.company_name if item.customer else "Unassigned Customer"
            )
            bill_or_op = (
                item.bill_number
                or item.operation_number
                or "No Bill / Operation Reference"
            )

            grouped_data[customer_name][bill_or_op].append({
                "id": item.id,
                "tracking_number": item.tracking_number,
                "container_number": item.container_number or "Pending Assignment",
                "status": item.get_status_display() if hasattr(item, 'get_status_display') else item.status,
                "declaration_number": item.declaration_number or "—",
                "plate_number": item.truck_plate_number_raw or (item.driver.full_name if item.driver else "Unassigned"),
            })

        response_list = []
        for customer, bills in grouped_data.items():
            bill_list = []
            total_customer_containers = 0
            for bill_ref, containers in bills.items():
                total_customer_containers += len(containers)
                bill_list.append({
                    "bill_ref": bill_ref,
                    "container_count": len(containers),
                    "containers": containers,
                })
            response_list.append({
                "customer": customer,
                "total_containers": total_customer_containers,
                "bills": bill_list,
            })

        return Response(response_list)


def _container_size(raw):
    """Classify a free-text container_count value like '1X40', '2x20FT', 'B/B' into a size bucket."""
    if not raw:
        return 'Unspecified'
    text = raw.upper()
    if '40' in text:
        return '40FT'
    if '20' in text:
        return '20FT'
    return 'Break Bulk / Other'


class AnalyticsView(APIView):
    """
    Phase 4 dashboard analytics: monthly shipment trend, status breakdown,
    customer/destination leaderboards, container type mix, and KPI summary.
    Query param: months (default 12) controls the monthly trend window.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        months_back = int(request.query_params.get('months', 12))
        window_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
        for _ in range(months_back - 1):
            window_start = (window_start - timedelta(days=1)).replace(day=1)

        monthly_qs = (
            Shipment.objects.filter(created_at__gte=window_start)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        monthly_by_key = {row['month'].strftime('%Y-%m'): row['count'] for row in monthly_qs}
        monthly_shipments = []
        cursor = window_start
        for _ in range(months_back):
            key = cursor.strftime('%Y-%m')
            monthly_shipments.append({
                'month': key,
                'label': cursor.strftime('%b %Y'),
                'count': monthly_by_key.get(key, 0),
            })
            if cursor.month == 12:
                cursor = cursor.replace(year=cursor.year + 1, month=1)
            else:
                cursor = cursor.replace(month=cursor.month + 1)

        status_counts = dict(
            Shipment.objects.values_list('status').annotate(count=Count('id')).order_by()
        )
        status_breakdown = [
            {'status': choice_value, 'label': label, 'count': status_counts.get(choice_value, 0)}
            for choice_value, label in Shipment.Status.choices
        ]

        top_customers = (
            Shipment.objects.values('customer__id', 'customer__company_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        customer_stats = [
            {'customer_id': row['customer__id'], 'name': row['customer__company_name'], 'count': row['count']}
            for row in top_customers
        ]

        top_destinations = (
            Shipment.objects.exclude(destination_address='')
            .values('destination_address')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        destination_stats = [
            {'destination': row['destination_address'], 'count': row['count']}
            for row in top_destinations
        ]

        size_counts = OrderedDict([('20FT', 0), ('40FT', 0), ('Break Bulk / Other', 0), ('Unspecified', 0)])
        for raw, count in Shipment.objects.values_list('container_count').annotate(count=Count('id')):
            size_counts[_container_size(raw)] += count
        container_type_stats = [{'type': k, 'count': v} for k, v in size_counts.items()]

        completed_qs = Shipment.objects.filter(status=Shipment.Status.DELIVERED)
        total = Shipment.objects.count()
        completed_count = completed_qs.count()
        measurable_qs = completed_qs.filter(delivered_at__isnull=False, estimated_delivery__isnull=False)
        measurable_count = measurable_qs.count()
        on_time = measurable_qs.filter(delivered_at__lte=F('estimated_delivery')).count()
        on_time_rate = round((on_time / measurable_count) * 100, 1) if measurable_count else None

        active_statuses = [
            Shipment.Status.IN_TRANSIT,
            Shipment.Status.AT_CUSTOMS,
            Shipment.Status.WAITING_CARGO_RELEASE,
            Shipment.Status.FACTORY_UNLOADING,
        ]
        active_shipments = Shipment.objects.filter(status__in=active_statuses).count()
        total_revenue = Shipment.objects.aggregate(total=Sum('cost'))['total'] or 0

        kpis = {
            'total_shipments': total,
            'completed_shipments': completed_count,
            'active_shipments': active_shipments,
            'on_time_delivery_rate': on_time_rate,
            'total_revenue': total_revenue,
            'total_customers': Customer.objects.filter(is_active=True).count(),
            'total_drivers': Driver.objects.count(),
        }

        return Response({
            'monthly_shipments': monthly_shipments,
            'status_breakdown': status_breakdown,
            'customer_stats': customer_stats,
            'destination_stats': destination_stats,
            'container_type_stats': container_type_stats,
            'kpis': kpis,
            'generated_at': now,
        })


class DailyReportView(APIView):
    """A generated daily operations report, computed live from current data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total = Shipment.objects.count()
        by_status = dict(
            Shipment.objects.values_list('status').annotate(count=Count('id')).order_by()
        )

        delayed = Shipment.objects.filter(
            estimated_delivery__lt=now
        ).exclude(status__in=[Shipment.Status.DELIVERED, Shipment.Status.CANCELLED]).count()

        data = {
            'generated_at': now,
            'report_date': now.date(),
            'total_shipments': total,
            'completed': by_status.get(Shipment.Status.DELIVERED, 0),
            'in_transit': by_status.get(Shipment.Status.IN_TRANSIT, 0),
            'at_customs': by_status.get(Shipment.Status.AT_CUSTOMS, 0),
            'waiting_cargo_release': by_status.get(Shipment.Status.WAITING_CARGO_RELEASE, 0),
            'factory_unloading': by_status.get(Shipment.Status.FACTORY_UNLOADING, 0),
            'empty_container_returned': by_status.get(Shipment.Status.EMPTY_CONTAINER_RETURNED, 0),
            'pending': by_status.get(Shipment.Status.PENDING, 0),
            'delayed': delayed,
            'technical_issues': by_status.get(Shipment.Status.TECHNICAL_ISSUES, 0),
            'cancelled': by_status.get(Shipment.Status.CANCELLED, 0),
            'created_today': Shipment.objects.filter(created_at__gte=today_start).count(),
        }
        return Response(data)


class RecentActivityView(APIView):
    """The latest shipment tracking events, newest first, for the activity feed."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 15))
        events = (
            ShipmentEvent.objects
            .select_related('shipment', 'shipment__customer')
            .order_by('-timestamp')[:limit]
        )
        data = [
            {
                'id': e.id,
                'shipment_id': e.shipment_id,
                'tracking_number': e.shipment.tracking_number,
                'customer_name': e.shipment.customer.company_name,
                'status': e.status,
                'location': e.location,
                'note': e.note,
                'timestamp': e.timestamp,
            }
            for e in events
        ]
        return Response(data)


class CalendarView(APIView):
    """
    Scheduled deliveries and status events logged within a date range.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils.dateparse import parse_datetime

        start_raw = request.query_params.get('start')
        end_raw = request.query_params.get('end')
        start = parse_datetime(start_raw) if start_raw else None
        end = parse_datetime(end_raw) if end_raw else None
        if not start or not end:
            return Response({'detail': 'Valid ISO start/end dates are required.'}, status=400)

        deliveries_qs = Shipment.objects.filter(
            estimated_delivery__gte=start, estimated_delivery__lte=end,
        ).select_related('customer')
        deliveries = [
            {
                'id': s.id,
                'date': s.estimated_delivery,
                'tracking_number': s.tracking_number,
                'customer_name': s.customer.company_name,
                'status': s.status,
            }
            for s in deliveries_qs
        ]

        events_qs = ShipmentEvent.objects.filter(
            timestamp__gte=start, timestamp__lte=end,
        ).select_related('shipment', 'shipment__customer')
        events = [
            {
                'id': e.id,
                'date': e.timestamp,
                'shipment_id': e.shipment_id,
                'tracking_number': e.shipment.tracking_number,
                'customer_name': e.shipment.customer.company_name,
                'status': e.status,
                'note': e.note,
            }
            for e in events_qs
        ]

        return Response({'deliveries': deliveries, 'events': events})
