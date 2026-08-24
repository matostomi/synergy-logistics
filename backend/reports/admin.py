from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'report_type', 'date_from', 'date_to', 'generated_by']
    list_filter = ['report_type']
