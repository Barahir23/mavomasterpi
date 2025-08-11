
// === Sidebar Toggle (ES5) ===
(function () {
  var body = document.body;

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

  var collapseToggle = document.getElementById('collapseToggle');
  if (collapseToggle) {
    collapseToggle.addEventListener('click', function () {
      toggleClass(body, 'sidebar-collapsed');
      collapseToggle.setAttribute('aria-expanded', hasClass(body, 'sidebar-collapsed') ? 'false' : 'true');
    });
  }

  // Force expanded on small viewports (<= 900px)
  function enforceWidthRule() {
    if (window.innerWidth <= 900) {
      removeClass(body, 'sidebar-collapsed');
    }
  }
  window.addEventListener('resize', enforceWidthRule);
  enforceWidthRule();

  // Footer actions (Dummy; Backend wiring nach Bedarf)
  var reboot = document.getElementById('action-reboot');
  var shutdown = document.getElementById('action-shutdown');
  if (reboot) reboot.addEventListener('click', function(){ console.log('Reboot angefordert'); });
  if (shutdown) shutdown.addEventListener('click', function(){ console.log('Shutdown angefordert'); });
})();
