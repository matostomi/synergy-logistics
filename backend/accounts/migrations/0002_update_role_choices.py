from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrator'),
                    ('operations_officer', 'Operations Officer'),
                    ('manager', 'Manager'),
                    ('driver', 'Driver'),
                    ('customer', 'Customer'),
                ],
                default='operations_officer',
                max_length=20,
            ),
        ),
    ]
