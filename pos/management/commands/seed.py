from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from pos.models import *


class Command(BaseCommand):
    help = 'Seed initial data for Nawab POS'

    def handle(self, *args, **options):
        # Create superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@nawab.com', 'nawab1234')
            self.stdout.write('Created admin user (username: admin, password: nawab1234)')

        # Categories
        cats_data = [
            ('bbq', 'Bar BQ', '🔥'), ('daal', 'Daal / Sabzi', '🥘'),
            ('raita', 'Raita / Salad', '🥗'), ('karahi', 'Mutton Karahi', '🍖'),
            ('bkarahi', 'Beef Karahi', '🥩'), ('chicken', 'Chicken', '🍗'),
            ('roti', 'Naan / Roti', '🫓'),
        ]
        cat_map = {}
        for slug, name, icon in cats_data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'icon': icon})
            cat_map[slug] = cat

        # Ingredients
        ing_data = [
            ('Chicken (raw)', 'kg', 45, 10, '🍗'), ('Beef (raw)', 'kg', 30, 8, '🥩'),
            ('Mutton (raw)', 'kg', 18, 5, '🍖'), ('Daal (lentils)', 'kg', 20, 5, '🥘'),
            ('Palak (spinach)', 'kg', 12, 4, '🌿'), ('Cooking oil', 'ltr', 35, 10, '🛢️'),
            ('Rice', 'kg', 50, 15, '🍚'), ('Wheat flour (atta)', 'kg', 40, 10, '🌾'),
            ('Onions', 'kg', 25, 8, '🧅'), ('Tomatoes', 'kg', 20, 6, '🍅'),
            ('Yogurt', 'kg', 15, 5, '🥛'), ('Ginger-garlic paste', 'kg', 6, 2, '🧄'),
            ('Spice mix (masala)', 'kg', 8, 2, '🌶️'), ('Gas cylinder', 'pcs', 3, 1, '🔥'),
        ]
        ing_map = {}
        for name, unit, stock, low, icon in ing_data:
            ing, _ = Ingredient.objects.get_or_create(name=name, defaults={'unit':unit,'stock':stock,'low_threshold':low,'icon':icon})
            ing_map[name] = ing

        # Menu items
        items_data = [
            ('Chicken Tikka ½ kg', 'bbq', 700, '🍗', [('Chicken (raw)', 0.5), ('Spice mix (masala)', 0.03)]),
            ('Malai Boti ½ kg', 'bbq', 900, '🍢', [('Chicken (raw)', 0.5), ('Yogurt', 0.1)]),
            ('Beef Kabab 1 kg', 'bbq', 1600, '🥩', [('Beef (raw)', 1), ('Spice mix (masala)', 0.05)]),
            ('Reshmi Kabab', 'bbq', 850, '🍡', [('Chicken (raw)', 0.5), ('Yogurt', 0.1)]),
            ('Malai Leg Piece', 'chicken', 400, '🍗', [('Chicken (raw)', 0.4)]),
            ('Chicken Handi', 'chicken', 750, '🫕', [('Chicken (raw)', 0.5), ('Onions', 0.1), ('Tomatoes', 0.1)]),
            ('Daal Makhani', 'daal', 350, '🥘', [('Daal (lentils)', 0.35), ('Cooking oil', 0.05)]),
            ('Palak Gosht', 'daal', 550, '🌿', [('Palak (spinach)', 0.3), ('Mutton (raw)', 0.2)]),
            ('Mutton Karahi', 'karahi', 1200, '🍖', [('Mutton (raw)', 1), ('Tomatoes', 0.15)]),
            ('Beef Karahi', 'bkarahi', 950, '🥩', [('Beef (raw)', 1), ('Tomatoes', 0.15)]),
            ('Raita Bowl', 'raita', 120, '🥛', [('Yogurt', 0.2)]),
            ('Zeera Raita', 'raita', 100, '🥣', [('Yogurt', 0.15)]),
            ('Roghni Naan', 'roti', 80, '🫓', [('Wheat flour (atta)', 0.12)]),
            ('Tandoori Roti', 'roti', 50, '🫓', [('Wheat flour (atta)', 0.08)]),
        ]
        for name, cat_slug, price, icon, recipe in items_data:
            item, created = MenuItem.objects.get_or_create(name=name, defaults={
                'category': cat_map[cat_slug], 'price': price, 'icon': icon, 'fallback_stock': 20
            })
            if created:
                for ing_name, qty in recipe:
                    ing = ing_map.get(ing_name)
                    if ing:
                        Recipe.objects.create(menu_item=item, ingredient=ing, quantity=qty)

        # Tables
        for i in range(1, 9):
            Table.objects.get_or_create(number=i, defaults={'capacity': 4 if i % 2 == 0 else 6})

        # Staff
        staff_data = [
            ('Ahmed Raza', 'Waiter', 'Morning', False), ('Sara Khan', 'Cashier', 'Morning', False),
            ('Bilal Hassan', 'Chef', 'Both', False), ('Fatima Malik', 'Waiter', 'Evening', False),
            ('Usman Tariq', 'Manager', 'Both', True),
        ]
        for name, role, shift, is_admin in staff_data:
            Staff.objects.get_or_create(name=name, defaults={'role': role, 'shift': shift, 'is_admin': is_admin})

        # Settings (singleton)
        Settings.load()

        self.stdout.write(self.style.SUCCESS('✅ Seed data loaded successfully!'))
