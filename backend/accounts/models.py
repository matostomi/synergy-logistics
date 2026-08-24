from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model so we can attach roles used across the app."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        OPERATIONS_OFFICER = 'operations_officer', 'Operations Officer'
        MANAGER = 'manager', 'Manager'
        DRIVER = 'driver', 'Driver'
        CUSTOMER = 'customer', 'Customer'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OPERATIONS_OFFICER)
    phone_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'
