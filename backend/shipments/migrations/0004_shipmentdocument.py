import django.db.models.deletion
import shipments.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shipments', '0003_expand_status_choices'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ShipmentDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doc_type', models.CharField(choices=[
                    ('commercial_invoice', 'Commercial Invoice'),
                    ('packing_list', 'Packing List'),
                    ('bill_of_lading', 'Bill of Lading'),
                    ('pod', 'Proof of Delivery (POD)'),
                    ('customs_declaration', 'Customs Declaration'),
                    ('exit_pass', 'Exit Pass'),
                    ('photo', 'Photo'),
                    ('other', 'Other'),
                ], default='other', max_length=30)),
                ('file', models.FileField(upload_to=shipments.models.shipment_document_path)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('shipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='shipments.shipment')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_documents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
