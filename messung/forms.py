from django import forms
from .models import Projekt, Objekt, Messdaten


class ProjektForm(forms.ModelForm):
    class Meta:
        model = Projekt
        fields = ['code', 'name', 'beschreibung']


class ObjektForm(forms.ModelForm):
    class Meta:
        model = Objekt
        fields = ['projekt', 'nummer', 'name']


class MessungForm(forms.ModelForm):
    class Meta:
        model = Messdaten
        fields = ['anforderung', 'messbedingungen', 'messhoehe']
