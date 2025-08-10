"""
ASGI config for mavomaster project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import counter.routing
import messung.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mavomaster.settings')

application = ProtocolTypeRouter({
    # HTTP-Anfragen werden weiterhin von Django normal behandelt
    "http": get_asgi_application(),

    # WebSocket-Anfragen werden an unser eigenes Routing weitergeleitet
    "websocket": AuthMiddlewareStack(
        URLRouter(
            counter.routing.websocket_urlpatterns + messung.routing.websocket_urlpatterns
        )
    ),
})
