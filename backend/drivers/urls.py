from rest_framework.routers import DefaultRouter
from .views import DriverViewSet, VehicleViewSet

router = DefaultRouter()
router.register('vehicles', VehicleViewSet, basename='vehicle')
router.register('', DriverViewSet, basename='driver')

urlpatterns = router.urls
