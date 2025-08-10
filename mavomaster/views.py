# from django.http import HttpResponse
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
import subprocess


def hompage(request):
    # return HttpResponse('Hello Wolrd')
    return render(request, 'home.html')


def reboot_pi(request):
    if request.method == 'POST':
        try:
            # Führt den Befehl mit sudo aus (erfordert sudoers-Konfiguration)
            subprocess.run(['sudo', '/sbin/reboot'], check=True)
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(status=500, reason=str(e))
    return HttpResponse(status=405)


def shutdown_pi(request):
    if request.method == 'POST':
        try:
            subprocess.run(['sudo', '/sbin/shutdown', '-h', 'now'], check=True)
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(status=500, reason=str(e))
    return HttpResponse(status=405)
