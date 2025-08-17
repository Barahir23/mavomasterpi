// Hinweis: Keine Browser-Prompts zur Sicherstellung der mobilen Kompatibilität.
// Sidebar toggle + modal + flyout + reboot/shutdown
(function () {
  var STORAGE_KEY='mm.sidebar.collapsed';

  function setSidebarCollapsed(collapsed){
    var method=collapsed?'add':'remove';
    document.documentElement.classList[method]('sidebar-collapsed');
    if(document.body)document.body.classList[method]('sidebar-collapsed');
    try{localStorage.setItem(STORAGE_KEY,collapsed?'1':'0');}catch(e){}
    var toggle=document.getElementById('sidebar-toggle');
    if(toggle)toggle.setAttribute('aria-expanded',collapsed?'false':'true');
  }

  var collapsed=false;
  try{collapsed=localStorage.getItem(STORAGE_KEY)==='1';}catch(e){}
  setSidebarCollapsed(collapsed);

  var toggle=document.getElementById('sidebar-toggle');
  if(toggle){toggle.addEventListener('click',function(){
    setSidebarCollapsed(!document.documentElement.classList.contains('sidebar-collapsed'));
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
    window.mmModal={open:openModal,info:showInfo,countdown:showCountdown,close:closeModal};

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
    flyout.style.visibility='hidden';
    flyout.setAttribute('aria-hidden','false');
    var r=btn.getBoundingClientRect();
    var left = r.left;
    var flyHeight = flyout.offsetHeight;
    var top = r.top - flyHeight;
    flyout.style.left = left + 'px';
    flyout.style.top = top + 'px';
    flyout.style.visibility='visible';
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
