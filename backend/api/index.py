import os
from django.core.wsgi import get_wsgi_application

# Point to your Django settings module (inside the 'config' folder)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Expose 'app' for Vercel
app = get_wsgi_application()