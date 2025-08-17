import { toggleCommentColumn, computeArrayStats, getColumnValues, computeStatsFormatted } from './table_utils.js';

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
  const noSleep = new NoSleep();
  let wakeLock = null;
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        if (!wakeLock) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
      } catch {
        noSleep.enable();
      }
    }
  });

  const statusSpan = document.getElementById('device-status');
  const realtimeSpan = document.getElementById('realtime-value');
  const tableBody = document.getElementById('measurement-table-body');
  const headerRow = document.querySelector('.measurement-table thead tr');
  const colGroup = document.getElementById('measurement-colgroup');

  const sequences = {};
  const sequenceOrder = [];
  let seqCounter = 0;
  let activeSeqKey = null;
  let saveBtn = null;

  const nf2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('de-CH');
    const eyeIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M2.03555 12.3224C1.96647 12.1151 1.9664 11.8907 2.03536 11.6834C3.42372 7.50972 7.36079 4.5 12.0008 4.5C16.6387 4.5 20.5742 7.50692 21.9643 11.6776C22.0334 11.8849 22.0335 12.1093 21.9645 12.3166C20.5761 16.4903 16.6391 19.5 11.9991 19.5C7.36119 19.5 3.42564 16.4931 2.03555 12.3224Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path class="svg-icon" stroke="var(--svg-icon)" d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    const eyeSlashIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M3.97993 8.22257C3.05683 9.31382 2.35242 10.596 1.93436 12.0015C3.22565 16.338 7.24311 19.5 11.9991 19.5C12.9917 19.5 13.9521 19.3623 14.8623 19.1049M6.22763 6.22763C7.88389 5.13558 9.86771 4.5 12 4.5C16.756 4.5 20.7734 7.66205 22.0647 11.9985C21.3528 14.3919 19.8106 16.4277 17.772 17.772M6.22763 6.22763L3 3M6.22763 6.22763L9.87868 9.87868M17.772 17.772L21 21M17.772 17.772L14.1213 14.1213M14.1213 14.1213C14.6642 13.5784 15 12.8284 15 12C15 10.3431 13.6569 9 12 9C11.1716 9 10.4216 9.33579 9.87868 9.87868M14.1213 14.1213L9.87868 9.87868"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

    const columnMenu = document.getElementById('column-context-menu');
    if (columnMenu) {
      document.body.appendChild(columnMenu);
      columnMenu.style.display = 'none';
    }
    const statsBody = columnMenu ? columnMenu.querySelector('tbody') : null;

    let statsTimer = null;
    document.addEventListener('click', () => {
      if (columnMenu) columnMenu.style.display = 'none';
      clearInterval(statsTimer);
    });

    if (headerRow && columnMenu) {
      const updateStats = () => {
        if (!statsBody) return;
        const html = sequenceOrder
          .map((key, i) => {
            const colIdx = 1 + i * 2;
            const th = headerRow.children[colIdx];
            const nameInput = th.querySelector('input');
            const name = nameInput ? nameInput.value : th.textContent.trim();
            const stats = computeStatsFormatted(tableBody, colIdx, nf2);
            return `<tr><td>${name}</td><td>${stats.avg}</td><td>${stats.min}</td><td>${stats.max}</td><td>${stats.u0}</td></tr>`;
          })
          .join('');
        statsBody.innerHTML = html;
      };
      headerRow.addEventListener('contextmenu', e => {
        const th = e.target.closest('th');
        if (!th || !th.classList.contains('measurement-column')) return;
        const colIdx = Array.from(headerRow.children).indexOf(th);
        if (getColumnValues(tableBody, colIdx).length === 0) return;
        e.preventDefault();
        updateStats();
        columnMenu.style.left = `${e.pageX}px`;
        columnMenu.style.top = `${e.pageY}px`;
        columnMenu.style.display = 'block';
        clearInterval(statsTimer);
        statsTimer = setInterval(updateStats, 500);
      });
    }

    const seqSelect = document.getElementById('sequence-select');
    const seqAddBtn = document.getElementById('sequence-add');
    function markUnsaved() {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.add('unsaved');
      }
    }
    const intervalInput = document.getElementById('sequence-interval');
    const countInput = document.getElementById('sequence-count');
    const intervalDisplay = document.getElementById('sequence-interval-display');
    const countDisplay = document.getElementById('sequence-count-display');
    const durationSpan = document.getElementById('sequence-duration');
    const countdownSpan = document.getElementById('sequence-countdown');
    const countdownOverlay = document.getElementById('sequence-overlay');
    let countdownTimer = null;

    function updateDuration() {
      if (durationSpan && intervalInput && countInput) {
        const interval = parseInt(intervalInput.value, 10) || 0;
        const count = parseInt(countInput.value, 10) || 0;
        durationSpan.textContent = `Dauer: ${nf0.format(interval * count)}s`;
        if (intervalDisplay) intervalDisplay.textContent = nf0.format(interval);
        if (countDisplay) countDisplay.textContent = nf0.format(count);
      }
    }
    function startCountdown(sec) {
      if (!countdownSpan) return;
      if (countdownOverlay) countdownOverlay.style.display = 'flex';
      clearInterval(countdownTimer);
      let remaining = sec;
      countdownSpan.textContent = nf0.format(remaining);
      countdownTimer = setInterval(() => {
        remaining--;
        countdownSpan.textContent = nf0.format(remaining);
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
      return `Messreihe ${nf0.format(laufnummer)} (${date})`;
    }
    function cleanupEmptyRows() {
      Array.from(tableBody.rows).forEach(row => {
        const hasValue = sequenceOrder.some((_, i) => {
          const cell = row.children[1 + i * 2];
          return cell && cell.textContent !== '';
        });
        if (!hasValue) row.remove();
      });
    }
    function removeSequenceColumn(key) {
      const idx = sequenceOrder.indexOf(key);
      if (idx === -1) return;
      const colIdx = 1 + idx * 2;
      headerRow.removeChild(headerRow.children[colIdx]);
      headerRow.removeChild(headerRow.children[colIdx]);
      if (colGroup) {
        colGroup.removeChild(colGroup.children[colIdx]);
        colGroup.removeChild(colGroup.children[colIdx]);
      }
      Array.from(tableBody.rows).forEach(row => {
        row.removeChild(row.children[colIdx]);
        row.removeChild(row.children[colIdx]);
      });
      sequences[key].option.remove();
      delete sequences[key];
      sequenceOrder.splice(idx, 1);
      headerRow.querySelectorAll('.comment-toggle').forEach((btn, i) => {
        btn.dataset.index = i;
      });
      cleanupEmptyRows();
      activeSeqKey = sequenceOrder[sequenceOrder.length - 1] || null;
      if (seqSelect) seqSelect.value = activeSeqKey || '';
      markUnsaved();
    }

      function addSequenceColumn(name) {
        const key = `seq${++seqCounter}`;
        sequenceOrder.push(key);
        const measIdx = sequenceOrder.length - 1;

        const fillerCol = colGroup.querySelector('.filler-column');
        const valCol = document.createElement('col');
        valCol.className = 'value-column';
        colGroup.insertBefore(valCol, fillerCol);
        const commentCol = document.createElement('col');
        commentCol.className = 'comment-column';
        commentCol.style.visibility = 'collapse';
        colGroup.insertBefore(commentCol, fillerCol);

        const thVal = document.createElement('th');
        thVal.classList.add('measurement-column');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = name || autoSeqName();
        thVal.appendChild(input);
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'icon-btn delete-sequence';
        delBtn.innerHTML = '<span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M14.7404 9L14.3942 18M9.60577 18L9.25962 9M19.2276 5.79057C19.5696 5.84221 19.9104 5.89747 20.25 5.95629M19.2276 5.79057L18.1598 19.6726C18.0696 20.8448 17.0921 21.75 15.9164 21.75H8.08357C6.90786 21.75 5.93037 20.8448 5.8402 19.6726L4.77235 5.79057M19.2276 5.79057C18.0812 5.61744 16.9215 5.48485 15.75 5.39432M3.75 5.95629C4.08957 5.89747 4.43037 5.84221 4.77235 5.79057M4.77235 5.79057C5.91878 5.61744 7.07849 5.48485 8.25 5.39432M15.75 5.39432V4.47819C15.75 3.29882 14.8393 2.31423 13.6606 2.27652C13.1092 2.25889 12.5556 2.25 12 2.25C11.4444 2.25 10.8908 2.25889 10.3394 2.27652C9.16065 2.31423 8.25 3.29882 8.25 4.47819V5.39432M15.75 5.39432C14.5126 5.2987 13.262 5.25 12 5.25C10.738 5.25 9.48744 5.2987 8.25 5.39432" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
        delBtn.addEventListener('click', () => {
          if (window.mmModal && window.mmModal.open) {
            window.mmModal.open({
              title: 'Messreihe löschen?',
              text: 'Soll die Messreihe entfernt werden?',
              okText: 'Löschen',
              onConfirm: () => removeSequenceColumn(key)
            });
          } else {
            removeSequenceColumn(key);
          }
        });
        thVal.appendChild(delBtn);
        const cBtn = document.createElement('button');
        cBtn.type = 'button';
        cBtn.className = 'icon-btn comment-toggle';
        cBtn.dataset.index = measIdx;
        cBtn.innerHTML = eyeIcon;
        cBtn.addEventListener('click', () =>
          toggleCommentColumn(headerRow, tableBody, colGroup, parseInt(cBtn.dataset.index, 10), cBtn, eyeIcon, eyeSlashIcon)
        );
        thVal.appendChild(cBtn);
        const fillerTh = headerRow.querySelector('.filler-column');
        headerRow.insertBefore(thVal, fillerTh);
        const thComment = document.createElement('th');
        thComment.classList.add('comment-column');
        thComment.textContent = 'Kommentar';
        thComment.style.visibility = 'collapse';
        headerRow.insertBefore(thComment, fillerTh);
        Array.from(tableBody.rows).forEach(row => {
          const fillerCell = row.querySelector('.filler-cell');
          const valTd = document.createElement('td');
          row.insertBefore(valTd, fillerCell);
          const cTd = document.createElement('td');
          cTd.style.visibility = 'collapse';
          const cInput = document.createElement('input');
          cInput.type = 'text';
          cInput.addEventListener('input', markUnsaved);
          cTd.appendChild(cInput);
          row.insertBefore(cTd, fillerCell);
        });
        const option = document.createElement('option');
        option.value = key;
        option.textContent = input.value;
        seqSelect.appendChild(option);
        sequences[key] = { input, option, id: null };
        input.addEventListener('input', () => {
          option.textContent = input.value;
          markUnsaved();
        });
        seqSelect.value = key;
        activeSeqKey = key;
        return key;
      }

      function appendRow(time, value = '', seqKey = null, comment = '') {
        const row = document.createElement('tr');
        const timeTd = document.createElement('td');
        timeTd.textContent = time;
        row.appendChild(timeTd);
        sequenceOrder.forEach((_, idx) => {
          const valTd = document.createElement('td');
          row.appendChild(valTd);
          const cTd = document.createElement('td');
          cTd.style.visibility = headerRow.children[2 + idx * 2]?.style.visibility || 'collapse';
          const cInput = document.createElement('input');
          cInput.type = 'text';
          cInput.addEventListener('input', markUnsaved);
          cTd.appendChild(cInput);
          row.appendChild(cTd);
        });
        const fillerTd = document.createElement('td');
        fillerTd.className = 'filler-cell';
        row.appendChild(fillerTd);
        const deleteTd = document.createElement('td');
        deleteTd.classList.add('delete-column');
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
        tableBody.appendChild(row);
        const orderIdx = sequenceOrder.indexOf(seqKey);
        if (value !== '' && orderIdx !== -1) {
          row.children[1 + orderIdx * 2].textContent = nf2.format(Number(value));
          row.children[2 + orderIdx * 2].querySelector('input').value = comment;
        }
      Array.from(headerRow.children).forEach((th, idx) => {
        if (th.style.visibility === 'collapse' && row.children[idx]) {
          row.children[idx].style.visibility = 'collapse';
        }
      });
      markUnsaved();
      return row;
    }

      const initialTable = window.initialTable;
      if (initialTable && initialTable.messungen) {
        initialTable.messungen
          .filter(m => m.name && m.name !== 'Einzelmessung')
          .forEach(m => addSequenceColumn(m.name));
        const dataMap = {};
        const timeSet = new Set();
        initialTable.messungen.forEach(m => {
          const map = {};
          (m.data || []).forEach(pt => {
            map[pt.time] = pt;
            timeSet.add(pt.time);
          });
          dataMap[m.name] = map;
        });
        Array.from(timeSet).sort().forEach(time => {
          const row = appendRow(time || '');
          const names = sequenceOrder.map(k => sequences[k].input.value);
          names.forEach((name, idx) => {
            const pt = dataMap[name] ? dataMap[name][time] : null;
            if (pt) {
              row.children[1 + idx * 2].textContent = nf2.format(Number(pt.value));
              row.children[2 + idx * 2].querySelector('input').value = pt.comment || '';
            }
          });
        });
        if (sequenceOrder.length) {
          activeSeqKey = sequenceOrder[sequenceOrder.length - 1];
          seqSelect.value = activeSeqKey;
        }
      } else {
        addSequenceColumn();
      }

    if (seqAddBtn && seqSelect) {
      seqAddBtn.addEventListener('click', () => {
        addSequenceColumn();
      });
      seqSelect.addEventListener('change', () => {
        activeSeqKey = seqSelect.value;
      });
    }

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${wsScheme}://${window.location.host}/ws/messung/`);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status.update' && statusSpan) {
        statusSpan.textContent = msg.data.text;
      } else if (msg.type === 'realtime.value' && realtimeSpan) {
        realtimeSpan.textContent = nf2.format(Number(msg.data.value));
      } else if (msg.type === 'sequence.start') {
        if (activeSeqKey && sequences[activeSeqKey]) {
          sequences[activeSeqKey].id = msg.data.id;
          const interval = parseInt(intervalInput?.value, 10) || 5;
          startCountdown(interval);
        }
        } else if (msg.type === 'measurement.value' && tableBody) {
          const seqKey = msg.data.is_sequence ? sequenceOrder.find(k => sequences[k].id === msg.data.sequence_id) : activeSeqKey;
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
    connectBtn.addEventListener('click', async () => {
      try {
        await fetch('/messung/api/connect/');
        await fetch('/messung/api/polling/start/');
      } catch (err) {
        console.error(err);
      }
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (err) {
        console.warn('Wake Lock failed, using NoSleep.', err);
        noSleep.enable();
      }
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
        editForm.addEventListener('input', markUnsaved);
        editForm.addEventListener('submit', () => {
          const hidden = document.getElementById('messdaten-input');
          if (hidden) {
            const messungen = [];
            sequenceOrder.forEach((key, idx) => {
              const name = sequences[key].input.value;
              const colIdx = 1 + idx * 2;
              const data = [];
              Array.from(tableBody.rows).forEach(row => {
                const time = row.children[0].textContent.trim();
                const valText = row.children[colIdx].textContent;
                const comment = row.children[colIdx + 1].querySelector('input').value;
                if (valText !== '') {
                  data.push({ time, value: parseFloat(valText), comment });
                }
              });
              if (data.length) {
                const stats = computeArrayStats(data.map(d => d.value));
                messungen.push({
                  name,
                  data,
                  avg: stats.avg,
                  min: stats.min,
                  max: stats.max,
                  u0: stats.u0,
                });
              }
            });
            hidden.value = JSON.stringify({ messungen });
          }
          saveBtn.classList.remove('unsaved');
          saveBtn.disabled = true;
        });
      }

      const anforderungBtn = document.getElementById('anforderung-open');
      const anforderungDisplay = document.getElementById('anforderung-display');
      const anforderungInput = document.getElementById('id_anforderung');
      const anforderungModal = document.getElementById('anforderung-modal');
      const anforderungSearch = document.getElementById('anforderung-search');
      const anforderungResults = document.getElementById('anforderung-results');
      const anforderungClose = document.getElementById('anforderung-close');

      function renderAnforderungen(list) {
        const grouped = {};
        list.forEach(a => {
          const b = a.bereich || 'Allgemein';
          (grouped[b] = grouped[b] || []).push(a);
        });
        anforderungResults.innerHTML = '';
        Object.keys(grouped).sort().forEach(b => {
          const bDiv = document.createElement('div');
          bDiv.className = 'bereich';
          bDiv.textContent = b;
          anforderungResults.appendChild(bDiv);
          const ul = document.createElement('ul');
          grouped[b].sort((x, y) => (x.typ || '').localeCompare(y.typ || ''));
          grouped[b].forEach(a => {
            const li = document.createElement('li');
            const label = [a.ref, a.typ].filter(Boolean).join(' ');
            li.textContent = label;
            li.addEventListener('click', () => {
              if (anforderungInput) anforderungInput.value = a.id;
              if (anforderungDisplay) anforderungDisplay.textContent = label;
              anforderungModal.style.display = 'none';
              markUnsaved();
            });
            ul.appendChild(li);
          });
          anforderungResults.appendChild(ul);
        });
      }

      if (anforderungBtn && anforderungModal) {
        anforderungBtn.addEventListener('click', () => {
          renderAnforderungen(window.anforderungenData || []);
          anforderungModal.style.display = 'flex';
          if (anforderungSearch) {
            anforderungSearch.value = '';
            anforderungSearch.focus();
          }
        });
      }
      if (anforderungClose) {
        anforderungClose.addEventListener('click', () => {
          anforderungModal.style.display = 'none';
        });
      }
      if (anforderungModal) {
        anforderungModal.addEventListener('click', e => {
          if (e.target === anforderungModal) anforderungModal.style.display = 'none';
        });
      }
      if (anforderungSearch) {
        anforderungSearch.addEventListener('input', () => {
          const term = anforderungSearch.value.toLowerCase();
          const filtered = (window.anforderungenData || []).filter(a =>
            `${a.ref} ${a.typ || ''} ${a.bereich || ''}`.toLowerCase().includes(term)
          );
          renderAnforderungen(filtered);
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

    }
  });

