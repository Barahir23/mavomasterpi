#!/bin/bash
python manage.py collectstatic --noinput
systemctl restart daphne
echo 'neu gestartet'