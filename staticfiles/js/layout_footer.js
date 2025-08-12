
// Sidebar toggle + modal + reboot/shutdown (footer loaded)
(function () {
  var STORAGE_KEY = 'mm.sidebar.collapsed';

  function hasClass(el, cls) { return el && (el.classList ? el.classList.contains(cls) : new RegExp('(^|\s)'+cls+'(\s|$)').test(el.className)); }
  function addClass(el, cls) { if (!el) return; if (el.classList) el.classList.add(cls); else if (!hasClass(el, cls)) el.className += (el.className ? ' ' : '') + cls; }
  function removeClass(el, cls) { if (!el) return; if (el.classList) el.classList.remove(cls); else el.className = el.className.replace(new RegExp('(^|\s)'+cls+'(\s|$)'),' ').trim(); }
  function toggleClass(el, cls) { if (!el) return; if (el.classList) el.classList.toggle(cls); else hasClass(el, cls) ? removeClass(el, cls) : addClass(el, cls); }

  // Toggle
  var toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var root = document.documentElement;
      toggleClass(root, 'sidebar-collapsed');
      toggleClass(document.body, 'sidebar-collapsed');
      try { localStorage.setItem(STORAGE_KEY, hasClass(root, 'sidebar-collapsed') ? '1' : '0'); } catch (e) {}
      toggle.setAttribute('aria-expanded', hasClass(root, 'sidebar-collapsed') ? 'false' : 'true');
    });
  }

  // Modal helper
  var modalEl = document.getElementById('mm-modal');
  var modal = (function () {
    if (!modalEl) return { confirm: function() {} };
    var title = document.getElementById('mm-modal-title');
    var text  = document.getElementById('mm-modal-text');
    var btnOk = document.getElementById('mm-modal-confirm');

    function open(opts) {
      title.textContent = opts.title || 'Bestätigen';
      text.textContent  = opts.text  || 'Aktion ausführen?';
      btnOk.textContent = opts.okText || 'OK';
      btnOk.onclick = function () {
        close();
        if (opts.onConfirm) opts.onConfirm();
      };
      modalEl.setAttribute('aria-hidden', 'false');
    }
    function close() { modalEl.setAttribute('aria-hidden', 'true'); }
    modalEl.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute('data-mm-close') !== null) close();
    });
    return { confirm: open, close: close };
  })();

  // CSRF + POST
  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }
  function postJSON(url, data, onDone) {
    var csrftoken = getCookie('csrftoken');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (csrftoken) xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && typeof onDone === 'function') onDone(xhr.status, xhr.responseText);
    };
    xhr.send(data ? JSON.stringify(data) : '{}');
  }

  // Actions
  var btnReboot = document.getElementById('action-reboot');
  if (btnReboot) {
    btnReboot.addEventListener('click', function () {
      modal.confirm({
        title: 'Neu starten?',
        text: 'Der Raspberry Pi wird neu gestartet.',
        okText: 'Neu starten',
        onConfirm: function () { postJSON('/system/reboot/'); }
      });
    });
  }

  var btnShutdown = document.getElementById('action-shutdown');
  if (btnShutdown) {
    btnShutdown.addEventListener('click', function () {
      modal.confirm({
        title: 'Herunterfahren?',
        text: 'Der Raspberry Pi wird jetzt heruntergefahren.',
        okText: 'Herunterfahren',
        onConfirm: function () { postJSON('/system/shutdown/'); }
      });
    });
  }
})();
