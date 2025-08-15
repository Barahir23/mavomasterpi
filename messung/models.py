from django.db import models


class Anforderungen(models.Model):
    ref = models.CharField(max_length=100, unique=True)
    bereich = models.CharField(max_length=255, blank=True, null=True)
    typ = models.TextField(blank=True, null=True)
    avg = models.FloatField(blank=True, null=True)
    avgmod = models.FloatField(blank=True, null=True)
    u0 = models.FloatField(blank=True, null=True)

    def __str__(self):
        if self.typ:
            return f"{self.ref} {self.typ}"
        return self.ref


class Projekt(models.Model):
    code = models.CharField(max_length=50, unique=True, help_text="Eindeutiger Projektcode")
    name = models.CharField(max_length=200)
    beschreibung = models.TextField(blank=True, null=True)
    erstellt_am = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Objekt(models.Model):
    projekt = models.ForeignKey(Projekt, related_name='objekte', on_delete=models.CASCADE)
    nummer = models.CharField(max_length=100, help_text="Eindeutige Nummer des Messobjekts")
    name = models.CharField(max_length=200)
    erstellt_am = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('projekt', 'nummer')

    def __str__(self):
        return f"{self.name} (Projekt: {self.projekt.code})"


class Messdaten(models.Model):
    objekt = models.ForeignKey(Objekt, related_name='messungen', on_delete=models.CASCADE)
    anforderung = models.ForeignKey(Anforderungen, on_delete=models.SET_NULL, blank=True, null=True)
    name = models.CharField(max_length=100, help_text="Name der Messung")
    messdaten = models.JSONField(default=list, help_text="Liste von Messpunkten")
    kommentar = models.TextField(blank=True, null=True)
    device = models.CharField(max_length=255, blank=True, null=True)
    einheit = models.CharField(max_length=50, blank=True, null=True)
    messbedingungen = models.TextField(blank=True, null=True)
    messhoehe = models.FloatField(blank=True, null=True)
    min_wert = models.FloatField(blank=True, null=True)
    max_wert = models.FloatField(blank=True, null=True)
    avg_wert = models.FloatField(blank=True, null=True)
    u0 = models.FloatField(blank=True, null=True, help_text="Gleichmässigkeit (min/avg)")
    erstellt_am = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} für Objekt {self.objekt.name}"

    def save(self, *args, **kwargs):
        self.min_wert, self.max_wert, self.avg_wert, self.u0 = None, None, None, None
        werte = []
        if self.messdaten:
            if isinstance(self.messdaten, list):
                werte = [float(punkt['value']) for punkt in self.messdaten if 'value' in punkt]
            elif isinstance(self.messdaten, dict):
                for row in self.messdaten.get('data', []):
                    single = row.get('single')
                    if single not in (None, ''):
                        werte.append(float(single))
                    for val in row.get('sequences', []):
                        if val not in (None, ''):
                            werte.append(float(val))
        if werte:
            self.min_wert = min(werte)
            self.max_wert = max(werte)
            self.avg_wert = sum(werte) / len(werte)
            if self.avg_wert:
                self.u0 = self.min_wert / self.avg_wert
        super().save(*args, **kwargs)
