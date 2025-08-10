document.addEventListener('DOMContentLoaded', function () {
    var statusTimeout = null;

    var elements = {
        statusBar: document.getElementById('status-bar'),
        selectProjekt: document.getElementById('selectProjekt'),
        selectObjekt: document.getElementById('selectObjekt'),
        btnToggleProjektAccordion: document.getElementById('btnToggleProjektAccordion'),
        btnToggleObjektAccordion: document.getElementById('btnToggleObjektAccordion'),
        btnToggleMessungAccordion: document.getElementById('btnToggleMessungAccordion'),
        btnNewProjekt: document.getElementById('btnNewProjekt'),
        btnDeleteProjekt: document.getElementById('btnDeleteProjekt'),
        btnNewObjekt: document.getElementById('btnNewObjekt'),
        btnDeleteObjekt: document.getElementById('btnDeleteObjekt'),
        projektFormContainer: document.getElementById('projektFormContainer'),
        objektFormContainer: document.getElementById('objektFormContainer'),
        messungFormContainer: document.getElementById('messungFormContainer'),
        projektFormSubmitButton: document.getElementById('projektFormSubmitButton'),
        objektFormSubmitButton: document.getElementById('objektFormSubmitButton'),
        btnConnect: document.getElementById('btnConnect'),
        btnSingle: document.getElementById('btnSingle'),
        btnStartSeq: document.getElementById('btnStartSeq'),
        btnStopSeq: document.getElementById('btnStopSeq'),
        btnDeleteAll: document.getElementById('btnDeleteAll'),
        btnSave: document.getElementById('btnSave'),
        btnExport: document.getElementById('btnExport'),
        inputInterval: document.getElementById('inputInterval'),
        inputCount: document.getElementById('inputCount'),
        inputMesshoehe: document.getElementById('inputMesshoehe'),
        inputMessbedingungen: document.getElementById('inputMessbedingungen'),
        tableHeadRow1: document.getElementById('header-row-1'),
        tableHeadRow2: document.getElementById('header-row-2'),
        tableBody: document.querySelector('#measurementTable tbody'),
        projektForm: document.getElementById('projektForm'),
        objektForm: document.getElementById('objektForm'),
        deviceWarningModal: document.getElementById('deviceWarningModal'),
        rebootConfirmBtn: document.getElementById('rebootConfirmBtn'),
        rebootDeclineBtn: document.getElementById('rebootDeclineBtn'),
        realtimeDisplay: document.getElementById('realtime-display'),
        deviceInfoDisplay: document.getElementById('device-info-display'),
        selectAnforderung: document.getElementById('selectAnforderung'),
        btnNewAnforderung: document.getElementById('btnNewAnforderung'),
        anforderungModal: document.getElementById('anforderungModal'),
        anforderungForm: document.getElementById('anforderungForm'),
        menuToggleButton: document.getElementById('menuToggleButton'),
        controlsSidebar: document.getElementById('controls-sidebar'),
    };

    var state = {
        projektId: null,
        objektId: null,
        isConnected: false,
        isSequenceRunning: false,
        currentSequenceId: null,
        deviceInfo: {}
    };

    var measurementBuffer = [];

    // --- Seitenleisten-Logik ---
    if (elements.menuToggleButton) {
        elements.menuToggleButton.addEventListener('click', function() {
            elements.controlsSidebar.classList.toggle('open');
        });
    }

    function updateUI() {
        var projektSelected = !!state.projektId;
        var objektSelected = !!state.objektId;
        elements.btnToggleObjektAccordion.disabled = !projektSelected;
        elements.btnDeleteProjekt.disabled = !projektSelected;
        elements.btnNewObjekt.disabled = !projektSelected;
        elements.btnDeleteObjekt.disabled = !objektSelected;
        elements.btnConnect.disabled = state.isConnected;
        var canStartMeasurement = state.isConnected && !state.isSequenceRunning;
        elements.btnSingle.disabled = !canStartMeasurement;
        elements.btnStartSeq.disabled = !canStartMeasurement;
        elements.btnStopSeq.disabled = !state.isSequenceRunning;
        var hasData = measurementBuffer.length > 0;
        elements.btnDeleteAll.disabled = !hasData || state.isSequenceRunning;
        elements.btnSave.disabled = !hasData || !objektSelected || state.isSequenceRunning;
        elements.btnExport.disabled = !objektSelected;
    }

    var deviceWarning = document.body.dataset.deviceWarning === 'true';
    if (deviceWarning) {
        elements.deviceWarningModal.style.display = 'block';
    }
    elements.rebootConfirmBtn.addEventListener('click', function() { document.getElementById('globalRebootBtn').click(); });
    elements.rebootDeclineBtn.addEventListener('click', function() { elements.deviceWarningModal.style.display = 'none'; });

    var socket;
    function connectWebSocket() {
        socket = new WebSocket('ws://' + window.location.host + '/ws/messung/');
        socket.onopen = function(e) { console.log("DEBUG: WebSocket verbunden."); };
        socket.onclose = function(e) {
            console.warn("WebSocket geschlossen. Reconnect in 30s...");
            setTimeout(function() { connectWebSocket(); }, 30000);
        };
        socket.onerror = function(e) { console.error("FEHLER: WebSocket fehlgeschlagen.", e); };
        socket.onmessage = function(e) {
            var payload = JSON.parse(e.data);
            switch (payload.type) {
                case 'status.update':
                    if (statusTimeout) clearTimeout(statusTimeout);
                    var statusBar = elements.statusBar;
                    var text = payload.data.text;
                    statusBar.textContent = "Status: " + text;
                    statusBar.classList.remove('fade-out', 'error');
                    if (text.toLowerCase().includes('fehler') || text.toLowerCase().includes('verloren')) {
                        statusBar.classList.add('error');
                    } else {
                        statusBar.classList.add('fade-out');
                        statusTimeout = setTimeout(function() { statusBar.textContent = ''; statusBar.classList.remove('fade-out'); }, 5000);
                    }
                    state.isConnected = payload.data.is_connected;
                    state.isSequenceRunning = payload.data.is_running;
                    state.deviceInfo = payload.data.device_info || {};
                    var deviceInfoHTML = '';
                    if (state.deviceInfo.line1) deviceInfoHTML += state.deviceInfo.line1;
                    if (state.deviceInfo.line2) deviceInfoHTML += '<br>' + state.deviceInfo.line2;
                    elements.deviceInfoDisplay.innerHTML = deviceInfoHTML;
                    if (!state.isSequenceRunning) state.currentSequenceId = null;
                    if (state.isConnected && !state.isSequenceRunning) { fetch('/messung/api/polling/start/'); }
                    else { fetch('/messung/api/polling/stop/'); elements.realtimeDisplay.textContent = '--.-'; }
                    updateUI();
                    break;
                case 'realtime.value': elements.realtimeDisplay.textContent = payload.data.value.toFixed(1) + " " + payload.data.unit; break;
                case 'measurement.value': addMeasurementToTable(payload.data); break;
                case 'sequence.start':
                    fetch('/messung/api/polling/stop/');
                    elements.realtimeDisplay.textContent = 'Sequenz...';
                    startNewSequenceInTable(payload.data);
                    break;
                case 'sequence.end':
                    state.isSequenceRunning = false;
                    state.currentSequenceId = null;
                    if (state.isConnected) { fetch('/messung/api/polling/start/'); }
                    updateUI();
                    break;
                case 'data.reset': resetAllData(); break;
            }
        };
    }
    connectWebSocket();

    function addMeasurementToTable(data) {
        var newRow = elements.tableBody.appendChild(document.createElement('tr'));
        var rowId = 'row-' + Date.now();
        newRow.dataset.rowId = rowId;
        newRow.appendChild(document.createElement('td')).textContent = data.time;
        if (data.is_sequence) {
            newRow.appendChild(document.createElement('td')).textContent = '-';
            newRow.appendChild(document.createElement('td')).textContent = '-';
            var existingSeqColumns = elements.tableHeadRow1.querySelectorAll('th[data-seq-id]').length;
            for (var i = 0; i < existingSeqColumns; i++) {
                var th = elements.tableHeadRow1.children[i + 2];
                if (th.dataset.seqId === data.sequence_id) { newRow.appendChild(document.createElement('td')).textContent = data.value; }
                else { newRow.appendChild(document.createElement('td')).textContent = '-'; }
            }
            var sequence = measurementBuffer.find(function(m) { return m.id === data.sequence_id; });
            if (sequence) {
                sequence.messdaten.push({ time: data.time, value: data.value });
                if (!sequence.einheit) { sequence.einheit = data.unit; }
            }
        } else {
            newRow.appendChild(document.createElement('td')).textContent = data.value;
            var commentCell = newRow.appendChild(document.createElement('td'));
            var commentInput = document.createElement('input');
            commentInput.type = 'text';
            commentInput.placeholder = 'Kommentar...';
            commentCell.appendChild(commentInput);
            measurementBuffer.push({
                id: rowId, type: 'single', name: 'Einzelmessung',
                messdaten: [{ time: data.time, value: data.value }],
                kommentarInput: commentInput, einheit: data.unit
            });
            var existingSeqColumns = elements.tableHeadRow1.querySelectorAll('th[data-seq-id]').length;
            for (var i = 0; i < existingSeqColumns; i++) { newRow.appendChild(document.createElement('td')).textContent = '-'; }
        }
        updateUI();
    }
    function startNewSequenceInTable(data) {
        state.currentSequenceId = data.id;
        var newTh = document.createElement('th');
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = data.name || 'Sequenz ' + (elements.tableHeadRow1.children.length - 1);
        newTh.appendChild(nameInput);
        newTh.dataset.seqId = data.id;
        elements.tableHeadRow1.appendChild(newTh);
        Array.from(elements.tableBody.children).forEach(function(row) { row.appendChild(document.createElement('td')).textContent = '-'; });
        measurementBuffer.push({ id: data.id, type: 'sequence', nameInput: nameInput, messdaten: [], einheit: null });
        updateUI();
    }
    function resetAllData() {
        elements.tableHeadRow1.innerHTML = '<th rowspan="2">Zeitstempel</th><th colspan="2">Einzelmessung</th>';
        elements.tableHeadRow2.innerHTML = '<th>Messwert</th><th>Kommentar</th>';
        elements.tableBody.innerHTML = '';
        measurementBuffer = [];
        updateUI();
    }
    elements.selectProjekt.addEventListener('change', function() {
        state.projektId = this.value; state.objektId = null;
        elements.selectObjekt.innerHTML = '<option value="">Lade Objekte...</option>';
        elements.selectObjekt.disabled = true;
        if (state.projektId) {
            fetch('/messung/api/projekte/' + state.projektId + '/details/').then(function(r) { return r.json(); }).then(function(d) {
                elements.projektForm.querySelector('#projektCode').value = d.code;
                elements.projektForm.querySelector('#projektName').value = d.name;
                elements.projektForm.querySelector('#projektBeschreibung').value = d.beschreibung || '';
                elements.projektFormSubmitButton.disabled = true;
            });
            fetch('/messung/api/projekte/' + state.projektId + '/objekte/').then(function(r) { return r.json(); }).then(function(d) {
                elements.selectObjekt.innerHTML = '<option value="">--- Bitte wählen ---</option>';
                d.forEach(function(objekt) {
                    var option = new Option(objekt.nummer+ ' ' + objekt.name, objekt.id);
                    elements.selectObjekt.add(option);
                });
                elements.selectObjekt.disabled = false;
            });
        } else {
            elements.selectObjekt.innerHTML = '<option value="">--- Erst Projekt wählen ---</option>';
            elements.projektForm.reset();
        }
        updateUI();
    });
    elements.selectObjekt.addEventListener('change', function() {
        state.objektId = this.value;
        if (state.objektId) {
            fetch('/messung/api/objekte/' + state.objektId + '/details/').then(function(r) { return r.json(); }).then(function(d) {
                elements.objektForm.querySelector('#objektNummer').value = d.nummer;
                elements.objektForm.querySelector('#objektName').value = d.name;
            });
        } else { elements.objektForm.reset(); }
        updateUI();
    });
    function setupAccordion(button, container) {
        button.addEventListener('click', function(e) { e.currentTarget.classList.toggle('open'); container.classList.toggle('open'); });
    }
    setupAccordion(elements.btnToggleProjektAccordion, elements.projektFormContainer);
    setupAccordion(elements.btnToggleObjektAccordion, elements.objektFormContainer);
    setupAccordion(elements.btnToggleMessungAccordion, elements.messungFormContainer);
    elements.projektForm.addEventListener('input', function() { elements.projektFormSubmitButton.disabled = false; });
    elements.objektForm.addEventListener('input', function() { elements.objektFormSubmitButton.disabled = false; });
    elements.btnNewProjekt.addEventListener('click', function() {
        state.projektId = null; elements.selectProjekt.value = ''; elements.projektForm.reset(); elements.projektFormSubmitButton.disabled = false;
        if (!elements.projektFormContainer.classList.contains('open')) { elements.btnToggleProjektAccordion.click(); }
        updateUI();
    });
    elements.btnNewObjekt.addEventListener('click', function() {
        state.objektId = null; elements.selectObjekt.value = ''; elements.objektForm.reset(); elements.objektFormSubmitButton.disabled = false;
        if (!elements.objektFormContainer.classList.contains('open')) { elements.btnToggleObjektAccordion.click(); }
        updateUI();
    });
    elements.projektForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var data = { code: document.getElementById('projektCode').value, name: document.getElementById('projektName').value, beschreibung: document.getElementById('projektBeschreibung').value };
        var isUpdate = !!state.projektId;
        var url = isUpdate ? '/messung/api/projekte/' + state.projektId + '/update/' : '/messung/api/projekte/create/';
        var method = isUpdate ? 'PUT' : 'POST';
        fetch(url, { method: method, headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken}, body: JSON.stringify(data) })
        .then(function(r) { return r.json(); }).then(function(res) {
            if (res.error) { alert('Fehler: ' + res.error); return; }
            if (isUpdate) { elements.selectProjekt.options[elements.selectProjekt.selectedIndex].text = res.code + ' ' + res.name; }
            else { var option = new Option(res.code + ' ' + res.name, res.id, true, true); elements.selectProjekt.add(option); }
            elements.selectProjekt.dispatchEvent(new Event('change'));
        });
    });
    elements.objektForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var data = { nummer: document.getElementById('objektNummer').value, name: document.getElementById('objektName').value };
        var isUpdate = !!state.objektId;
        var url = isUpdate ? '/messung/api/objekte/' + state.objektId + '/update/' : '/messung/api/projekte/' + state.projektId + '/objekte/create/';
        var method = isUpdate ? 'PUT' : 'POST';
        fetch(url, { method: method, headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken}, body: JSON.stringify(data) })
        .then(function(r) { return r.json(); }).then(function(res) {
            if (res.error) { alert('Fehler: ' + res.error); return; }
            if (isUpdate) { elements.selectObjekt.options[elements.selectObjekt.selectedIndex].text = res.nummer + ' ' + res.name; }
            else { var option = new Option(res.nummer + ' ' + res.name, res.id, true, true); elements.selectObjekt.add(option); }
            elements.selectObjekt.dispatchEvent(new Event('change'));
        });
    });
    elements.btnDeleteProjekt.addEventListener('click', function() {
        showConfirm('Projekt löschen', 'Sind Sie sicher, dass Sie dieses Projekt und alle zugehörigen Objekte und Messungen löschen möchten?', function() {
            fetch('/messung/api/projekte/' + state.projektId + '/delete/', { method: 'DELETE', headers: {'X-CSRFToken': csrftoken}})
            .then(function(r) { if (r.ok) { elements.selectProjekt.remove(elements.selectProjekt.selectedIndex); elements.selectProjekt.dispatchEvent(new Event('change')); } else { alert('Löschen fehlgeschlagen.'); }});
        });
    });
    elements.btnDeleteObjekt.addEventListener('click', function() {
        showConfirm('Objekt löschen', 'Sind Sie sicher, dass Sie dieses Objekt und alle zugehörigen Messungen löschen möchten?', function() {
            fetch('/messung/api/objekte/' + state.objektId + '/delete/', { method: 'DELETE', headers: {'X-CSRFToken': csrftoken}})
            .then(function(r) { if (r.ok) { elements.selectObjekt.remove(elements.selectObjekt.selectedIndex); elements.selectObjekt.dispatchEvent(new Event('change')); } else { alert('Löschen fehlgeschlagen.'); }});
        });
    });
    elements.btnConnect.onclick = function() { fetch('/messung/api/connect/'); };
    elements.btnSingle.onclick = function() { fetch('/messung/api/single/'); };
    elements.btnStopSeq.onclick = function() { fetch('/messung/api/stop/'); };
    elements.btnDeleteAll.onclick = function() { resetAllData(); };
    elements.btnStartSeq.onclick = function() {
        var interval = elements.inputInterval.value; var count = elements.inputCount.value;
        fetch('/messung/api/start/?interval=' + interval + '&count=' + count);
    };
    elements.btnSave.addEventListener('click', function() {
        if (!state.objektId) { alert("Bitte zuerst ein Objekt auswählen."); return; }
        var payload = {
            objekt_id: state.objektId,
            device_info: state.deviceInfo.line1 + ", " + state.deviceInfo.line2,
            messbedingungen: elements.inputMessbedingungen.value,
            messhoehe: elements.inputMesshoehe.value,
            anforderung_id: elements.selectAnforderung.value,
            messungen: []
        };
        measurementBuffer.forEach(function(messung) {
            var finalName = messung.name; var finalComment = '';
            if (messung.type === 'sequence') { finalName = messung.nameInput.value || 'Unbenannte Sequenz'; }
            else { finalComment = messung.kommentarInput.value; }
            payload.messungen.push({ name: finalName, messdaten: messung.messdaten, kommentar: finalComment, einheit: messung.einheit });
        });
        fetch('/messung/api/save/', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken}, body: JSON.stringify(payload) })
        .then(function(r) { return r.json(); }).then(function(res) {
            if (res.error) { alert('Fehler beim Speichern: ' + res.error); }
            else { alert(res.status); resetAllData(); }
        });
    });
    elements.btnNewAnforderung.addEventListener('click', function() {
        elements.anforderungModal.style.display = 'block';
    });
    elements.anforderungModal.querySelector('.close-button').addEventListener('click', function() {
        elements.anforderungModal.style.display = 'none';
    });
    elements.anforderungForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var data = {
            ref: document.getElementById('anforderungRef').value,
            typ: document.getElementById('anforderungTyp').value,
            avg: document.getElementById('anforderungAvg').value,
            avgmod: document.getElementById('anforderungAvgmod').value,
            u0: document.getElementById('anforderungU0').value,
        };
        fetch('/messung/api/anforderungen/create/', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken}, body: JSON.stringify(data) })
        .then(function(r) { return r.json(); }).then(function(res) {
            if (res.error) { alert('Fehler: ' + res.error); return; }
            var option = new Option(res.ref, res.id, true, true);
            elements.selectAnforderung.add(option);
            elements.anforderungModal.style.display = 'none';
            this.reset();
        });
    });

    elements.btnExport.addEventListener('click', function() {
        if (!state.objektId) {
            alert("Bitte zuerst ein Objekt auswählen, um dessen Daten zu exportieren.");
            return;
        }
        window.open('/messung/api/objekte/' + state.objektId + '/export/', '_blank');
    });

    updateUI();
});
