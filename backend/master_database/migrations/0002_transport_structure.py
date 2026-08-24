from django.db import migrations, models


def normalize_legacy_modes(apps, schema_editor):
    MasterOperation = apps.get_model('master_database', 'MasterOperation')

    # Phase 1 used the old "road" value.
    # Convert it to the Phase 2 UNIMODAL structure.
    MasterOperation.objects.filter(transport_mode='road').update(
        transport_mode='unimodal',
        transport_provider='Our Truck',
        inland_transport_mode='road',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('master_database', '0001_initial'),
    ]

    operations = [
        # 1. Add the fields FIRST
        migrations.AddField(
            model_name='masteroperation',
            name='transport_provider',
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=100,
            ),
        ),

        migrations.AddField(
            model_name='masteroperation',
            name='inland_transport_mode',
            field=models.CharField(
                blank=True,
                choices=[
                    ('road', 'Road / Truck'),
                    ('train', 'Train'),
                ],
                max_length=10,
            ),
        ),

        # 2. Update the transport_mode choices
        migrations.AlterField(
            model_name='masteroperation',
            name='transport_mode',
            field=models.CharField(
                choices=[
                    ('air', 'Air'),
                    ('multimodal', 'Multimodal (Ocean + inland)'),
                    ('unimodal', 'Unimodal (Road only)'),
                    ('other', 'Other'),
                ],
                default='unimodal',
                max_length=12,
            ),
        ),

        # 3. NOW migrate old road records
        migrations.RunPython(
            normalize_legacy_modes,
            migrations.RunPython.noop,
        ),

        # 4. Add index
        migrations.AddIndex(
            model_name='masteroperation',
            index=models.Index(
                fields=['transport_provider'],
                name='master_db_transport_provider_idx',
            ),
        ),
    ]