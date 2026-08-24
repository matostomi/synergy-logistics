from django.urls import path
from .views import GoogleSheetSyncView

urlpatterns = [
    path('google-sheet/sync/', GoogleSheetSyncView.as_view(), name='google-sheet-sync'),
]
