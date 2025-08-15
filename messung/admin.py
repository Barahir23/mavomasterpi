from django.contrib import admin
from .models import Projekt, Objekt, Messdaten
# Register your models here.
admin.site.register(Projekt)
admin.site.register(Objekt)
admin.site.register(Messdaten)