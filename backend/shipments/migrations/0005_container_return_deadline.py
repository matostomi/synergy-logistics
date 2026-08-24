from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shipments', '0004_shipmentdocument'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipment',
            name='container_return_deadline',
            field=models.DateField(
                blank=True, null=True,
                help_text='Free-time / demurrage deadline for returning the empty container. Set manually.'
            ),
        ),
    ]
