from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User
from .permissions import IsAdmin
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login is meant to work with no prior auth state at all. But DRF's default
    JWTAuthentication class runs on every view *before* permission checks,
    including AllowAny ones — so if a stale/expired token from an earlier
    session happens to still be in the browser (a different tab, a token that
    expired since last use, etc.), it gets attached to this request and
    rejected with a 401 before the username/password are ever checked. That
    looked exactly like "correct credentials don't work". Explicitly disabling
    authentication here means this endpoint only ever looks at the submitted
    username/password, never at any Authorization header.
    """
    serializer_class = CustomTokenObtainPairSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class TokenRefreshOpenView(TokenRefreshView):
    """Same reasoning as above — refreshing a token shouldn't require passing
    authentication with (possibly) the very token being refreshed."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [IsAdmin]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Admin-only: view or update any user, e.g. to assign a new role."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
