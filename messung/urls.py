from django.urls import path
from . import views

app_name = 'messung'

urlpatterns = [
    path('', views.messung_page, name='page'),
    path('api/connect/', views.connect_device, name='connect_device'),
    path('api/single/', views.single_measurement, name='single_measurement'),
    path('api/start/', views.start_sequence, name='start_sequence'),
    path('api/stop/', views.stop_sequence, name='stop_sequence'),
    path('api/reset/', views.reset_data, name='reset_data'),
    path('api/save/', views.save_messungen, name='save_messungen'),
    path('api/polling/start/', views.start_polling, name='start_polling'),
    path('api/polling/stop/', views.stop_polling, name='stop_polling'),
    path('api/objekte/<int:objekt_id>/export/', views.export_messungen_xlsx, name='export_xlsx'),
    path('api/anforderungen/create/', views.create_anforderung, name='create_anforderung'),
]
