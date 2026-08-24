from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MasterOperationViewSet, MasterOperationStatsView

router = DefaultRouter()
router.register('operations', MasterOperationViewSet, basename='master-operation')

urlpatterns = [
    path('stats/', MasterOperationStatsView.as_view(), name='master-operation-stats'),
] + router.urls
