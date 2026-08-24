import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('shipments', '0005_container_return_deadline'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notif_type', models.CharField(choices=[
                    ('status_change', 'Status Change'),
                    ('delay', 'Delay'),
                    ('customs_release', 'Customs Release'),
                    ('factory_unloading', 'Factory Unloading'),
                    ('container_returned', 'Container Returned'),
                    ('document_uploaded', 'Document Uploaded'),
                    ('deadline', 'Deadline'),
                ], max_length=30)),
                ('title', models.CharField(max_length=255)),
                ('message', models.CharField(blank=True, max_length=500)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('shipment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='shipments.shipment')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
