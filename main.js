(function(){
'use strict';
var isLoggedIn=false,isAdmin=false;

var navToggle=document.getElementById('navToggle');
var navMenu=document.getElementById('navMenu');
var navUser=document.getElementById('navUser');
var navUserBtn=document.getElementById('navUserBtn');
var navUserDropdown=document.getElementById('navUserDropdown');
var navUserName=document.getElementById('navUserName');
var navUserAvatar=document.getElementById('navUserAvatar');
var btnDashboard=document.getElementById('btnDashboard');
var btnLogout=document.getElementById('btnLogout');
var btnProfile=document.getElementById('btnProfile');
var authModal=document.getElementById('authModal');
var authModalBackdrop=document.getElementById('authModalBackdrop');
var authModalClose=document.getElementById('authModalClose');
var loginForm=document.getElementById('loginForm');
var registerForm=document.getElementById('registerForm');
var authError=document.getElementById('authError');
var adminDashboard=document.getElementById('adminDashboard');
var contactForm=document.getElementById('contactForm');
var toast=document.getElementById('toast');
var navLoginBtn=document.getElementById('navLoginBtn');

function init(){
  if(btnDashboard)btnDashboard.style.display='none';
  adminDashboard.style.display='none';
  setupNav();setupSmoothScroll();setupAuth();setupLanguage();setupForm();setupCounters();
  if(navLoginBtn)navLoginBtn.addEventListener('click',function(e){e.preventDefault();openAuth('login');});
  if(AsterAPI.getToken()){
    AsterAPI.getMe().then(updateAuthUI).catch(function(){AsterAPI.logout();updateAuthUI();});
  }else{
    updateAuthUI();
  }
}

function setupNav(){
  navToggle.addEventListener('click',function(){navToggle.classList.toggle('active');navMenu.classList.toggle('open');});
  navMenu.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){navToggle.classList.remove('active');navMenu.classList.remove('open');});});
}

function setupSmoothScroll(){
  document.querySelectorAll('a[href^="#"]').forEach(function(l){l.addEventListener('click',function(e){
    var href=this.getAttribute('href');
    if(!href||href==='#')return;
    var t=null;
    try{t=document.querySelector(href);}catch(err){return;}
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}
  });});
}

function setupLanguage(){
  var langLinks=document.querySelectorAll('[data-lang]');
  if(!langLinks.length)return;
  var copy={
    zh:{
      htmlLang:'zh-CN',
      nav:['首页','关于我们','服务项目','合作院校','申请流程','费用参考','最新动态','常见问题'],
      cta:'免费咨询',loginStrong:'登录/注册',loginEm:'账号中心',userEm:'我的账户',
      heroLabel:'ASTER INTERNATIONAL',
      heroMain:'ASTER',
      heroSub:'A Step Toward Tomorrow',
      heroDesc:'東京 · 大阪 · 京都 · 名古屋\n语言学校 · 本科 · 研究生 · 艺术 · SGU',
      btn1:'免费咨询',btn2:'了解服务',toast:'已切换为中文'
    },
    ja:{
      htmlLang:'ja',
      nav:['ホーム','Asterについて','サービス','提携校','申請の流れ','費用目安','ニュース','FAQ'],
      cta:'無料相談',loginStrong:'ログイン/登録',loginEm:'アカウント',userEm:'マイページ',
      heroLabel:'ASTER INTERNATIONAL',
      heroMain:'ASTER',
      heroSub:'A Step Toward Tomorrow',
      heroDesc:'東京 · 大阪 · 京都 · 名古屋\n日本語学校 · 学部 · 大学院 · 芸術 · SGU',
      btn1:'無料相談',btn2:'サービスを見る',toast:'日本語に切り替えました'
    },
    en:{
      htmlLang:'en',
      nav:['Home','About','Services','Schools','Process','Fees','News','FAQ'],
      cta:'Free Consultation',loginStrong:'Sign in / Join',loginEm:'Account',userEm:'My Account',
      heroLabel:'ASTER INTERNATIONAL',
      heroMain:'ASTER',
      heroSub:'A Step Toward Tomorrow',
      heroDesc:'Tokyo · Osaka · Kyoto · Nagoya\nLanguage School · Undergraduate · Graduate · Art · SGU',
      btn1:'Free Consultation',btn2:'View Services',toast:'Switched to English'
    }
  };
  function setText(sel,text){var el=document.querySelector(sel);if(el)el.textContent=text;}
  function applyLang(lang,notify){
    var c=copy[lang]||copy.zh;
    document.documentElement.lang=c.htmlLang;
    langLinks.forEach(function(a){a.classList.toggle('active',a.dataset.lang===lang);});
    var navItems=document.querySelectorAll('#navMenu>li>a:not(.nav__cta)');
    c.nav.forEach(function(text,i){if(navItems[i])navItems[i].textContent=text;});
    setText('.nav__cta',c.cta);
    setText('#navLoginBtn strong',c.loginStrong);
    setText('#navLoginBtn em',c.loginEm);
    setText('.nav__user-copy em',c.userEm);
    setText('.hero__label',c.heroLabel);
    setText('.hero__h1-main',c.heroMain);
    setText('.hero__h1-sub',c.heroSub);
    setText('.hero__desc',c.heroDesc);
    setText('.hero__btns .btn--gold',c.btn1);
    setText('.hero__btns .btn--line',c.btn2);
    try{localStorage.setItem('asterLang',lang);}catch(err){}
    if(notify&&window.showToast)window.showToast(c.toast);
  }
  langLinks.forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();applyLang(this.dataset.lang,true);});});
  var saved='zh';
  try{saved=localStorage.getItem('asterLang')||'zh';}catch(err){}
  applyLang(saved,false);
}

function openAuth(tab){
  authModal.classList.add('active');document.body.style.overflow='hidden';
  document.querySelectorAll('.auth__tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===tab);});
  loginForm.style.display=tab==='login'?'block':'none';
  registerForm.style.display=tab==='register'?'block':'none';
  authError.style.display='none';
}
function closeAuth(){authModal.classList.remove('active');document.body.style.overflow='';authError.style.display='none';}
authModalBackdrop.addEventListener('click',closeAuth);
authModalClose.addEventListener('click',closeAuth);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&authModal.classList.contains('active'))closeAuth();});

function setupAuth(){
  document.querySelectorAll('.auth__tab').forEach(function(t){t.addEventListener('click',function(){openAuth(this.dataset.tab);});});
  document.querySelectorAll('.auth__switch').forEach(function(l){l.addEventListener('click',function(e){e.preventDefault();openAuth(this.dataset.target);});});

  loginForm.addEventListener('submit',function(e){
    e.preventDefault();authError.style.display='none';
    var b=loginForm.querySelector('button');b.disabled=true;b.textContent='登录中...';
    AsterAPI.login(loginForm.querySelector('[name=email]').value,loginForm.querySelector('[name=password]').value)
    .then(function(){updateAuthUI();closeAuth();showToast('登录成功！');})
    .catch(function(err){authError.textContent=err.message;authError.style.display='block';})
    .finally(function(){b.disabled=false;b.textContent='登录';});
  });

  registerForm.addEventListener('submit',function(e){
    e.preventDefault();authError.style.display='none';
    var info={};registerForm.querySelectorAll('[name]').forEach(function(f){info[f.name]=f.value;});info.source='web';
    var b=registerForm.querySelector('button');b.disabled=true;b.textContent='注册中...';
    AsterAPI.register(info)
    .then(function(){updateAuthUI();closeAuth();showToast('注册成功！');})
    .catch(function(err){authError.textContent=err.message;authError.style.display='block';})
    .finally(function(){b.disabled=false;b.textContent='注册';});
  });

  navUserBtn.addEventListener('click',function(){navUserDropdown.classList.toggle('show');});
  document.addEventListener('click',function(e){if(!navUser.contains(e.target))navUserDropdown.classList.remove('show');});
  btnLogout.addEventListener('click',function(e){e.preventDefault();AsterAPI.logout().then(function(){updateAuthUI();showToast('已退出');});});
  btnProfile.addEventListener('click',function(e){e.preventDefault();navUserDropdown.classList.remove('show');var u=AsterAPI.getUser();if(!u)return;alert(['👤 '+(u.name||'-'),'📧 '+(u.email||'-'),'💬 '+(u.wechat||'-'),'🎯 '+(u.targetStage||'-'),u.isAdmin?'\n🔑 管理员权限':''].join('\n'));});
  btnDashboard.addEventListener('click',function(e){e.preventDefault();navUserDropdown.classList.remove('show');loadAdmin();});
}

function updateAuthUI(){
  var u=AsterAPI.getUser();
  if(u){
    isLoggedIn=true;isAdmin=!!u.isAdmin;
    navUser.style.display='block';if(navLoginBtn)navLoginBtn.style.display='none';
    navUserName.textContent=u.name||(u.email?u.email.split('@')[0]:'用户');
    navUserAvatar.textContent=(u.name||u.email||'?')[0].toUpperCase();
    btnDashboard.style.display=isAdmin?'block':'none';
  }else{
    isLoggedIn=false;isAdmin=false;
    navUser.style.display='none';if(navLoginBtn)navLoginBtn.style.display='';
    btnDashboard.style.display='none';adminDashboard.style.display='none';
  }
}

function loadAdmin(){
  if(!isAdmin){showToast('没有管理员权限');return;}
  adminDashboard.style.display='block';adminDashboard.scrollIntoView({behavior:'smooth'});
  AsterAPI.getStats().then(function(s){
    document.getElementById('statTotal').textContent=s.totalUsers||0;
    document.getElementById('statToday').textContent=s.newToday||0;
    document.getElementById('statWeek').textContent=s.newThisWeek||0;
    document.getElementById('statActive').textContent=s.activeToday||0;
  }).catch(function(){});
  loadUsers();loadContacts();
}

function loadUsers(s){
  AsterAPI.getUsers({search:s||'',limit:100}).then(function(d){
    var t=document.getElementById('adminUserList');
    t.innerHTML=d.users.length?d.users.map(function(u){return'<tr><td>'+(u.name||'-')+'</td><td>'+(u.email||'-')+'</td><td>'+(u.wechat||'-')+'</td><td>'+(u.targetStage||u.target_stage||'-')+'</td><td>'+(u.createdAt||'').slice(0,10)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:#666;padding:2rem">暂无数据</td></tr>';
  }).catch(function(){});
}

function loadContacts(){
  var tok=AsterAPI.getToken();if(!tok)return;
  fetch('/api/admin/contacts?limit=100',{headers:{'Authorization':'Bearer '+tok}}).then(function(r){return r.json();}).then(function(d){
    var t=document.getElementById('adminContactList');
    t.innerHTML=(d.contacts||[]).length?d.contacts.map(function(c){return'<tr><td>'+(c.name||'-')+'</td><td>'+(c.contact||'-')+'</td><td>'+(c.target||'-')+'</td><td>'+(c.message||'-')+'</td><td>'+(c.createdAt||'').slice(0,10)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:#666;padding:2rem">暂无记录</td></tr>';
  }).catch(function(){});
}

var adminSearch=document.getElementById('adminSearch');
if(adminSearch){var st;adminSearch.addEventListener('input',function(){clearTimeout(st);st=setTimeout(function(){loadUsers(adminSearch.value);},400);});}
var btnExport=document.getElementById('btnExport');
if(btnExport)btnExport.addEventListener('click',function(){AsterAPI.exportCSV().then(function(b){downloadBlob(b,'users.csv');showToast('导出成功');}).catch(function(){showToast('导出失败');});});
var btnExportContacts=document.getElementById('btnExportContacts');
if(btnExportContacts)btnExportContacts.addEventListener('click',function(){
  var tok=AsterAPI.getToken();if(!tok)return;
  fetch('/api/admin/contacts/export',{headers:{'Authorization':'Bearer '+tok}}).then(function(r){if(!r.ok)throw new Error('');return r.blob();}).then(function(b){downloadBlob(b,'contacts.csv');showToast('导出成功');}).catch(function(){showToast('导出失败');});
});

function downloadBlob(b,n){var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=n;a.click();URL.revokeObjectURL(u);}

function setupForm(){
  if(!contactForm)return;
  contactForm.addEventListener('submit',function(e){
    e.preventDefault();
    var valid=true;
    contactForm.querySelectorAll('[required]').forEach(function(f){
      var er=f.parentElement.querySelector('.field__err');f.classList.remove('error');if(er)er.textContent='';
      if(!f.value.trim()){f.classList.add('error');if(er)er.textContent='必填项目';valid=false;}
    });
    if(!valid)return;
    var btn=contactForm.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='提交中...';
    var data={};contactForm.querySelectorAll('[name]').forEach(function(f){if(f.value.trim())data[f.name]=f.value.trim();});
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'提交失败');return j;});})
    .then(function(r){showToast(r.message||'已收到！');contactForm.reset();})
    .catch(function(err){showToast(err.message||'提交失败，请稍后重试');})
    .finally(function(){btn.disabled=false;btn.textContent='提交咨询 · 免费评估';});
  });
  contactForm.querySelectorAll('input,select,textarea').forEach(function(f){f.addEventListener('input',function(){this.classList.remove('error');var e=this.parentElement.querySelector('.field__err');if(e)e.textContent='';});});
}

function setupCounters(){
  var done=false;
  function chk(){
    if(done)return;var el=document.querySelector('.stat__num');if(!el)return;
    var r=el.getBoundingClientRect();if(r.top>=window.innerHeight||r.bottom<=0)return;
    done=true;
    document.querySelectorAll('[data-count]').forEach(function(e){var tg=parseInt(e.dataset.count),dr=1800,st=performance.now();(function up(now){var p=Math.min((now-st)/dr,1),v=Math.floor((1-Math.pow(1-p,3))*tg);e.textContent=v;if(p<1)requestAnimationFrame(up);else e.textContent=tg;})(st);});
  }
  window.addEventListener('scroll',chk);chk();
}

window.showToast=function(m){toast.textContent=m;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},3500);};
init();
})();
