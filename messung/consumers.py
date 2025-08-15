import json
from channels.generic.websocket import AsyncWebsocketConsumer

class MeasurementConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'messung_group'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("MESSUNG: Client verbunden.")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("MESSUNG: Client getrennt.")

    async def _send_message(self, event):
        """Eine generische Methode, um Nachrichten zu senden."""
        await self.send(text_data=json.dumps({
            'type': event['type'],
            'data': event.get('data', {})
        }))

    # Handler für die verschiedenen Nachrichtentypen
    async def status_update(self, event): await self._send_message(event)
    async def measurement_value(self, event): await self._send_message(event)
    async def sequence_start(self, event): await self._send_message(event)
    async def sequence_end(self, event): await self._send_message(event)
    async def data_reset(self, event): await self._send_message(event)
    async def realtime_value(self, event): await self._send_message(event)