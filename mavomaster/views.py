# from django.http import HttpResponse
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
import subprocess


def hompage(request):
    # return HttpResponse('Hello Wolrd')
    return render(request, 'home.html')


@require_POST
def system_reboot(request):
    try:
        # nutzt sudo; siehe sudoers-Hinweis unten
        subprocess.Popen(['sudo', '/sbin/reboot'])
        return JsonResponse({'ok': True})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
def system_shutdown(request):
    try:
        subprocess.Popen(['sudo', '/sbin/shutdown', '-h', 'now'])
        return JsonResponse({'ok': True})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)
