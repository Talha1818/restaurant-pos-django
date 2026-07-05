from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Count, Avg
import json, decimal, csv
from .models import *


# ─────────────── AUTH ───────────────
def login_view(request):
    error = ''
    if request.method == 'POST':
        user = authenticate(request, username=request.POST['username'], password=request.POST['password'])
        if user:
            login(request, user)
            if request.POST.get('remember'):
                request.session.set_expiry(60 * 60 * 24 * 30)  # 30 days
            else:
                request.session.set_expiry(0)  # expires when browser closes
            return redirect('pos:index')
        error = 'Invalid username or password'
    return render(request, 'pos/login.html', {'error': error})


def logout_view(request):
    logout(request)
    return redirect('pos:login')


# ─────────────── PAGE VIEWS (one template per module) ───────────────
@login_required
def index(request):
    return render(request, 'pos/pos.html', {'active_page': 'pos'})


@login_required
def orders_page(request):
    return render(request, 'pos/orders.html', {'active_page': 'orders'})


@login_required
def tables_page(request):
    return render(request, 'pos/tables.html', {'active_page': 'tables'})


@login_required
def admin_items_page(request):
    return render(request, 'pos/admin_items.html', {'active_page': 'admin', 'admin_tab': 'items'})


@login_required
def admin_categories_page(request):
    return render(request, 'pos/admin_categories.html', {'active_page': 'admin', 'admin_tab': 'categories'})


@login_required
def admin_inventory_page(request):
    return render(request, 'pos/admin_inventory.html', {'active_page': 'admin', 'admin_tab': 'inventory'})


@login_required
def admin_staff_page(request):
    return render(request, 'pos/admin_staff.html', {'active_page': 'admin', 'admin_tab': 'staff'})


@login_required
def reports_page(request):
    return render(request, 'pos/reports.html', {'active_page': 'reports'})


@login_required
def settings_page(request):
    return render(request, 'pos/settings.html', {'active_page': 'settings'})


# ─────────────── API: MENU ───────────────
@login_required
def api_menu(request):
    cats = list(Category.objects.values('id', 'name', 'icon'))
    items = []
    for item in MenuItem.objects.filter(is_active=True).select_related('category'):
        recipes = list(item.recipes.select_related('ingredient'))
        if recipes:
            avail = min(
                int(r.ingredient.stock / r.quantity) for r in recipes if r.quantity > 0
            )
        else:
            avail = item.fallback_stock
        items.append({
            'id': item.id,
            'name': item.name,
            'cat': item.category_id,
            'price': float(item.price),
            'icon': item.icon,
            'stock': avail,
        })
    ingredients = list(Ingredient.objects.values('id', 'name', 'unit', 'stock', 'low_threshold', 'icon'))
    settings = Settings.load()
    now = timezone.localtime()
    return JsonResponse({
        'categories': cats, 'items': items, 'ingredients': ingredients,
        'tax_rate': float(settings.tax_rate),
        'server_date': now.strftime('%A, %d %b'),
        'restaurant': {
            'name': settings.restaurant_name,
            'phone': settings.phone,
            'address': settings.address,
        },
    })


# ─────────────── API: SAVE ORDER ───────────────
@login_required
@csrf_exempt
def api_save_order(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body)
    if not data.get('items'):
        return JsonResponse({'error': 'No items in order'}, status=400)

    table_num = data.get('table')
    table = None
    if table_num:
        table, _ = Table.objects.get_or_create(number=table_num, defaults={'capacity': 4})
        if data.get('status') == 'pending':
            table.status = 'occupied'
            table.save()

    order = Order.objects.create(
        table=table,
        total_customers=data.get('cust', 1) or 1,
        payment_method=data.get('payment', 'Cash'),
        extra_amount=decimal.Decimal(str(data.get('extra', 0))),
        special_notes=data.get('notes', ''),
        subtotal=decimal.Decimal(str(data.get('sub', 0))),
        tax=decimal.Decimal(str(data.get('tax', 0))),
        total=decimal.Decimal(str(data.get('total', 0))),
        status=data.get('status', 'pending'),
        created_by=request.user,
    )

    for it in data.get('items', []):
        menu_item = get_object_or_404(MenuItem, id=it['id'])
        qty = it['qty']
        OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=qty,
            unit_price=menu_item.price,
            line_total=menu_item.price * qty,
        )
        for r in menu_item.recipes.select_related('ingredient'):
            r.ingredient.stock = max(0, round(r.ingredient.stock - r.quantity * qty, 2))
            r.ingredient.save()

    local_dt = timezone.localtime(order.created_at)
    return JsonResponse({
        'success': True, 'order_id': order.order_number,
        'date': local_dt.strftime('%d %b %Y'), 'time': local_dt.strftime('%I:%M %p'),
    })


# ─────────────── API: ORDERS LIST ───────────────
@login_required
def api_orders(request):
    orders = Order.objects.prefetch_related('items__menu_item').select_related('table').order_by('-created_at')[:100]
    result = []
    for o in orders:
        local_dt = timezone.localtime(o.created_at)
        result.append({
            'id': o.order_number,
            'table': o.table.number if o.table else None,
            'cust': o.total_customers,
            'payment': o.payment_method,
            'extra': float(o.extra_amount),
            'notes': o.special_notes,
            'sub': float(o.subtotal),
            'tax': float(o.tax),
            'total': float(o.total),
            'status': o.status,
            # 'time': o.created_at.strftime('%I:%M %p'),
            # 'date': o.created_at.strftime('%d %b'),
            'time': local_dt.strftime('%I:%M %p'),
            'date': local_dt.strftime('%d %b'),
            'items': [{'name': i.menu_item.name, 'icon': i.menu_item.icon, 'qty': i.quantity, 'price': float(i.unit_price)} for i in o.items.all()],
        })
    return JsonResponse({'orders': result})


# ─────────────── API: UPDATE ORDER STATUS ───────────────
@login_required
@csrf_exempt
def api_update_order(request, order_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body)
    order = get_object_or_404(Order, order_number=order_id)
    if 'status' in data:
        order.status = data['status']
        order.save()
        if order.table:
            if data['status'] == 'done':
                still_pending = Order.objects.filter(table=order.table, status='pending').exclude(order_number=order.order_number).exists()
                if not still_pending:
                    order.table.status = 'free'
                    order.table.save()
            elif data['status'] == 'pending':
                order.table.status = 'occupied'
                order.table.save()
    return JsonResponse({'success': True})


# ─────────────── API: DELETE ORDER ───────────────
@login_required
@csrf_exempt
def api_delete_order(request, order_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    order = get_object_or_404(Order, order_number=order_id)
    for item in order.items.select_related('menu_item'):
        for r in item.menu_item.recipes.select_related('ingredient'):
            r.ingredient.stock = round(r.ingredient.stock + r.quantity * item.quantity, 2)
            r.ingredient.save()
    table = order.table
    order.delete()
    if table:
        still_pending = Order.objects.filter(table=table, status='pending').exists()
        if not still_pending and table.status == 'occupied':
            table.status = 'free'
            table.save()
    return JsonResponse({'success': True})


# ─────────────── API: EDIT ORDER (change items / meta) ───────────────
@login_required
@csrf_exempt
def api_edit_order(request, order_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    data = json.loads(request.body)
    if not data.get('items'):
        return JsonResponse({'error': 'Order must have at least one item'}, status=400)
    order = get_object_or_404(Order, order_number=order_id)

    # revert stock consumed by the old items
    for old_item in order.items.select_related('menu_item'):
        for r in old_item.menu_item.recipes.select_related('ingredient'):
            r.ingredient.stock = round(r.ingredient.stock + r.quantity * old_item.quantity, 2)
            r.ingredient.save()
    order.items.all().delete()

    table_num = data.get('table')
    if table_num:
        table, _ = Table.objects.get_or_create(number=table_num, defaults={'capacity': 4})
        order.table = table
        if order.status == 'pending':
            table.status = 'occupied'
            table.save()
    else:
        order.table = None

    order.total_customers = data.get('cust', 1) or 1
    order.payment_method = data.get('payment', order.payment_method)
    order.extra_amount = decimal.Decimal(str(data.get('extra', 0)))
    order.special_notes = data.get('notes', '')
    order.subtotal = decimal.Decimal(str(data.get('sub', 0)))
    order.tax = decimal.Decimal(str(data.get('tax', 0)))
    order.total = decimal.Decimal(str(data.get('total', 0)))
    order.save()

    for it in data.get('items', []):
        menu_item = get_object_or_404(MenuItem, id=it['id'])
        qty = it['qty']
        OrderItem.objects.create(
            order=order, menu_item=menu_item, quantity=qty,
            unit_price=menu_item.price, line_total=menu_item.price * qty,
        )
        for r in menu_item.recipes.select_related('ingredient'):
            r.ingredient.stock = max(0, round(r.ingredient.stock - r.quantity * qty, 2))
            r.ingredient.save()

    return JsonResponse({'success': True, 'order_id': order.order_number})


# ─────────────── API: EXPORT ORDERS TO EXCEL (CSV) ───────────────
@login_required
def api_export_orders(request):
    rng = request.GET.get('range', 'today')
    now = timezone.localtime()
    if rng == 'yesterday':
        day_start = (now - timezone.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timezone.timedelta(days=1)

    orders = (Order.objects.filter(created_at__gte=day_start, created_at__lt=day_end)
              .select_related('table').prefetch_related('items__menu_item').order_by('created_at'))

    response = HttpResponse(content_type='text/csv')
    filename = f"nawab_orders_{day_start.strftime('%Y-%m-%d')}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(['Order #', 'Date', 'Time', 'Table', 'Guests', 'Payment', 'Items', 'Subtotal', 'Tax', 'Extra', 'Total', 'Status'])
    for o in orders:
        items_txt = ', '.join(f"{i.menu_item.name} x{i.quantity}" for i in o.items.all())
        local_dt = timezone.localtime(o.created_at)
        writer.writerow([
            # f"{o.order_number:04d}", o.created_at.strftime('%Y-%m-%d'), o.created_at.strftime('%I:%M %p'),
            f"{o.order_number:04d}", local_dt.strftime('%Y-%m-%d'), local_dt.strftime('%I:%M %p'),
            o.table.number if o.table else '', o.total_customers, o.payment_method, items_txt,
            o.subtotal, o.tax, o.extra_amount, o.total, o.status,
        ])
    return response


# ─────────────── API: TABLES ───────────────
@login_required
def api_tables(request):
    tables = list(Table.objects.order_by('number').values('id', 'number', 'capacity', 'status'))
    return JsonResponse({'tables': tables})


# ─────────────── API: REPORTS ───────────────
@login_required
def api_reports(request):
    period = request.GET.get('period', 'today')
    now = timezone.localtime()
    date_from = request.GET.get('from')
    date_to = request.GET.get('to')

    if period == 'custom' and date_from and date_to:
        start = timezone.make_aware(timezone.datetime.strptime(date_from, '%Y-%m-%d'))
        end = timezone.make_aware(timezone.datetime.strptime(date_to, '%Y-%m-%d')) + timezone.timedelta(days=1)
        num_days = max(1, (end - start).days)
    elif period == 'week':
        start = (now - timezone.timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now + timezone.timedelta(days=1)
        num_days = 7
    elif period == 'month':
        start = (now - timezone.timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now + timezone.timedelta(days=1)
        num_days = 30
    else:  # today
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now + timezone.timedelta(days=1)
        num_days = 1

    qs = Order.objects.filter(created_at__gte=start, created_at__lt=end, status='done')
    agg = qs.aggregate(sales=Sum('total'), orders=Count('order_number'), avg=Avg('total'), tax=Sum('tax'))

    # previous equivalent period, for % change comparison
    span = end - start
    prev_start, prev_end = start - span, start
    prev_qs = Order.objects.filter(created_at__gte=prev_start, created_at__lt=prev_end, status='done')
    prev_agg = prev_qs.aggregate(sales=Sum('total'), orders=Count('order_number'), avg=Avg('total'), tax=Sum('tax'))

    def pct_change(cur, prev):
        cur, prev = float(cur or 0), float(prev or 0)
        if prev == 0:
            return None if cur == 0 else 100.0
        return round((cur - prev) / prev * 100, 1)

    changes = {
        'sales': pct_change(agg['sales'], prev_agg['sales']),
        'orders': pct_change(agg['orders'], prev_agg['orders']),
        'avg': pct_change(agg['avg'], prev_agg['avg']),
        'tax': pct_change(agg['tax'], prev_agg['tax']),
    }

    bars, labels = [], []
    if num_days == 1:
        # 2-hour buckets across the single day
        cursor = start
        while cursor < end:
            bucket_end = cursor + timezone.timedelta(hours=2)
            bucket_total = qs.filter(created_at__gte=cursor, created_at__lt=bucket_end).aggregate(s=Sum('total'))['s'] or 0
            bars.append(float(bucket_total))
            labels.append(cursor.strftime('%I%p').lstrip('0'))
            cursor = bucket_end
    else:
        # daily trend (cap the number of bars shown for readability)
        step = max(1, num_days // 14) if num_days > 14 else 1
        cursor = start
        while cursor < end:
            day_end = min(cursor + timezone.timedelta(days=step), end)
            day_total = qs.filter(created_at__gte=cursor, created_at__lt=day_end).aggregate(s=Sum('total'))['s'] or 0
            bars.append(float(day_total))
            labels.append(cursor.strftime('%d %b'))
            cursor = day_end

    # top dishes by revenue
    top_qs = (OrderItem.objects.filter(order__in=qs)
              .values('menu_item__name')
              .annotate(rev=Sum('line_total'))
              .order_by('-rev')[:5])
    top_dishes = [{'name': t['menu_item__name'], 'revenue': float(t['rev'] or 0)} for t in top_qs]

    # payment method breakdown (of completed orders)
    pay_qs = qs.values('payment_method').annotate(c=Count('order_number'))
    pay_counts = {p['payment_method']: p['c'] for p in pay_qs}
    total_paid_orders = sum(pay_counts.values()) or 1
    payments = {m: round(pay_counts.get(m, 0) / total_paid_orders * 100) for m in ['Cash', 'Online']}

    # order status breakdown (all orders placed in range, regardless of status)
    status_qs = Order.objects.filter(created_at__gte=start, created_at__lt=end).values('status').annotate(c=Count('order_number'))
    status_counts = {s['status']: s['c'] for s in status_qs}
    total_all_orders = sum(status_counts.values()) or 1
    order_status = {s: round(status_counts.get(s, 0) / total_all_orders * 100) for s in ['done', 'pending', 'cancelled'] if status_counts.get(s, 0) > 0}
    if not order_status:
        order_status = {'done': 0}

    # recent orders (any status) within range
    recent_qs = Order.objects.filter(created_at__gte=start, created_at__lt=end).select_related('table').prefetch_related('items__menu_item').order_by('-created_at')[:8]
    recent = []
    for o in recent_qs:
        items_txt = ', '.join(f"{i.menu_item.name}" + (f" ×{i.quantity}" if i.quantity > 1 else '') for i in o.items.all())
        recent.append({
            'id': o.order_number, 'items': items_txt or '—',
            'table': f"T{o.table.number}" if o.table else '—',
            'time': o.created_at.strftime('%I:%M %p'), 'amt': float(o.total),
        })

    return JsonResponse({
        'sales': float(agg['sales'] or 0),
        'orders': agg['orders'] or 0,
        'avg': float(agg['avg'] or 0),
        'tax': float(agg['tax'] or 0),
        'changes': changes,
        'bars': bars, 'labels': labels,
        'top_dishes': top_dishes,
        'payments': payments,
        'order_status': order_status,
        'recent_orders': recent,
    })


# ─────────────── ADMIN: MENU ITEMS + RECIPE ───────────────
@login_required
def api_admin_items(request):
    if request.method == 'GET':
        items = []
        for item in MenuItem.objects.filter(is_active=True).select_related('category'):
            recipe = [{'ing': r.ingredient_id, 'qty': r.quantity} for r in item.recipes.all()]
            items.append({
                'id': item.id, 'name': item.name, 'cat': item.category.name, 'cat_id': item.category_id,
                'price': float(item.price), 'icon': item.icon, 'stock': item.fallback_stock, 'recipe': recipe,
            })
        cats = list(Category.objects.values('id', 'name', 'icon'))
        ingredients = list(Ingredient.objects.values('id', 'name', 'unit', 'icon'))
        return JsonResponse({'items': items, 'categories': cats, 'ingredients': ingredients})

    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')
        if action == 'add':
            cat = get_object_or_404(Category, id=data['cat_id'])
            item = MenuItem.objects.create(name=data['name'], category=cat, price=data['price'], icon=data.get('icon', '🍽'), fallback_stock=data.get('stock', 20))
            return JsonResponse({'success': True, 'id': item.id})
        if action == 'edit':
            item = get_object_or_404(MenuItem, id=data['id'])
            item.name = data.get('name', item.name)
            item.price = data.get('price', item.price)
            item.icon = data.get('icon', item.icon)
            if data.get('stock') is not None:
                item.fallback_stock = data.get('stock')
            cat = Category.objects.filter(id=data.get('cat_id')).first()
            if cat: item.category = cat
            item.save()
            return JsonResponse({'success': True})
        if action == 'delete':
            get_object_or_404(MenuItem, id=data['id']).delete()
            return JsonResponse({'success': True})
        if action == 'set_recipe':
            item = get_object_or_404(MenuItem, id=data['id'])
            Recipe.objects.filter(menu_item=item).delete()
            for row in data.get('recipe', []):
                qty = float(row.get('qty') or 0)
                if qty > 0:
                    ing = Ingredient.objects.filter(id=row['ing']).first()
                    if ing:
                        Recipe.objects.create(menu_item=item, ingredient=ing, quantity=qty)
            return JsonResponse({'success': True})
    return JsonResponse({'error': 'Bad request'}, status=400)


# ─────────────── ADMIN: CATEGORIES ───────────────
@login_required
def api_admin_categories(request):
    if request.method == 'GET':
        cats = []
        for c in Category.objects.all():
            cats.append({'id': c.id, 'name': c.name, 'icon': c.icon, 'count': c.items.filter(is_active=True).count()})
        return JsonResponse({'categories': cats})
    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')
        if action == 'add':
            name = (data.get('name') or '').strip()
            if not name:
                return JsonResponse({'error': 'Name required'}, status=400)
            cat = Category.objects.create(name=name, icon=data.get('icon') or '🍽')
            return JsonResponse({'success': True, 'id': cat.id})
        if action == 'edit':
            cat = get_object_or_404(Category, id=data['id'])
            cat.name = data.get('name', cat.name)
            cat.icon = data.get('icon', cat.icon)
            cat.save()
            return JsonResponse({'success': True})
        if action == 'delete':
            cat = get_object_or_404(Category, id=data['id'])
            if cat.items.exists():
                return JsonResponse({'error': 'Category has menu items — move or delete them first'}, status=400)
            cat.delete()
            return JsonResponse({'success': True})
    return JsonResponse({'error': 'Bad request'}, status=400)


# ─────────────── ADMIN: STAFF ───────────────
@login_required
def api_staff(request):
    if request.method == 'GET':
        staff = list(Staff.objects.filter(is_active=True).values('id', 'name', 'role', 'shift', 'phone', 'is_admin'))
        return JsonResponse({'staff': staff})
    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')
        if action == 'add':
            name = (data.get('name') or '').strip()
            if not name:
                return JsonResponse({'error': 'Name required'}, status=400)
            s = Staff.objects.create(name=name, role=data['role'], shift=data['shift'], phone=data.get('phone', ''), is_admin=bool(data.get('is_admin')))
            return JsonResponse({'success': True, 'id': s.id})
        if action == 'edit':
            s = get_object_or_404(Staff, id=data['id'])
            s.name = data.get('name', s.name)
            s.role = data.get('role', s.role)
            s.shift = data.get('shift', s.shift)
            s.phone = data.get('phone', s.phone)
            if 'is_admin' in data:
                s.is_admin = bool(data.get('is_admin'))
            s.save()
            return JsonResponse({'success': True})
        if action == 'delete':
            get_object_or_404(Staff, id=data['id']).delete()
            return JsonResponse({'success': True})
    return JsonResponse({'error': 'Bad request'}, status=400)


# ─────────────── ADMIN: INVENTORY (raw ingredient stock) ───────────────
@login_required
def api_inventory(request):
    if request.method == 'GET':
        ing = list(Ingredient.objects.values('id', 'name', 'unit', 'stock', 'low_threshold', 'icon'))
        return JsonResponse({'ingredients': ing})
    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')
        if action == 'add':
            name = (data.get('name') or '').strip()
            if not name:
                return JsonResponse({'error': 'Name required'}, status=400)
            ing = Ingredient.objects.create(
                name=name, unit=data.get('unit', 'kg'), stock=data.get('stock', 0),
                low_threshold=data.get('low', 5), icon=data.get('icon') or '📦',
            )
            return JsonResponse({'success': True, 'id': ing.id})
        if action == 'edit':
            ing = get_object_or_404(Ingredient, id=data['id'])
            ing.name = data.get('name', ing.name)
            ing.unit = data.get('unit', ing.unit)
            ing.icon = data.get('icon', ing.icon)
            if data.get('low') is not None:
                ing.low_threshold = data.get('low')
            ing.save()
            return JsonResponse({'success': True})
        if action == 'update_stock':
            ing = get_object_or_404(Ingredient, id=data['id'])
            ing.stock = data['stock']
            ing.save()
            return JsonResponse({'success': True})
        if action == 'add_stock':
            ing = get_object_or_404(Ingredient, id=data['id'])
            qty = float(data.get('qty') or 0)
            ing.stock = round(ing.stock + qty, 2)
            ing.save()
            return JsonResponse({'success': True, 'stock': ing.stock})
        if action == 'delete':
            get_object_or_404(Ingredient, id=data['id']).delete()
            return JsonResponse({'success': True})
    return JsonResponse({'error': 'Bad request'}, status=400)


# ─────────────── SETTINGS ───────────────
@login_required
def api_settings(request):
    s = Settings.load()
    if request.method == 'GET':
        return JsonResponse({
            'restaurant_name': s.restaurant_name, 'phone': s.phone, 'address': s.address,
            'tax_rate': float(s.tax_rate), 'tax_on_bill': s.tax_on_bill,
            'auto_print_bill': s.auto_print_bill, 'sound_alerts': s.sound_alerts,
            'num_tables': s.num_tables, 'currency': s.currency,
        })
    if request.method == 'POST':
        data = json.loads(request.body)
        for f in ['restaurant_name', 'phone', 'address', 'currency']:
            if f in data: setattr(s, f, data[f])
        if 'tax_rate' in data: s.tax_rate = decimal.Decimal(str(data['tax_rate']))
        for f in ['tax_on_bill', 'auto_print_bill', 'sound_alerts']:
            if f in data: setattr(s, f, bool(data[f]))
        if 'num_tables' in data:
            s.num_tables = int(data['num_tables'])
            existing = set(Table.objects.values_list('number', flat=True))
            for n in range(1, s.num_tables + 1):
                if n not in existing:
                    Table.objects.get_or_create(number=n, defaults={'capacity': 4})
        s.save()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Bad request'}, status=400)
