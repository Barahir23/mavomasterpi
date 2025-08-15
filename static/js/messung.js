// Hinweis: Keine Browser-Prompts zur Sicherstellung der mobilen Kompatibilität.
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
    const headerRow = document.querySelector('.measurement-table thead tr');

    const seqSelect = document.getElementById('sequence-select');
    const seqAddBtn = document.getElementById('sequence-add');
    const sequences = {};
    const sequenceOrder = [];
    let seqCounter = 0;
    let activeSeqKey = null;
    let saveBtn = null;
    const intervalInput = document.getElementById('sequence-interval');
    const countInput = document.getElementById('sequence-count');
    const durationSpan = document.getElementById('sequence-duration');
    const countdownSpan = document.getElementById('sequence-countdown');
    const countdownOverlay = document.getElementById('sequence-overlay');
    let countdownTimer = null;
    let nameField = null;

    function updateDuration() {
      if (durationSpan && intervalInput && countInput) {
        const interval = parseInt(intervalInput.value, 10) || 0;
        const count = parseInt(countInput.value, 10) || 0;
        durationSpan.textContent = `Dauer: ${interval * count}s`;
      }
    }
    function startCountdown(sec) {
      if (!countdownSpan) return;
      if (countdownOverlay) countdownOverlay.style.display = 'flex';
      clearInterval(countdownTimer);
      let remaining = sec;
      countdownSpan.textContent = remaining;
      countdownTimer = setInterval(() => {
        remaining--;
        countdownSpan.textContent = remaining;
        if (remaining <= 0) clearInterval(countdownTimer);
      }, 1000);
    }
    function stopCountdown() {
      clearInterval(countdownTimer);
      if (countdownSpan) countdownSpan.textContent = '';
      if (countdownOverlay) countdownOverlay.style.display = 'none';
    }
    if (intervalInput) intervalInput.addEventListener('input', updateDuration);
    if (countInput) countInput.addEventListener('input', updateDuration);
    updateDuration();

    function autoSeqName() {
      const date = new Date().toISOString().split('T')[0];
      const laufnummer = Object.keys(sequences).length + 1;
      return `Messung ${laufnummer} (${date})`;
    }

    function addSequenceColumn(name) {
      const key = `seq${++seqCounter}`;
      sequenceOrder.push(key);
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = name || autoSeqName();
      th.appendChild(input);
      headerRow.insertBefore(th, headerRow.querySelector('.delete-column'));
      Array.from(tableBody.rows).forEach(row => {
        row.insertBefore(document.createElement('td'), row.lastElementChild);
      });
      const option = document.createElement('option');
      option.value = key;
      option.textContent = input.value;
      seqSelect.appendChild(option);
      sequences[key] = { input, option, id: null };
      input.addEventListener('input', () => {
        option.textContent = input.value;
        if (key === activeSeqKey && nameField) {
          nameField.value = input.value;
        }
      });
      seqSelect.value = key;
      activeSeqKey = key;
      if (nameField) nameField.value = input.value;
      return key;
    }

    function appendRow(time, value, seqKey, comment = '') {
      const row = document.createElement('tr');
      const timeTd = document.createElement('td');
      timeTd.textContent = time;
      row.appendChild(timeTd);
      const singleTd = document.createElement('td');
      row.appendChild(singleTd);
      const commentTd = document.createElement('td');
      const commentInput = document.createElement('input');
      commentInput.type = 'text';
      commentInput.value = comment;
      commentTd.appendChild(commentInput);
      row.appendChild(commentTd);
      sequenceOrder.forEach(() => {
        row.appendChild(document.createElement('td'));
      });
      const deleteTd = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn delete-row';
      delBtn.innerHTML = '<span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M14.7404 9L14.3942 18M9.60577 18L9.25962 9M19.2276 5.79057C19.5696 5.84221 19.9104 5.89747 20.25 5.95629M19.2276 5.79057L18.1598 19.6726C18.0696 20.8448 17.0921 21.75 15.9164 21.75H8.08357C6.90786 21.75 5.93037 20.8448 5.8402 19.6726L4.77235 5.79057M19.2276 5.79057C18.0812 5.61744 16.9215 5.48485 15.75 5.39432M3.75 5.95629C4.08957 5.89747 4.43037 5.84221 4.77235 5.79057M4.77235 5.79057C5.91878 5.61744 7.07849 5.48485 8.25 5.39432M15.75 5.39432V4.47819C15.75 3.29882 14.8393 2.31423 13.6606 2.27652C13.1092 2.25889 12.5556 2.25 12 2.25C11.4444 2.25 10.8908 2.25889 10.3394 2.27652C9.16065 2.31423 8.25 3.29882 8.25 4.47819V5.39432M15.75 5.39432C14.5126 5.2987 13.262 5.25 12 5.25C10.738 5.25 9.48744 5.2987 8.25 5.39432" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      delBtn.addEventListener('click', () => {
        if (window.mmModal && window.mmModal.open) {
          window.mmModal.open({
            title: 'Messwert löschen?',
            text: 'Soll der Messwert entfernt werden?',
            okText: 'Löschen',
            onConfirm: () => row.remove()
          });
        } else {
          row.remove();
        }
      });
      deleteTd.appendChild(delBtn);
      row.appendChild(deleteTd);
      const formatted = Number(value).toFixed(2);
      if (seqKey) {
        const idx = sequenceOrder.indexOf(seqKey);
        if (idx !== -1) {
          row.children[3 + idx].textContent = formatted;
        }
      } else {
        singleTd.textContent = formatted;
      }
      tableBody.appendChild(row);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.add('unsaved');
      }
    }

    const initialTable = window.initialTable;
    if (initialTable && initialTable.sequences) {
      initialTable.sequences.forEach(name => addSequenceColumn(name));
      initialTable.data.forEach(pt => {
        appendRow(pt.time || '', pt.single || '', null, pt.comment || '');
        const row = tableBody.lastElementChild;
        sequenceOrder.forEach((key, idx) => {
          const val = pt.sequences ? pt.sequences[idx] : null;
          if (val !== null && val !== undefined && val !== '') {
            row.children[3 + idx].textContent = Number(val).toFixed(2);
          }
        });
      });
      if (sequenceOrder.length) {
        activeSeqKey = sequenceOrder[sequenceOrder.length - 1];
        seqSelect.value = activeSeqKey;
        if (nameField) nameField.value = sequences[activeSeqKey].input.value;
      }
    } else {
      addSequenceColumn();
    }

    if (seqAddBtn && seqSelect) {
      seqAddBtn.addEventListener('click', () => {
        const key = addSequenceColumn();
        if (nameField) nameField.value = sequences[key].input.value;
      });
      seqSelect.addEventListener('change', () => {
        activeSeqKey = seqSelect.value;
        if (nameField && sequences[activeSeqKey]) {
          nameField.value = sequences[activeSeqKey].input.value;
        }
      });
    }

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${wsScheme}://${window.location.host}/ws/messung/`);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status.update' && statusSpan) {
        statusSpan.textContent = msg.data.text;
      } else if (msg.type === 'realtime.value' && realtimeSpan) {
        realtimeSpan.textContent = Number(msg.data.value).toFixed(2);
      } else if (msg.type === 'sequence.start') {
        if (activeSeqKey && sequences[activeSeqKey]) {
          sequences[activeSeqKey].id = msg.data.id;
          const interval = parseInt(intervalInput?.value, 10) || 5;
          startCountdown(interval);
        }
      } else if (msg.type === 'measurement.value' && tableBody) {
        const seqKey = msg.data.is_sequence ? sequenceOrder.find(k => sequences[k].id === msg.data.sequence_id) : null;
        appendRow(msg.data.time, msg.data.value, seqKey);
        if (msg.data.is_sequence) {
          const interval = parseInt(intervalInput?.value, 10) || 5;
          startCountdown(interval);
        }
      } else if (msg.type === 'sequence.end') {
        stopCountdown();
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
        if (seqSelect && seqSelect.value) {
          activeSeqKey = seqSelect.value;
          const name = sequences[activeSeqKey]?.input.value || '';
          const interval = parseInt(intervalInput?.value, 10) || 5;
          const count = parseInt(countInput?.value, 10) || 5;
          fetch(`/messung/api/start/?name=${encodeURIComponent(name)}&interval=${interval}&count=${count}`).catch(err => console.error(err));
        }
      });
    }

    const seqStopBtn = document.getElementById('sequence-stop');
    if (seqStopBtn) {
      seqStopBtn.addEventListener('click', () => {
        fetch('/messung/api/stop/').catch(err => console.error(err));
        stopCountdown();
      });
    }

    const editForm = document.getElementById('messung-edit-form');
    if (editForm) {
      saveBtn = editForm.querySelector('.save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        editForm.addEventListener('input', () => {
          saveBtn.disabled = false;
          saveBtn.classList.add('unsaved');
        });
        editForm.addEventListener('submit', () => {
          const hidden = document.getElementById('messdaten-input');
          if (hidden) {
            const rows = [];
            Array.from(tableBody.rows).forEach(row => {
              const time = row.children[0].textContent.trim();
              const singleText = row.children[1].textContent;
              const comment = row.children[2].querySelector('input').value;
              const seqVals = sequenceOrder.map((key, idx) => {
                const cellText = row.children[3 + idx].textContent;
                return cellText === '' ? null : parseFloat(cellText);
              });
              if (time || singleText !== '' || seqVals.some(v => v !== null) || comment) {
                rows.push({
                  time,
                  single: singleText === '' ? null : parseFloat(singleText),
                  sequences: seqVals,
                  comment
                });
              }
            });
            const seqNames = sequenceOrder.map(key => sequences[key].input.value);
            hidden.value = JSON.stringify({ sequences: seqNames, data: rows });
          }
          saveBtn.classList.remove('unsaved');
          saveBtn.disabled = true;
        });
      }

      const messungSelect = document.getElementById('messung-select');
      if (messungSelect) {
        messungSelect.addEventListener('change', e => {
          const id = e.target.value;
          const params = new URLSearchParams(window.location.search);
          if (id) {
            params.set('messung', id);
          } else {
            params.delete('messung');
          }
          window.location.search = params.toString();
        });
      }

      const newBtn = editForm.querySelector('.new-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => {
          const url = editForm.dataset.createUrl;
          const csrf = editForm.querySelector('input[name=csrfmiddlewaretoken]').value;
          const tmpForm = document.createElement('form');
          tmpForm.method = 'post';
          tmpForm.action = url;
          const csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrfmiddlewaretoken';
          csrfInput.value = csrf;
          tmpForm.appendChild(csrfInput);
          document.body.appendChild(tmpForm);
          tmpForm.submit();
        });
      }

      nameField = editForm.querySelector('#id_name');
      if (nameField) {
        if (activeSeqKey && sequences[activeSeqKey]) {
          nameField.value = sequences[activeSeqKey].input.value;
        }
        nameField.addEventListener('input', () => {
          if (activeSeqKey && sequences[activeSeqKey]) {
            sequences[activeSeqKey].input.value = nameField.value;
            sequences[activeSeqKey].option.textContent = nameField.value;
          }
        });
      }
    }
  });

