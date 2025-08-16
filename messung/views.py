from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.urls import reverse
from django import forms
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time
import json
import subprocess
from datetime import datetime
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

from .models import Projekt, Objekt, Messdaten, Anforderungen
from .forms import ProjektForm, ObjektForm, MessungForm
from .logic import (
    MeasurementThread, MavoMasterDevice, RealtimePollingThread,
    MEASUREMENT_THREAD, DEVICE, POLLING_THREAD
)


def messung_page(request):
    try:
        result = subprocess.run(['lsusb'], capture_output=True, text=True, check=True)
        output = result.stdout
        mavo_found = '1cd7:4003' in output
        hub_found = '1d6b:0002' in output
        device_warning = mavo_found != hub_found
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"Fehler bei lsusb: {e}")
        device_warning = True

    projekte = Projekt.objects.all().order_by('name')
    anforderungen_qs = Anforderungen.objects.all().order_by('ref')
    anforderungen_json = json.dumps(list(anforderungen_qs.values('id', 'ref', 'bereich', 'typ')))

    projekt_id = request.GET.get('projekt')
    objekt_id = request.GET.get('objekt')
    messung_id = request.GET.get('messung')

    selected_projekt = None
    selected_objekt = None
    selected_messung = None
    messung_form = None
    objekte = []
    messungen = []

    if projekt_id:
        selected_projekt = get_object_or_404(Projekt, pk=projekt_id)
        objekte = selected_projekt.objekte.all().order_by('name')

    if objekt_id:
        if not selected_projekt:
            selected_objekt = get_object_or_404(Objekt, pk=objekt_id)
            selected_projekt = selected_objekt.projekt
            objekte = selected_projekt.objekte.all().order_by('name')
        else:
            selected_objekt = get_object_or_404(Objekt, pk=objekt_id, projekt=selected_projekt)
        messungen = selected_objekt.messungen.all().order_by('erstellt_am')
        if messung_id:
            selected_messung = get_object_or_404(Messdaten, pk=messung_id, objekt=selected_objekt)
            messung_form = MessungForm(instance=selected_messung)
        else:
            laufnummer = selected_objekt.messungen.count() + 1
            auto_name = f"Messung {laufnummer} ({datetime.now().strftime('%Y-%m-%d')})"
            selected_messung = Messdaten.objects.create(objekt=selected_objekt, name=auto_name)
            return redirect(f"{reverse('messung:page')}?projekt={selected_projekt.id}&objekt={selected_objekt.id}&messung={selected_messung.id}")

    device_status = 'Verbunden' if DEVICE and DEVICE.is_connected else 'Nicht verbunden'
    initial_table = json.dumps(selected_messung.messdaten) if selected_messung and selected_messung.messdaten else 'null'

    context = {
        'projekte': projekte,
        'objekte': objekte,
        'selected_projekt': selected_projekt,
        'anforderungen': anforderungen_qs,
        'anforderungen_json': anforderungen_json,
        'device_warning': device_warning,
        'device_status': device_status,
        'selected_objekt': selected_objekt,
        'selected_messung': selected_messung,
        'messung_form': messung_form,
        'messungen': messungen,
        'initial_table': initial_table,
    }
    return render(request, 'messung/messung_page.html', context)


def projekte_page(request):
    projekte = Projekt.objects.all().order_by('name')
    projekt_id = request.GET.get('projekt')
    objekt_id = request.GET.get('objekt')
    messung_id = request.GET.get('messung')

    selected_projekt = get_object_or_404(Projekt, pk=projekt_id) if projekt_id else None
    selected_objekt = (
        get_object_or_404(Objekt, pk=objekt_id, projekt=selected_projekt)
        if objekt_id and selected_projekt else None
    )
    selected_messung = (
        get_object_or_404(Messdaten, pk=messung_id, objekt=selected_objekt)
        if messung_id and selected_objekt else None
    )

    objekte = selected_projekt.objekte.all().order_by('name') if selected_projekt else []
    messungen = (
        selected_objekt.messungen.all().order_by('-erstellt_am')
        if selected_objekt else []
    )

    projekt_form = ProjektForm(instance=selected_projekt) if selected_projekt else ProjektForm()
    objekt_form = None
    if selected_projekt:
        objekt_form = (
            ObjektForm(instance=selected_objekt)
            if selected_objekt
            else ObjektForm(initial={'projekt': selected_projekt})
        )
        objekt_form.fields['projekt'].queryset = Projekt.objects.filter(pk=selected_projekt.pk)
        objekt_form.fields['projekt'].widget = forms.HiddenInput()

    messung_form = None
    if selected_objekt:
        messung_form = (
            MessungForm(instance=selected_messung)
            if selected_messung
            else MessungForm()
        )

    context = {
        'projekte': projekte,
        'selected_projekt': selected_projekt,
        'projekt_form': projekt_form,
        'objekte': objekte,
        'selected_objekt': selected_objekt,
        'objekt_form': objekt_form,
        'messungen': messungen,
        'selected_messung': selected_messung,
        'messung_form': messung_form,
    }
    return render(request, 'messung/projekte_page.html', context)


def projekt_create(request):
    if request.method == 'POST':
        form = ProjektForm(request.POST)
        if form.is_valid():
            projekt = form.save()
            return redirect(f"{reverse('projekte_page')}?projekt={projekt.id}")
    return redirect('projekte_page')
def projekt_edit(request, projekt_id):
    projekt = get_object_or_404(Projekt, pk=projekt_id)
    if request.method == 'POST':
        form = ProjektForm(request.POST, instance=projekt)
        if form.is_valid():
            form.save()
    return redirect('projekte_page')


def projekt_delete(request, projekt_id):
    projekt = get_object_or_404(Projekt, pk=projekt_id)
    if request.method == 'POST':
        projekt.delete()
        return redirect('projekte_page')
    return render(request, 'messung/projekt_confirm_delete.html', {'projekt': projekt})
def objekt_edit(request, objekt_id):
    objekt = get_object_or_404(Objekt, pk=objekt_id)
    if request.method == 'POST':
        form = ObjektForm(request.POST, instance=objekt)
        if form.is_valid():
            form.save()
    return redirect('projekte_page')


def objekt_delete(request, objekt_id):
    objekt = get_object_or_404(Objekt, pk=objekt_id)
    if request.method == 'POST':
        objekt.delete()
        return redirect('projekte_page')
    return render(request, 'messung/objekt_confirm_delete.html', {'objekt': objekt})


def objekt_create(request):
    if request.method == 'POST':
        form = ObjektForm(request.POST)
        if form.is_valid():
            objekt = form.save()
            return redirect(f"{reverse('projekte_page')}?projekt={objekt.projekt.id}&objekt={objekt.id}")
    return redirect('projekte_page')


def messung_edit(request, messung_id):
    messung = get_object_or_404(Messdaten, pk=messung_id)
    if request.method == "POST":
        form = MessungForm(request.POST, instance=messung)
        if form.is_valid():
            messung_obj = form.save(commit=False)
            messdaten_json = request.POST.get('messdaten', '[]')
            try:
                messung_obj.messdaten = json.loads(messdaten_json)
            except json.JSONDecodeError:
                messung_obj.messdaten = []
            messung_obj.save()
    return redirect(f"{reverse('messung:page')}?projekt={messung.objekt.projekt.id}&objekt={messung.objekt.id}&messung={messung.id}")

def messung_delete(request, messung_id):
    messung = get_object_or_404(Messdaten, pk=messung_id)
    if request.method == 'POST':
        projekt_id = messung.objekt.projekt_id
        objekt_id = messung.objekt_id
        messung.delete()
        return redirect(f"{reverse('projekte_page')}?projekt={projekt_id}&objekt={objekt_id}")
    return render(request, 'messung/messung_confirm_delete.html', {'messung': messung})


def messung_create(request, objekt_id):
    objekt = get_object_or_404(Objekt, pk=objekt_id)
    if request.method == 'POST':
        form = MessungForm(request.POST)
        if form.is_valid():
            messung = form.save(commit=False)
            messung.objekt = objekt
            if not messung.name:
                laufnummer = objekt.messungen.count() + 1
                messung.name = f"Messung {laufnummer} ({datetime.now().strftime('%Y-%m-%d')})"
            messdaten_json = request.POST.get('messdaten', '[]')
            try:
                messung.messdaten = json.loads(messdaten_json)
            except json.JSONDecodeError:
                messung.messdaten = []
            messung.save()
            return redirect(f"{reverse('messung:page')}?projekt={objekt.projekt.id}&objekt={objekt.id}&messung={messung.id}")
    return redirect(f"{reverse('messung:page')}?projekt={objekt.projekt.id}&objekt={objekt.id}")

def create_anforderung(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            avg = data.get('avg')
            avgmod = data.get('avgmod')
            u0 = data.get('u0')
            anforderung = Anforderungen.objects.create(
                ref=data['ref'],
                typ=data.get('typ', ''),
                avg=avg if avg not in (None, '') else None,
                avgmod=avgmod if avgmod not in (None, '') else None,
                u0=u0 if u0 not in (None, '') else None,
            )
            return JsonResponse({'id': anforderung.id, 'ref': anforderung.ref})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Nur POST erlaubt'}, status=405)


def send_status_update(status_text, is_connected, is_running, device_info={}):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)('messung_group', {'type': 'status.update', 'data': {
        'text': status_text, 'is_connected': is_connected, 'is_running': is_running, 'device_info': device_info}})


def connect_device(request):
    global DEVICE
    if not DEVICE:
        DEVICE = MavoMasterDevice()
    success, message, device_info = DEVICE.connect()
    send_status_update(message, success, False, device_info)
    if success:
        return JsonResponse({'status': 'ok'})
    else:
        DEVICE = None
        return JsonResponse({'error': message}, status=500)


def start_polling(request):
    global POLLING_THREAD, DEVICE
    if DEVICE and DEVICE.is_connected:
        if POLLING_THREAD and POLLING_THREAD.is_alive():
            POLLING_THREAD.stop()
        POLLING_THREAD = RealtimePollingThread(device_instance=DEVICE)
        POLLING_THREAD.start()
        return JsonResponse({'status': 'Polling gestartet'})
    return JsonResponse({'error': 'Gerät nicht verbunden'}, status=400)


def stop_polling(request):
    global POLLING_THREAD
    if POLLING_THREAD and POLLING_THREAD.is_alive():
        POLLING_THREAD.stop()
        POLLING_THREAD = None
        return JsonResponse({'status': 'Polling gestoppt'})
    return JsonResponse({'status': 'Kein Polling aktiv'})


def single_measurement(request):
    global DEVICE
    if not (DEVICE and DEVICE.is_connected):
        return JsonResponse({'error': 'Gerät nicht verbunden'}, status=400)
    try:
        value, unit = DEVICE.get_value()
        timestamp = time.strftime('%H:%M:%S')
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)('messung_group', {'type': 'measurement.value', 'data': {
            'value': value, 'unit': unit, 'time': timestamp, 'is_sequence': False}})
        return JsonResponse({'status': 'ok'})
    except ConnectionError as e:
        send_status_update(f"Fehler: {e}", False, False)
        DEVICE = None
        return JsonResponse({'error': str(e)}, status=500)


def start_sequence(request):
    global MEASUREMENT_THREAD, DEVICE
    if not (DEVICE and DEVICE.is_connected):
        return JsonResponse({'error': 'Gerät nicht verbunden'}, status=400)
    if MEASUREMENT_THREAD and MEASUREMENT_THREAD.is_alive():
        return JsonResponse({'error': 'Messreihe läuft bereits'}, status=400)
    sequenz_name = request.GET.get('name', '')
    try:
        interval = int(request.GET.get('interval', 1))
        count = int(request.GET.get('count', 10))
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Ungültige Parameter'}, status=400)
    MEASUREMENT_THREAD = MeasurementThread(interval=interval, count=count, sequenz_name=sequenz_name, device_instance=DEVICE)
    MEASUREMENT_THREAD.start()
    send_status_update("Messreihe gestartet...", True, True, device_info=DEVICE.device_info)
    return JsonResponse({'status': 'ok'})


def stop_sequence(request):
    global MEASUREMENT_THREAD, DEVICE
    if not (MEASUREMENT_THREAD and MEASUREMENT_THREAD.is_alive()):
        return JsonResponse({'error': 'Keine Messreihe zum Stoppen'}, status=400)
    MEASUREMENT_THREAD.stop()
    send_status_update("Messreihe gestoppt.", True, False, device_info=DEVICE.device_info)
    return JsonResponse({'status': 'ok'})


def reset_data(request):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)('messung_group', {'type': 'data.reset', 'data': {'scope': 'all'}})
    return JsonResponse({'status': 'ok'})


def save_messungen(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Nur POST erlaubt'}, status=405)
    data = json.loads(request.body)
    objekt_id = data.get('objekt_id')
    messungen_data = data.get('messungen', [])
    device_info = data.get('device_info', '')
    anforderung_id = data.get('anforderung_id')
    messbedingungen = data.get('messbedingungen', '')
    messhoehe = data.get('messhoehe')
    if messhoehe in (None, ''):
        messhoehe = 0.75
    if not objekt_id or not messungen_data:
        return JsonResponse({'error': 'Fehlende Daten'}, status=400)
    try:
        objekt_instanz = Objekt.objects.get(pk=objekt_id)
        anforderung_instanz = Anforderungen.objects.get(pk=anforderung_id) if anforderung_id else None
        saved_count = 0
        for messung in messungen_data:
            data_points = messung.get('data') or messung.get('messdaten')
            if not data_points:
                continue
            Messdaten.objects.create(
                objekt=objekt_instanz,
                anforderung=anforderung_instanz,
                name=messung.get('name'),
                messdaten=data_points,
                device=device_info,
                einheit=messung.get('einheit', ''),
                messbedingungen=messbedingungen,
                messhoehe=messhoehe,
            )
            saved_count += 1
        return JsonResponse({'status': f'{saved_count} Messung(en) erfolgreich gespeichert'})
    except (Objekt.DoesNotExist, Anforderungen.DoesNotExist):
        return JsonResponse({'error': 'Objekt oder Anforderung nicht gefunden'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def export_messungen_xlsx(request, objekt_id):
    objekt = get_object_or_404(Objekt, pk=objekt_id)
    messungen = objekt.messungen.all().order_by('erstellt_am')
    if not messungen.exists():
        return HttpResponse("Für dieses Objekt gibt es keine Messungen zum Exportieren.", status=404)
    wb = Workbook()
    ws_druck = wb.active
    ws_druck.title = "Druck"
    ws_druck['B1'] = "Messprotokoll"
    ws_druck['B1'].font = Font(bold=True, size=14)
    ws_druck['R1'] = datetime.now().strftime('%Y-%m-%d')
    ws_druck['B2'] = f"{objekt.projekt.code} {objekt.projekt.name}"
    ws_druck['B3'] = f"{objekt.nummer} {objekt.name}"
    first_messung = messungen.first()
    ws_druck['B4'] = "Messbedingungen:"
    ws_druck['D4'] = first_messung.messbedingungen or ""
    ws_druck['B5'] = "Messhöhe:"
    ws_druck['D5'] = f"{first_messung.messhoehe} m" if first_messung.messhoehe is not None else "N/A"
    headers_druck = ['C60', 'D60', 'E60', 'F60']
    ws_druck['C60'], ws_druck['D60'], ws_druck['E60'], ws_druck['F60'] = "Mittelwert", "Min", "Max", "U0"
    for cell_coord in headers_druck:
        ws_druck[cell_coord].font = Font(bold=True)
        ws_druck[cell_coord].alignment = Alignment(horizontal='center')
    row_num = 61
    for messung in messungen:
        ws_druck[f'A{row_num}'] = messung.name or ""
        ws_druck[f'B{row_num}'] = messung.anforderung.ref if messung.anforderung else ""
        punkte = messung.messdaten
        if isinstance(punkte, dict):
            punkte = punkte.get('data', [])
        werte = [float(p.get('value')) for p in punkte if p.get('value') not in (None, '')]
        if werte:
            avg = sum(werte) / len(werte)
            min_wert = min(werte)
            max_wert = max(werte)
            u0 = min_wert / avg if avg else None
        else:
            avg = min_wert = max_wert = u0 = None
        ws_druck[f'C{row_num}'] = avg
        ws_druck[f'D{row_num}'] = min_wert
        ws_druck[f'E{row_num}'] = max_wert
        ws_druck[f'F{row_num}'] = u0
        row_num += 1
    ws_daten = wb.create_sheet(title="Messdaten")
    headers_daten = ["Zeit"]
    namen = [m.name for m in messungen]
    for n in namen:
        headers_daten.extend([n, "Kommentar"])
    ws_daten.append(headers_daten)
    daten_pro_zeit = {}
    for messung in messungen:
        punkte = messung.messdaten
        if isinstance(punkte, dict):
            punkte = punkte.get('data', [])
        for punkt in punkte:
            zeit = punkt.get('time')
            if not zeit:
                continue
            if zeit not in daten_pro_zeit:
                daten_pro_zeit[zeit] = {}
            daten_pro_zeit[zeit][messung.name] = punkt.get('value', '')
            daten_pro_zeit[zeit][f"{messung.name}_comment"] = punkt.get('comment', '')
    for zeit in sorted(daten_pro_zeit.keys()):
        row_data = [zeit]
        for n in namen:
            row_data.append(daten_pro_zeit[zeit].get(n, ''))
            row_data.append(daten_pro_zeit[zeit].get(f"{n}_comment", ''))
        ws_daten.append(row_data)
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    safe_filename = "".join([c for c in objekt.name if c.isalpha() or c.isdigit() or c.isspace()]).rstrip().replace(" ", "_")
    response['Content-Disposition'] = f'attachment; filename="Messprotokoll_{safe_filename}.xlsx"'
    with BytesIO() as b:
        wb.save(b)
        response.write(b.getvalue())
    return response
