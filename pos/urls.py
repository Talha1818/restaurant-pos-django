from django.urls import path
from . import views

app_name = 'pos'

urlpatterns = [
    # Pages (one template per module)
    path('', views.index, name='index'),
    path('orders/', views.orders_page, name='orders'),
    path('tables/', views.tables_page, name='tables'),
    path('admin-panel/items/', views.admin_items_page, name='admin_items'),
    path('admin-panel/categories/', views.admin_categories_page, name='admin_categories'),
    path('admin-panel/inventory/', views.admin_inventory_page, name='admin_inventory'),
    path('admin-panel/staff/', views.admin_staff_page, name='admin_staff'),
    path('reports/', views.reports_page, name='reports'),
    path('settings/', views.settings_page, name='settings'),

    # Auth
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # License
    path('license/', views.license_page, name='license_page'),

    # API
    path('api/menu/', views.api_menu, name='api_menu'),
    path('api/orders/', views.api_orders, name='api_orders'),
    path('api/orders/export/', views.api_export_orders, name='api_export_orders'),
    path('api/orders/save/', views.api_save_order, name='api_save_order'),
    path('api/orders/<int:order_id>/update/', views.api_update_order, name='api_update_order'),
    path('api/orders/<int:order_id>/edit/', views.api_edit_order, name='api_edit_order'),
    path('api/orders/<int:order_id>/delete/', views.api_delete_order, name='api_delete_order'),
    path('api/tables/', views.api_tables, name='api_tables'),
    path('api/reports/', views.api_reports, name='api_reports'),
    path('api/admin/items/', views.api_admin_items, name='api_admin_items'),
    path('api/admin/categories/', views.api_admin_categories, name='api_admin_categories'),
    path('api/admin/staff/', views.api_staff, name='api_staff'),
    path('api/admin/inventory/', views.api_inventory, name='api_inventory'),
    path('api/settings/', views.api_settings, name='api_settings'),
]
