from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🍽')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=20, default='kg')
    stock = models.FloatField(default=0)
    low_threshold = models.FloatField(default=5)
    icon = models.CharField(max_length=10, default='📦')

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    name = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    icon = models.CharField(max_length=10, default='🍽')
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True)
    fallback_stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Recipe(models.Model):
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='recipes')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.FloatField()  # amount consumed per 1 unit ordered

    def __str__(self):
        return f"{self.menu_item.name} → {self.ingredient.name} x{self.quantity}"


class Staff(models.Model):
    ROLE_CHOICES = [('Waiter','Waiter'),('Cashier','Cashier'),('Chef','Chef'),('Manager','Manager'),('Cleaner','Cleaner')]
    SHIFT_CHOICES = [('Morning','Morning'),('Evening','Evening'),('Both','Both')]
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    is_admin = models.BooleanField(default=False, help_text='Grants access to the Admin panel')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Table(models.Model):
    STATUS_CHOICES = [('free','Free'),('occupied','Occupied'),('reserved','Reserved')]
    number = models.IntegerField(unique=True)
    capacity = models.IntegerField(default=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='free')

    def __str__(self):
        return f"Table {self.number}"


class Order(models.Model):
    STATUS_CHOICES = [('pending','Pending'),('done','Done'),('cancelled','Cancelled')]
    PAYMENT_CHOICES = [('Cash','Cash'),('Online','Online')]
    ORDER_TYPE_CHOICES = [('Walk in','Walk in'),('Delivery','Delivery'),('Takeaway','Takeaway')]

    order_number = models.AutoField(primary_key=True)
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True)
    total_customers = models.IntegerField(default=1)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='Cash')
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='Walk in')
    extra_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    special_notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number}"


class Settings(models.Model):
    """Singleton row holding restaurant-wide settings (matches the Settings screen)."""
    restaurant_name = models.CharField(max_length=150, default='Nawab Restaurant')
    phone = models.CharField(max_length=30, blank=True, default='+92 300 1234567')
    address = models.CharField(max_length=200, blank=True, default='Block 5, Karachi')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    tax_on_bill = models.BooleanField(default=True)
    auto_print_bill = models.BooleanField(default=False)
    sound_alerts = models.BooleanField(default=True)
    num_tables = models.IntegerField(default=8)
    currency = models.CharField(max_length=20, default='PKR — Rupee')

    class Meta:
        verbose_name_plural = 'Settings'

    def __str__(self):
        return self.restaurant_name

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.menu_item.name} x{self.quantity}"
