"""mavomaster URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from . import views
import messung.views
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.hompage),
    path('messung/', include('messung.urls')),
    path('projekte/', messung.views.projekte_page, name='projekte_page'),
    path('projekte/add/', messung.views.projekt_add, name='projekt_add'),
    path('projekte/<int:projekt_id>/edit/', messung.views.projekt_edit, name='projekt_edit'),
    path('projekte/<int:projekt_id>/delete/', messung.views.projekt_delete, name='projekt_delete'),
    path('objekte/add/', messung.views.objekt_add, name='objekt_add'),
    path('projekte/<int:projekt_id>/objekt/add/', messung.views.objekt_add, name='objekt_add_project'),
    path('objekte/<int:objekt_id>/edit/', messung.views.objekt_edit, name='objekt_edit'),
    path('objekte/<int:objekt_id>/delete/', messung.views.objekt_delete, name='objekt_delete'),
    path('messungen/<int:messung_id>/edit/', messung.views.messung_edit, name='messung_edit'),
    path('messungen/<int:messung_id>/delete/', messung.views.messung_delete, name='messung_delete'),
    path('system/reboot/', views.system_reboot, name='system_reboot'),
    path('system/shutdown/', views.system_shutdown, name='system_shutdown'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
