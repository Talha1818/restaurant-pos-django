# from django.contrib import admin
# from django.urls import path, include
# from django.conf import settings
# from django.conf.urls.static import static

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('', include('pos.urls', namespace='pos')),
# ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.contrib import admin
from django.urls import path, include, re_path
from pos import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('pos.urls', namespace='pos')),
    re_path(r'^media/(?P<path>.*)$', views.serve_media),
]