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
    path('api/projekte/create/', views.create_projekt, name='create_projekt'),
    path('api/projekte/<int:projekt_id>/details/', views.projekt_details, name='projekt_details'),
    path('api/projekte/<int:projekt_id>/update/', views.update_projekt, name='update_projekt'),
    path('api/projekte/<int:projekt_id>/delete/', views.delete_projekt, name='delete_projekt'),
    path('api/projekte/<int:projekt_id>/objekte/', views.get_objekte_for_projekt, name='get_objekte_for_projekt'),
    path('api/projekte/<int:projekt_id>/objekte/create/', views.create_objekt, name='create_objekt'),
    path('api/objekte/<int:objekt_id>/details/', views.objekt_details, name='objekt_details'),
    path('api/objekte/<int:objekt_id>/update/', views.update_objekt, name='update_objekt'),
    path('api/objekte/<int:objekt_id>/delete/', views.delete_objekt, name='delete_objekt'),
    path('api/anforderungen/create/', views.create_anforderung, name='create_anforderung'),
]
