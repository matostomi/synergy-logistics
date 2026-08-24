from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('master_database', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='masteroperation',
            name='transport_mode',
            field=models.CharField(
                choices=[
                    ('air', 'Air'),
                    ('multimodal', 'Multimodal (Ocean + Djibouti Dry Port + inland leg)'),
                    ('unimodal', 'Unimodal (Road only, Djibouti \u2192 Ethiopia)'),
                    ('other', 'Other'),
                ],
                default='unimodal',
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name='masteroperation',
            name='transport_provider',
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]
