(function () {
  'use strict';

  var isLoggedIn = false;
  var isAdmin = false;

  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');
  var navUser = document.getElementById('navUser');
  var navUserBtn = document.getElementById('navUserBtn');
  var navUserDropdown = document.getElementById('navUserDropdown');
  var navUserName = document.getElementById('navUserName');
  var navUserAvatar = document.getElementById('navUserAvatar');
  var btnDashboard = document.getElementById('btnDashboard');
  var btnLogout = document.getElementById('btnLogout');
  var btnProfile = document.getElementById('btnProfile');
  var authModal = document.getElementById('authModal');
  var authModalBackdrop = document.getElementById('authModalBackdrop');
  var authModalClose = document.getElementById('authModalClose');
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');
  var authError = document.getElementById('authError');
  var adminDashboard = document.getElementById('adminDashboard');
  var contactForm = document.getElementById('contactForm');
  var toast = document.getElementById('toast');
  var navLoginBtn = document.getElementById('navLoginBtn');

  function init() {
    if (btnDashboard) btnDashboard.style.display = 'none';
    setupMobileNav();
    setupSmoothScroll();
    setupAuthUI();
    setupFormValidation();
    setupCounters();

    if (navLoginBtn) navLoginBtn.addEventListener('click', function(e) { e.preventDefault(); openAuthModal('login'); });
    if (AsterAPI.getToken()) { AsterAPI.getMe().then(updateAuthUI).catch(function() { AsterAPI.logout(); }); }
  }

  function setupMobileNav() {
    navToggle.addEventListener('click', function() { navToggle.classList.toggle('active'); navMenu.classList.toggle('open'); });
    navMenu.querySelectorAll('a').forEach(function(l) { l.addEventListener('click', function() { navToggle.classList.remove('active'); navMenu.classList.remove('open'); }); });
  }

  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(l) {
      l.addEventListener('click', function(e) {
        var t = document.querySelector(this.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth' }); }
      });
    });
  }

  // Auth Modal
  function openAuthModal(tab) { authModal.classList.add('active'); document.body.style.overflow='hidden'; switchAuthTab(tab); }
  function closeAuthModal() { authModal.classList.remove('active'); document.body.style.overflow=''; authError.style.display='none'; }
  authModalBackdrop.addEventListener('click', closeAuthModal);
  authModalClose.addEventListener('click', closeAuthModal);
  document.addEventListener('keydown', function(e) { if (e.key==='Escape'&&authModal.classList.contains('active')) closeAuthModal(); });

  function switchAuthTab(tab) {
    document.querySelectorAll('.auth__tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab===tab); });
    loginForm.style.display = tab==='login'?'block':'none';
    registerForm.style.display = tab==='register'?'block':'none';
    authError.style.display='none';
  }

  document.querySelectorAll('.auth__tab').forEach(function(t) { t.addEventListener('click', function() { switchAuthTab(this.dataset.tab); }); });
  document.querySelectorAll('.auth__switch').forEach(function(l) { l.addEventListener('click', function(e) { e.preventDefault(); switchAuthTab(this.dataset.target); }); });

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault(); authError.style.display='none';
    var b = loginForm.querySelector('button'); b.disabled=true; b.textContent='登录中...';
    AsterAPI.login(loginForm.querySelector('[name=email]').value, loginForm.querySelector('[name=password]').value)
    .then(function() { updateAuthUI(); closeAuthModal(); showToast('登录成功！'); })
    .catch(function(err) { authError.textContent=err.message; authError.style.display='block'; })
    .finally(function() { b.disabled=false; b.textContent='登录'; });
  });

  registerForm.addEventListener('submit', function(e) {
    e.preventDefault(); authError.style.display='none';
    var info={}; registerForm.querySelectorAll('[name]').forEach(function(f) { info[f.name]=f.value; }); info.source='web';
    var b = registerForm.querySelector('button'); b.disabled=true; b.textContent='注册中...';
    AsterAPI.register(info)
    .then(function() { updateAuthUI(); closeAuthModal(); showToast('注册成功！'); })
    .catch(function(err) { authError.textContent=err.message; authError.style.display='block'; })
    .finally(function() { b.disabled=false; b.textContent='注册'; });
  });

  navUserBtn.addEventListener('click', function() { navUserDropdown.classList.toggle('show'); });
  document.addEventListener('click', function(e) { if (!navUser.contains(e.target)) navUserDropdown.classList.remove('show'); });

  btnLogout.addEventListener('click', function(e) { e.preventDefault(); AsterAPI.logout().then(updateAuthUI).then(function(){showToast('已退出');}); });
  btnProfile.addEventListener('click', function(e) {
    e.preventDefault(); navUserDropdown.classList.remove('show');
    var u = AsterAPI.getUser();
    if (!u) { openAuthModal('login'); return; }
    alert(['👤 '+ (u.name||'-'), '📧 '+ (u.email||'-'), '💬 '+ (u.wechat||'-'), '🎯 '+ (u.targetStage||'-'), (u.isAdmin?'\n🔑 管理员':'')].join('\n'));
  });
  btnDashboard.addEventListener('click', function(e) { e.preventDefault(); navUserDropdown.classList.remove('show'); loadAdminDashboard(); });

  function updateAuthUI() {
    var u = AsterAPI.getUser();
    if (u) {
      isLoggedIn=true; isAdmin=!!u.isAdmin;
      navUser.style.display='block'; if(navLoginBtn)navLoginBtn.style.display='none';
      navUserName.textContent=u.name||u.email.split('@')[0];
      navUserAvatar.textContent=(u.name||u.email)[0].toUpperCase();
      btnDashboard.style.display=isAdmin?'block':'none';
    } else {
      isLoggedIn=false; isAdmin=false;
      navUser.style.display='none'; if(navLoginBtn)navLoginBtn.style.display='';
      btnDashboard.style.display='none'; adminDashboard.style.display='none';
    }
  }

  function loadAdminDashboard() {
    if (!isAdmin) { showToast('无权限'); return; }
    adminDashboard.style.display='block'; adminDashboard.scrollIntoView({behavior:'smooth'});
    AsterAPI.getStats().then(function(s) {
      document.getElementById('statTotal').textContent=s.totalUsers;
      document.getElementById('statToday').textContent=s.newToday;
      document.getElementById('statWeek').textContent=s.newThisWeek;
      document.getElementById('statActive').textContent=s.activeToday;
    }).catch(function(){});
    loadUserList(); loadContactList();
  }

  function loadUserList(s) {
    AsterAPI.getUsers({search:s,limit:100}).then(function(d) {
      var t=document.getElementById('adminUserList');
      t.innerHTML = d.users.length ? d.users.map(function(u){return'<tr><td>'+(u.name||'-')+'</td><td>'+(u.email||'-')+'</td><td>'+(u.wechat||'-')+'</td><td>'+(u.target_stage||'-')+'</td><td>'+(u.createdAt||'').slice(0,10)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:#666;padding:2rem">暂无</td></tr>';
    }).catch(function(){});
  }

  function loadContactList() {
    var tok = AsterAPI.getToken(); if(!tok)return;
    fetch('/api/admin/contacts?limit=100',{headers:{'Authorization':'Bearer '+tok}})
    .then(function(r){return r.json();})
    .then(function(d){
      var t=document.getElementById('adminContactList');
      t.innerHTML = (d.contacts||[]).length ? d.contacts.map(function(c){return'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.contact)+'</td><td>'+esc(c.target)+'</td><td>'+esc(c.message||'-')+'</td><td>'+(c.createdAt||'').slice(0,10)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:#666;padding:2rem">暂无</td></tr>';
    }).catch(function(){});
  }

  var adminSearch = document.getElementById('adminSearch');
  if(adminSearch) { var st; adminSearch.addEventListener('input', function() { clearTimeout(st); st=setTimeout(function(){loadUserList(adminSearch.value);},400); }); }

  var btnExport = document.getElementById('btnExport');
  if(btnExport) btnExport.addEventListener('click', function() { AsterAPI.exportCSV().then(function(b){var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='users.csv';a.click();URL.revokeObjectURL(u);showToast('导出成功');}).catch(function(){showToast('导出失败');}); });

  var btnExportContacts = document.getElementById('btnExportContacts');
  if(btnExportContacts) btnExportContacts.addEventListener('click', function() {
    var tok=AsterAPI.getToken(); if(!tok){showToast('请先登录');return;}
    fetch('/api/admin/contacts/export',{headers:{'Authorization':'Bearer '+tok}})
    .then(function(r){if(!r.ok)throw new Error('');return r.blob();})
    .then(function(b){var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='contacts.csv';a.click();URL.revokeObjectURL(u);showToast('导出成功');})
    .catch(function(){showToast('导出失败');});
  });

  function setupFormValidation() {
    if(!contactForm){ console.log('Form not found'); return; }
    console.log('Form setup OK');
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault(); var valid=true;
      contactForm.querySelectorAll('[required]').forEach(function(f) {
        var err=f.parentElement.querySelector('.form__error'); f.classList.remove('error'); if(err)err.textContent='';
        if(!f.value.trim()){f.classList.add('error');if(err)err.textContent='必填';valid=false;}
      });
      if(valid){
        var b=contactForm.querySelector('button[type=submit]'); b.disabled=true; b.textContent='提交中...';
        var d={}; contactForm.querySelectorAll('[name]').forEach(function(f){if(f.value.trim())d[f.name]=f.value.trim();});
        fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
        .then(function(r){return r.json();})
        .then(function(r){showToast(r.message||'已收到！');contactForm.reset();})
        .catch(function(){showToast('提交失败');})
        .finally(function(){b.disabled=false;b.textContent='提交咨询 · 免费评估';});
      }
    });
    contactForm.querySelectorAll('input,select,textarea').forEach(function(f){f.addEventListener('input',function(){this.classList.remove('error');var e=this.parentElement.querySelector('.form__error');if(e)e.textContent='';});});
  }

  function setupCounters() {
    var done=false;
    function ani(){
      if(done)return;
      var el=document.querySelector('.result-stat__num'); if(!el)return;
      var r=el.getBoundingClientRect();
      if(r.top<window.innerHeight&&r.bottom>0){done=true;
        document.querySelectorAll('[data-count]').forEach(function(e){var t=parseInt(e.dataset.count),d=2000,s=performance.now();(function u(n){var p=Math.min((n-s)/d,1);e.textContent=Math.floor((1-Math.pow(1-p,3))*t);if(p<1)requestAnimationFrame(u);else e.textContent=t;})(s);});
      }
    }
    window.addEventListener('scroll',ani);ani();
  }

  function setupAuthUI() {
    // Tab switching and auth form already handled above
  }

  window.showToast = function(m) { toast.textContent=m; toast.classList.add('show'); setTimeout(function(){toast.classList.remove('show');},3500); };

  window._submitContact = function(e) {
    if (!contactForm) return;
    e && e.preventDefault();
    var valid=true;
    contactForm.querySelectorAll('[required]').forEach(function(f) {
      var err=f.parentElement.querySelector('.form__error'); f.classList.remove('error'); if(err)err.textContent='';
      if(!f.value.trim()){f.classList.add('error');if(err)err.textContent='必填';valid=false;}
    });
    if(!valid) return;
    var b=contactForm.querySelector('button[type=submit]'); b.disabled=true; b.textContent='提交中...';
    var d={}; contactForm.querySelectorAll('[name]').forEach(function(f){if(f.value.trim())d[f.name]=f.value.trim();});
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
    .then(function(r){return r.json();})
    .then(function(r){showToast(r.message||'已收到！');contactForm.reset();})
    .catch(function(){showToast('提交失败');})
    .finally(function(){b.disabled=false;b.textContent='提交咨询 · 免费评估';});
  };
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init();
})();
