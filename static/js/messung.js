// page-specific scripts

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('selection-form');
  const projectSelect = document.getElementById('project-select');
  const objectSelect = document.getElementById('object-select');

  if (projectSelect && form) {
    projectSelect.addEventListener('change', () => {
      if (objectSelect) {
        objectSelect.disabled = true;
        objectSelect.selectedIndex = 0;
      }
      form.submit();
    });
  }

  if (objectSelect && form) {
    objectSelect.addEventListener('change', () => {
      form.submit();
    });
  }

  const statusSpan = document.getElementById('device-status');
  const realtimeSpan = document.getElementById('realtime-value');
  const tableBody = document.getElementById('measurement-table-body');

  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${wsScheme}://${window.location.host}/ws/messung/`);

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'status.update' && statusSpan) {
      statusSpan.textContent = msg.data.text;
    } else if (msg.type === 'realtime.value' && realtimeSpan) {
      realtimeSpan.textContent = Number(msg.data.value).toFixed(2);
    } else if (msg.type === 'measurement.value' && tableBody) {
      const value = Number(msg.data.value).toFixed(2);
      const row = document.createElement('tr');
      row.innerHTML = `<td>${msg.data.time}</td><td>${value}</td><td></td><td></td><td></td>`;
      tableBody.appendChild(row);
    }
  };

  const connectBtn = document.getElementById('device-connect');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      fetch('/messung/api/connect/')
        .then(() => fetch('/messung/api/polling/start/'))
        .catch(err => console.error(err));
    });
  }

  const singleBtn = document.getElementById('single-measure');
  if (singleBtn) {
    singleBtn.addEventListener('click', () => {
      fetch('/messung/api/single/').catch(err => console.error(err));
    });
  }

  const seqStartBtn = document.getElementById('sequence-start');
  if (seqStartBtn) {
    seqStartBtn.addEventListener('click', () => {
      fetch('/messung/api/start/').catch(err => console.error(err));
    });
  }

  const seqStopBtn = document.getElementById('sequence-stop');
  if (seqStopBtn) {
    seqStopBtn.addEventListener('click', () => {
      fetch('/messung/api/stop/').catch(err => console.error(err));
    });
  }
});

