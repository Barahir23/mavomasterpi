import time
import threading
import math
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import serial
import serial.tools.list_ports

MEASUREMENT_THREAD = None
POLLING_THREAD = None
DEVICE = None


class MavoMasterDevice:
    def __init__(self):
        self.port = None
        self.ser = None
        self.is_connected = False
        self.error_message = ""
        self.device_info = {}

    def find_device(self):
        query = 'VID:PID=1CD7:4003'
        print("Suche nach MavoMaster...")
        for port_info in serial.tools.list_ports.comports():
            if port_info.hwid and query in port_info.hwid:
                self.port = port_info.device
                print(f"Gerät gefunden an Port: {self.port}")
                return True
        self.error_message = "Kein MavoMaster gefunden."
        print(self.error_message)
        return False

    def connect(self):
        if self.is_connected:
            return True, "Bereits verbunden.", self.device_info
        if not self.find_device():
            return False, self.error_message, {}
        try:
            self.ser = serial.Serial(self.port, baudrate=115200, timeout=0.5)
            self.is_connected = True
            try:
                self.ser.write(b'*idn?\r')
                full_response = self.ser.read(200).decode().strip()
                parts = full_response.split('\r')
                line1 = parts[0].strip() if len(parts) > 0 else "ID Zeile 1 nicht lesbar"
                line2 = parts[1].strip() if len(parts) > 1 else ""
                self.device_info = {"line1": line1, "line2": line2}
                print(f"Geräte-ID: {self.device_info}")
            except Exception as e:
                self.device_info = {"line1": "ID konnte nicht gelesen werden", "line2": ""}
                print(f"Fehler beim Lesen der Geräte-ID: {e}")
            print("Verbindung zum MavoMaster hergestellt.")
            return True, "Gerät erfolgreich verbunden.", self.device_info
        except serial.SerialException as e:
            self.error_message = f"Verbindungsfehler: {e}"
            print(self.error_message)
            return False, self.error_message, {}

    def disconnect(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
        self.is_connected = False
        print("Verbindung zum MavoMaster getrennt.")

    def get_value(self):
        if not self.is_connected or not self.ser:
            raise ConnectionError("Gerät ist nicht verbunden.")
        try:
            self.ser.write(b'?\r')
            response_str = self.ser.read_until(b'\r').decode().strip()
            if not response_str:
                raise ValueError("Keine Antwort vom Gerät.")
            parts = response_str.split(' ')
            wert = float(parts[0])
            einheit = parts[1] if len(parts) > 1 else 'N/A'
            return wert, einheit
        except (serial.SerialException, ValueError, IndexError) as e:
            print(f"Fehler beim Lesen: {e}")
            self.disconnect()
            raise ConnectionError(f"Kommunikationsfehler: {e}")


class MeasurementThread(threading.Thread):
    def __init__(self, interval, count, sequenz_name, device_instance):
        super().__init__()
        self.daemon = True
        self._stop_event = threading.Event()
        self.channel_layer = get_channel_layer()
        self.interval = interval
        self.count = count
        self.sequenz_name = sequenz_name if sequenz_name else f"Messreihe_{int(time.time())}"
        self.sequence_id = f"seq_{int(time.time())}"
        self.device = device_instance

    def stop(self):
        self._stop_event.set()

    def run(self):
        print(f"Mess-Thread gestartet: '{self.sequenz_name}'")
        async_to_sync(self.channel_layer.group_send)('messung_group',
                                                     {'type': 'sequence.start', 'data': {'id': self.sequence_id, 'name': self.sequenz_name}})
        for i in range(self.count):
            if self._stop_event.is_set():
                break
            time.sleep(self.interval)
            if self._stop_event.is_set():
                break
            try:
                value, unit = self.device.get_value()
                timestamp = time.strftime('%H:%M:%S')
                message = {'type': 'measurement.value', 'data': {'value': value, 'unit': unit,
                                                                 'time': timestamp, 'sequence_id': self.sequence_id, 'is_sequence': True}}
                async_to_sync(self.channel_layer.group_send)('messung_group', message)
            except ConnectionError as e:
                print(f"Fehler im Mess-Thread: {e}")
                break
        async_to_sync(self.channel_layer.group_send)('messung_group', {'type': 'sequence.end', 'data': {'id': self.sequence_id}})
        print("Mess-Thread beendet.")


class RealtimePollingThread(threading.Thread):
    def __init__(self, device_instance):
        super().__init__()
        self.daemon = True
        self._stop_event = threading.Event()
        self.channel_layer = get_channel_layer()
        self.device = device_instance

    def stop(self):
        self._stop_event.set()

    def run(self):
        print("Echtzeit-Polling-Thread gestartet.")
        retry_count = 0
        while not self._stop_event.is_set():
            try:
                value, unit = self.device.get_value()
                message = {'type': 'realtime.value', 'data': {'value': value, 'unit': unit}}
                async_to_sync(self.channel_layer.group_send)('messung_group', message)
                retry_count = 0
            except ConnectionError as e:
                print(f"Fehler im Polling-Thread: {e}")
                retry_count += 1
                success, msg, info = self.device.connect()
                if success:
                    async_to_sync(self.channel_layer.group_send)(
                        'messung_group',
                        {'type': 'status.update', 'data': {'text': msg, 'is_connected': True, 'is_running': False, 'device_info': info}}
                    )
                    retry_count = 0
                elif retry_count >= 5:
                    async_to_sync(self.channel_layer.group_send)(
                        'messung_group',
                        {'type': 'status.update', 'data': {'text': 'Geräteverbindung verloren', 'is_connected': False, 'is_running': False}}
                    )
                    break
            time.sleep(1)
        print("Echtzeit-Polling-Thread beendet.")
