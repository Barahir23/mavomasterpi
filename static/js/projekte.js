(function(){
  function getCookie(name){
    var value='; '+document.cookie;
    var parts=value.split('; '+name+'=');
    if(parts.length===2) return parts.pop().split(';').shift();
  }
  function openSidebar(){
    document.documentElement.classList.remove('sidebar-collapsed');
    document.body.classList.remove('sidebar-collapsed');
    var toggle=document.getElementById('sidebar-toggle');
    if(toggle) toggle.setAttribute('aria-expanded','true');
    try{localStorage.setItem('mm.sidebar.collapsed','0');}catch(e){}
  }
  function escapeHtml(str){
    var div=document.createElement('div');
    div.textContent=str||'';
    return div.innerHTML;
  }
  var sidebarContext=document.querySelector('.sidebar-context');
  function openProjektEdit(id,card){
    fetch('/messung/api/projekte/'+id+'/details/').then(r=>r.json()).then(function(data){
      sidebarContext.innerHTML='<div class="card"><h3>Projekt bearbeiten</h3><form id="form-projekt">'+
        '<label>Code<br><input name="code" value="'+escapeHtml(data.code)+'"></label><br>'+
        '<label>Name<br><input name="name" value="'+escapeHtml(data.name)+'"></label><br>'+
        '<label>Beschreibung<br><textarea name="beschreibung">'+escapeHtml(data.beschreibung||'')+'</textarea></label><br>'+
        '<button type="submit" class="mm-btn mm-btn--primary">Speichern</button>'+
      '</form></div>';
      openSidebar();
      var form=document.getElementById('form-projekt');
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var payload={code:this.code.value,name:this.name.value,beschreibung:this.beschreibung.value};
        fetch('/messung/api/projekte/'+id+'/update/',{method:'PUT',headers:{'Content-Type':'application/json','X-CSRFToken':getCookie('csrftoken')},body:JSON.stringify(payload)})
          .then(r=>r.json()).then(function(res){ if(!res.error){ card.querySelector('h3').textContent=res.name; } });
      });
    });
  }
  function openObjektEdit(id,card){
    fetch('/messung/api/objekte/'+id+'/details/').then(r=>r.json()).then(function(data){
      sidebarContext.innerHTML='<div class="card"><h3>Objekt bearbeiten</h3><form id="form-objekt">'+
        '<label>Nummer<br><input name="nummer" value="'+escapeHtml(data.nummer)+'"></label><br>'+
        '<label>Name<br><input name="name" value="'+escapeHtml(data.name)+'"></label><br>'+
        '<button type="submit" class="mm-btn mm-btn--primary">Speichern</button>'+
      '</form></div>';
      openSidebar();
      var form=document.getElementById('form-objekt');
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var payload={nummer:this.nummer.value,name:this.name.value};
        fetch('/messung/api/objekte/'+id+'/update/',{method:'PUT',headers:{'Content-Type':'application/json','X-CSRFToken':getCookie('csrftoken')},body:JSON.stringify(payload)})
          .then(r=>r.json()).then(function(res){ if(!res.error){ card.querySelector('h3').textContent=res.name; } });
      });
    });
  }
  function deleteProjekt(id,block){
    if(!confirm('Bist du sicher, das du das Projekt und alle dazugehörende Objekte inkl. Messungen löschen möchtest?')) return;
    fetch('/messung/api/projekte/'+id+'/delete/',{method:'DELETE',headers:{'X-CSRFToken':getCookie('csrftoken')}})
      .then(function(res){ if(res.ok){ block.remove(); } });
  }
  function deleteObjekt(id,card){
    if(!confirm('Bist du sicher, das du das Objekt und allen dazugehörenden Messungen löschen möchtest?')) return;
    fetch('/messung/api/objekte/'+id+'/delete/',{method:'DELETE',headers:{'X-CSRFToken':getCookie('csrftoken')}})
      .then(function(res){ if(res.ok){ card.remove(); } });
  }
  function loadObjekte(card){
    var pid=card.getAttribute('data-projekt-id');
    var container=card.nextElementSibling;
    if(container.getAttribute('data-loaded')==='1'){
      container.style.display=container.style.display==='none'?'block':'none';
      return;
    }
    fetch('/messung/api/projekte/'+pid+'/objekte/').then(r=>r.json()).then(function(list){
      var tpl=document.getElementById('objekt-template');
      container.innerHTML='';
      list.forEach(function(o){
        var node=tpl.content.firstElementChild.cloneNode(true);
        node.setAttribute('data-objekt-id',o.id);
        node.querySelector('.objekt-name').textContent=o.name;
        var btn=node.querySelector('.objekt-edit');
        btn.setAttribute('data-objekt-id',o.id);
        btn.addEventListener('click',function(ev){ev.stopPropagation();openObjektEdit(o.id,node);});
        var del=node.querySelector('.objekt-delete');
        del.setAttribute('data-objekt-id',o.id);
        del.addEventListener('click',function(ev){ev.stopPropagation();deleteObjekt(o.id,node);});
        container.appendChild(node);
      });
      container.setAttribute('data-loaded','1');
      container.style.display='block';
    });
  }
  document.querySelectorAll('.projekt-card').forEach(function(card){
    card.addEventListener('click',function(e){
      if(e.target.closest('.edit-btn')||e.target.closest('.delete-btn')) return;
      loadObjekte(card);
    });
  });
  document.querySelectorAll('.projekt-edit').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var card=e.target.closest('.projekt-card');
      openProjektEdit(btn.getAttribute('data-projekt-id'),card);
    });
  });
  document.querySelectorAll('.projekt-delete').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var block=e.target.closest('.projekt-block');
      deleteProjekt(btn.getAttribute('data-projekt-id'),block);
    });
  });
})();

