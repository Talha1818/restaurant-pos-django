from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='staff',
            name='is_admin',
            field=models.BooleanField(default=False, help_text='Grants access to the Admin panel'),
        ),
        migrations.CreateModel(
            name='Settings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('restaurant_name', models.CharField(default='Nawab Restaurant', max_length=150)),
                ('phone', models.CharField(blank=True, default='+92 300 1234567', max_length=30)),
                ('address', models.CharField(blank=True, default='Block 5, Karachi', max_length=200)),
                ('tax_rate', models.DecimalField(decimal_places=2, default=5, max_digits=5)),
                ('tax_on_bill', models.BooleanField(default=True)),
                ('auto_print_bill', models.BooleanField(default=False)),
                ('sound_alerts', models.BooleanField(default=True)),
                ('num_tables', models.IntegerField(default=8)),
                ('currency', models.CharField(default='PKR — Rupee', max_length=20)),
            ],
            options={
                'verbose_name_plural': 'Settings',
            },
        ),
    ]
