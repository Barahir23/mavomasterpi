from django.test import TestCase
from django.urls import reverse

from .models import Projekt, Objekt, Messdaten


class MessungPageTests(TestCase):
    def setUp(self):
        self.projekt = Projekt.objects.create(code="P1", name="Projekt 1")
        self.objekt = Objekt.objects.create(projekt=self.projekt, nummer="1", name="Objekt 1")

    def test_creates_new_messung_when_missing(self):
        url = reverse('messung:page') + f'?objekt={self.objekt.id}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        messung = Messdaten.objects.get(objekt=self.objekt)
        self.assertIn(f'messung={messung.id}', response['Location'])

    def test_populates_objects_when_project_selected(self):
        url = reverse('messung:page') + f'?projekt={self.projekt.id}'
        response = self.client.get(url)
        self.assertContains(response, f'option value="{self.objekt.id}"')
