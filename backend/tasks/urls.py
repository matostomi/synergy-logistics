from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import TaskViewSet, CheckDeadlinesView

router = DefaultRouter()
router.register('', TaskViewSet, basename='task')

urlpatterns = [
    path('check-deadlines/', CheckDeadlinesView.as_view(), name='check-deadlines'),
] + router.urls
