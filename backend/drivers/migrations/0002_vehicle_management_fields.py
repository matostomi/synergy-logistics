from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drivers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehicle',
            name='fuel_type',
            field=models.CharField(blank=True, choices=[('diesel', 'Diesel'), ('petrol', 'Petrol'), ('electric', 'Electric')], max_length=20),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='insurance_expiry',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='last_maintenance_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
