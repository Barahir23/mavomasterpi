from django import forms
from .models import Projekt, Objekt


class ProjektForm(forms.ModelForm):
    class Meta:
        model = Projekt
        fields = ['code', 'name', 'beschreibung']


class ObjektForm(forms.ModelForm):
    class Meta:
        model = Objekt
        fields = ['projekt', 'nummer', 'name']
