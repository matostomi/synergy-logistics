from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shipments', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shipment',
            name='origin_address',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='destination_address',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='weight_kg',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='operation_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='bill_number',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='shipment',
            name='container_count',
            field=models.CharField(blank=True, help_text='e.g. 1X40', max_length=20),
        ),
        migrations.AddField(
            model_name='shipment',
            name='container_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='liner',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='border_crossing',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='shipment',
            name='customs_office',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='shipment',
            name='declaration_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='items',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='shipment',
            name='remark',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='shipment',
            name='rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='document_received_date',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='vessel_arrival_date',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='truck_plate_number_raw',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='loading_date',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='customs_arrival',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='customs_released',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='factory_arrival',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='factory_unloading',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='shipment',
            name='empty_container_return_date',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
