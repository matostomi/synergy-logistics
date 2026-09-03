#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Create or reset admin user credentials
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); u, _ = User.objects.get_or_create(username='admin'); u.set_password('tomi1234'); u.is_staff = True; u.is_superuser = True; u.save()"