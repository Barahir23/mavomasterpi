// === Seitenleisten-Toggles (ES5) ===
(function () {
  function hasClass(el, cls) {
    if (!el) return false;
    if (el.classList) return el.classList.contains(cls);
    return new RegExp('(^|\\s)' + cls + '(\\s|$)').test(el.className);
  }
  function addClass(el, cls) {
    if (!el) return;
    if (el.classList) return el.classList.add(cls);
    if (!hasClass(el, cls)) el.className += (el.className ? ' ' : '') + cls;
  }
  function removeClass(el, cls) {
    if (!el) return;
    if (el.classList) return el.classList.remove(cls);
    el.className = el.className.replace(new RegExp('(^|\\s)' + cls + '(\\s|$)'), ' ').trim();
  }
  function toggleClass(el, cls) {
    if (!el) return;
    if (el.classList) return el.classList.toggle(cls);
    hasClass(el, cls) ? removeClass(el, cls) : addClass(el, cls);
  }

  var body = document.body;
  var mobileToggle = document.getElementById('menuToggleButton');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      toggleClass(body, 'sidebar-open');
    });
  }

  var collapseToggle = document.getElementById('collapseToggle');
  if (collapseToggle) {
    collapseToggle.addEventListener('click', function () {
      toggleClass(body, 'sidebar-collapsed');
      collapseToggle.setAttribute('aria-expanded', hasClass(body, 'sidebar-collapsed') ? 'false' : 'true');
    });
  }

  // Footer actions (Dummy; Backend wiring nach Bedarf)
  var reboot = document.getElementById('action-reboot');
  var shutdown = document.getElementById('action-shutdown');
  if (reboot) reboot.addEventListener('click', function(){ console.log('Reboot angefordert'); });
  if (shutdown) shutdown.addEventListener('click', function(){ console.log('Shutdown angefordert'); });
})();
