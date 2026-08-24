from rest_framework.routers import DefaultRouter
from .views import ShipmentViewSet, ShipmentDocumentViewSet

router = DefaultRouter()
router.register('documents', ShipmentDocumentViewSet, basename='shipment-document')
router.register('', ShipmentViewSet, basename='shipment')

urlpatterns = router.urls
