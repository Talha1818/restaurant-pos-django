from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pos', '0004_alter_menuitem_fallback_stock'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='order_type',
            field=models.CharField(
                choices=[('Walk in', 'Walk in'), ('Delivery', 'Delivery'), ('Takeaway', 'Takeaway')],
                default='Walk in',
                max_length=20,
            ),
        ),
    ]
