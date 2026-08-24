from django.conf import settings
from django.db import models


class Customer(models.Model):
    """A client company or individual that ships goods through the platform."""

    company_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)
    billing_address = models.TextField(blank=True)
    factory_location = models.CharField(max_length=255, blank=True, help_text='Fabric/factory pickup or delivery location')
    user_account = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='customer_profile'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['company_name']

    def __str__(self):
        return self.company_name
