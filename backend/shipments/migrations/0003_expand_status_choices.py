from django.db import migrations, models


NEW_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in_transit', 'In Transit'),
    ('at_customs', 'At Customs'),
    ('technical_issues', 'Technical Issues'),
    ('waiting_cargo_release', 'Waiting Cargo Release'),
    ('factory_unloading', 'Factory Unloading'),
    ('empty_container_returned', 'Empty Container Returned'),
    ('delivered', 'Completed'),
    ('cancelled', 'Cancelled'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('shipments', '0002_freight_detail_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shipment',
            name='status',
            field=models.CharField(choices=NEW_STATUS_CHOICES, default='pending', max_length=30),
        ),
        migrations.AlterField(
            model_name='shipmentevent',
            name='status',
            field=models.CharField(choices=NEW_STATUS_CHOICES, max_length=30),
        ),
    ]
