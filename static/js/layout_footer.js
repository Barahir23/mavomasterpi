
// Sidebar toggle + modal + flyout + reboot/shutdown
(function () {
  var STORAGE_KEY='mm.sidebar.collapsed';

  function hasClass(e,c){return e&&(e.classList?e.classList.contains(c):new RegExp('(^|\\s)'+c+'(\\s|$)').test(e.className));}
  function toggleClass(e,c){if(!e)return;if(e.classList)e.classList.toggle(c);else hasClass(e,c)?e.className=e.className.replace(new RegExp('(^|\\s)'+c+'(\\s|$)'),' ').trim():e.className+=(e.className?' ':'')+c;}

  var toggle=document.getElementById('sidebar-toggle');
  if(toggle){toggle.addEventListener('click',function(){
    toggleClass(document.documentElement,'sidebar-collapsed');
    toggleClass(document.body,'sidebar-collapsed');
    try{localStorage.setItem(STORAGE_KEY,hasClass(document.documentElement,'sidebar-collapsed')?'1':'0');}catch(e){}
    toggle.setAttribute('aria-expanded',hasClass(document.documentElement,'sidebar-collapsed')?'false':'true');
  },{passive:true});}

  // Modal
  var modalEl=document.getElementById('mm-modal');
  var titleEl=document.getElementById('mm-modal-title');
  var textEl=document.getElementById('mm-modal-text');
  var btnOk=document.getElementById('mm-modal-confirm');
  var countdownEl=document.getElementById('mm-modal-countdown');
  function openModal(opts){
    if(!modalEl)return;
    titleEl.textContent=opts.title||'Bestätigen';
    textEl.textContent=opts.text||'Aktion ausführen?';
    btnOk.textContent=opts.okText||'OK';
    btnOk.style.display='';
    if(countdownEl)countdownEl.style.display='none';
    btnOk.onclick=function(){closeModal(); opts.onConfirm&&opts.onConfirm();};
    modalEl.setAttribute('aria-hidden','false');
  }
  function showInfo(message){
    if(!modalEl)return;
    titleEl.textContent='Hinweis';
    textEl.textContent=message||'';
    if(countdownEl)countdownEl.style.display='none';
    btnOk.textContent='OK';
    btnOk.style.display='';
    btnOk.onclick=function(){ closeModal(); };
    modalEl.setAttribute('aria-hidden','false');
  }
  function showCountdown(sec,msg,onDone){
    if(!modalEl)return;
    titleEl.textContent='Bitte warten …';
    textEl.textContent=msg||'Aktion läuft.';
    btnOk.style.display='none';
    var s=sec; if(countdownEl){countdownEl.style.display=''; countdownEl.textContent='Seite wird in '+s+' s neu geladen …';}
    var iv=setInterval(function(){ s-=1; if(s<=0){clearInterval(iv); if(countdownEl)countdownEl.textContent='Neu laden …'; onDone&&onDone(); } else { if(countdownEl)countdownEl.textContent='Seite wird in '+s+' s neu geladen …'; } },1000);
    modalEl.setAttribute('aria-hidden','false');
  }
  function closeModal(){ if(modalEl) modalEl.setAttribute('aria-hidden','true'); }
  if(modalEl){ modalEl.setAttribute('aria-hidden','true'); modalEl.addEventListener('click',function(e){ if(e.target&&e.target.getAttribute('data-mm-close')!==null) closeModal(); },{passive:true}); }

  // CSRF + POST
  function getCookie(n){var v='; '+document.cookie;var p=v.split('; '+n+'=');if(p.length===2)return p.pop().split(';').shift();return'';}
  function postJSON(url,data,onDone){
    var t=getCookie('csrftoken');
    if(!t){ var hidden=document.querySelector('input[name=csrfmiddlewaretoken]'); if(hidden){ t=hidden.value; document.cookie='csrftoken='+t+'; path=/'; } }
    var x=new XMLHttpRequest();
    x.open('POST',url,true);
    x.withCredentials=true;
    x.setRequestHeader('Content-Type','application/json');
    if(t)x.setRequestHeader('X-CSRFToken',t);
    x.onreadystatechange=function(){if(x.readyState===4&&typeof onDone==='function')onDone(x.status,x.responseText);};
    x.send(data?JSON.stringify(data):'{}');
  }
  function reloadAfter(ms){setTimeout(function(){window.location.reload();},ms);}

  // Flyout
  var sysBtn=document.getElementById('action-system');
  var flyout=document.getElementById('sys-flyout');
  var flyBackdrop=document.getElementById('sys-flyout-backdrop');
  var actSettings=document.getElementById('sys-act-settings');
  var actReboot=document.getElementById('sys-act-reboot');
  var actShutdown=document.getElementById('sys-act-shutdown');

  function openFlyoutFrom(btn){
    if(!flyout||!btn)return;
    var r=btn.getBoundingClientRect();
    var left = r.right + 8;
    var top = Math.min(Math.max(8, r.top), window.innerHeight - 220);
    flyout.style.left = left + 'px';
    flyout.style.top = top + 'px';
    flyout.setAttribute('aria-hidden','false');
    if(flyBackdrop) flyBackdrop.style.display='block';
  }
  function closeFlyout(){
    if(!flyout)return;
    flyout.setAttribute('aria-hidden','true');
    if(flyBackdrop) flyBackdrop.style.display='none';
  }

  if(sysBtn){
    sysBtn.addEventListener('click', function(e){
      e.preventDefault();
      if(flyout.getAttribute('aria-hidden')==='false') closeFlyout();
      else openFlyoutFrom(sysBtn);
    });
  }
  if(flyBackdrop){
    flyBackdrop.addEventListener('click', function(){ closeFlyout(); }, {passive:true});
  }
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape') closeFlyout();
  });

  // Flyout actions
  if(actSettings){
    actSettings.addEventListener('click', function(){ closeFlyout(); window.location.href='/system/'; });
  }
  if(actReboot){
    actReboot.addEventListener('click', function(){
      closeFlyout();
      openModal({
        title:'Neu starten?',
        text:'Bist du sicher?',
        okText:'Neu starten',
        onConfirm:function(){
          postJSON('/system/reboot/',{},function(){
            showCountdown(30,'Neustart wird ausgeführt …',function(){ reloadAfter(0); });
          });
        }
      });
    });
  }
  if(actShutdown){
    actShutdown.addEventListener('click', function(){
      closeFlyout();
      openModal({
        title:'Herunterfahren?',
        text:'Bist du sicher?',
        okText:'Herunterfahren',
        onConfirm:function(){
          postJSON('/system/shutdown/',{},function(){
            showInfo('Sobald die grüne LED aus ist, kann das Raspberry Pi getrennt werden.');
          });
        }
      });
    });
  }
})();