from django.contrib import admin
from .models import *


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon')
    search_fields = ('name',)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'fallback_stock', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name',)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'stock', 'low_threshold', 'icon')
    search_fields = ('name',)


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('menu_item', 'ingredient', 'quantity')


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'shift', 'phone', 'is_admin', 'is_active')
    list_filter = ('role', 'shift', 'is_admin', 'is_active')
    search_fields = ('name', 'phone')


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('number', 'capacity', 'status')
    list_filter = ('status',)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'table', 'total', 'status', 'payment_method', 'created_by', 'created_at')
    list_filter = ('status', 'payment_method')
    inlines = [OrderItemInline]


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ('restaurant_name', 'tax_rate', 'num_tables', 'currency')
