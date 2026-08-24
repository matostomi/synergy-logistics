from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'due_date', 'priority', 'status', 'shipment', 'auto_generated']
    list_filter = ['priority', 'status', 'auto_generated']
    search_fields = ['title']
