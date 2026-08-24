from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Full access only for admins (or Django superusers, as a safety net)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', None) == 'admin')
        )


class CanManageOperations(permissions.BasePermission):
    """
    Admins and Operations Officers can create/edit/delete shipments, drivers,
    and customers. Everyone else (Manager, Driver, Customer) gets read-only
    access to these endpoints.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user.is_superuser or getattr(user, 'role', None) in ('admin', 'operations_officer'))


class CanViewReports(permissions.BasePermission):
    """Reports and revenue data: Admins and Managers only."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated
            and (user.is_superuser or getattr(user, 'role', None) in ('admin', 'manager'))
        )
