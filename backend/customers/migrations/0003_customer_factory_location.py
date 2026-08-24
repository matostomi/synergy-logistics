from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0002_alter_customer_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='factory_location',
            field=models.CharField(blank=True, help_text='Fabric/factory pickup or delivery location', max_length=255),
        ),
    ]
