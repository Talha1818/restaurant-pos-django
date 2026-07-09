from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pos', '0002_staff_is_admin_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='categories/'),
        ),
        migrations.AddField(
            model_name='menuitem',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='menu_items/'),
        ),
    ]
