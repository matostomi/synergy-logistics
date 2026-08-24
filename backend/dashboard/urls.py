from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardSummaryView, RecentActivityView, DailyReportView, CalendarView,
    PublicStatsView, AnalyticsView,
)
from .backup_views import BackupDownloadView, BackupRestoreView
from .notification_views import NotificationViewSet
from .reference_views import (
    DestinationViewSet, CustomsLocationViewSet, BorderCrossingViewSet, StatusColorView,
)

router = DefaultRouter()
router.register('notifications', NotificationViewSet, basename='notification')
router.register('destinations', DestinationViewSet, basename='destination')
router.register('customs-locations', CustomsLocationViewSet, basename='customs-location')
router.register('border-crossings', BorderCrossingViewSet, basename='border-crossing')

urlpatterns = [
    path('public-stats/', PublicStatsView.as_view(), name='public-stats'),
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('analytics/', AnalyticsView.as_view(), name='dashboard-analytics'),
    path('recent-activity/', RecentActivityView.as_view(), name='dashboard-recent-activity'),
    path('daily-report/', DailyReportView.as_view(), name='dashboard-daily-report'),
    path('calendar/', CalendarView.as_view(), name='dashboard-calendar'),
    path('backup/download/', BackupDownloadView.as_view(), name='backup-download'),
    path('backup/restore/', BackupRestoreView.as_view(), name='backup-restore'),
    path('status-colors/', StatusColorView.as_view(), name='status-colors'),
] + router.urls
