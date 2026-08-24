from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'contact_name', 'email', 'factory_location', 'is_active']
    search_fields = ['company_name', 'email']
    list_filter = ['is_active']
