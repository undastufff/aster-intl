(function () {
  'use strict';

  // ===== State =====
  var isLoggedIn = false;
  var isAdmin = false;

  // ===== DOM Elements =====
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
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
  var mnavAccount = document.getElementById('mnavAccount');
  var navLoginBtn = document.getElementById('navLoginBtn');

  // ===== Initialize =====
  function init() {
    setupMobileNav();
    setupSmoothScroll();
    setupReveal();
    setupFormValidation();

    // Login button in nav
    if (navLoginBtn) {
      navLoginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAuthModal('login');
      });
    }

    // Try to restore session
    if (AsterAPI.getToken()) {
      AsterAPI.getMe().then(function () {
        updateAuthUI();
      }).catch(function () {
        AsterAPI.logout();
      });
    }
  }

  // ===== Mobile Nav =====
  function setupMobileNav() {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });

    // Mobile bottom nav
    var mnavItems = document.querySelectorAll('.mnav__item');
    mnavItems.forEach(function (item) {
      item.addEventListener('click', function () {
        mnavItems.forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
      });
    });

    // Mobile "My" button - show auth modal
    if (mnavAccount) {
      mnavAccount.addEventListener('click', function (e) {
        e.preventDefault();
        if (isLoggedIn) {
          // Toggle user dropdown
          navUserDropdown.classList.toggle('show');
        } else {
          openAuthModal('login');
        }
      });
    }
  }

  // ===== Auth UI =====
  function openAuthModal(tab) {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchAuthTab(tab);
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
    authError.style.display = 'none';
    authError.textContent = '';
  }

  authModalBackdrop.addEventListener('click', closeAuthModal);
  authModalClose.addEventListener('click', closeAuthModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
      closeAuthModal();
    }
  });

  // Auth tabs
  document.querySelectorAll('.auth__tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchAuthTab(this.dataset.tab);
    });
  });

  document.querySelectorAll('.auth__switch').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      switchAuthTab(this.dataset.target);
    });
  });

  function switchAuthTab(tab) {
    document.querySelectorAll('.auth__tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    loginForm.style.display = tab === 'login' ? 'block' : 'none';
    registerForm.style.display = tab === 'register' ? 'block' : 'none';
    authError.style.display = 'none';
  }

  // Login
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    authError.style.display = 'none';
    var email = loginForm.querySelector('[name=email]').value;
    var password = loginForm.querySelector('[name=password]').value;
    var btn = loginForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = '登录中...';

    AsterAPI.login(email, password).then(function () {
      updateAuthUI();
      closeAuthModal();
      showToast('登录成功！');
    }).catch(function (err) {
      authError.textContent = err.message;
      authError.style.display = 'block';
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '登录';
    });
  });

  // Register
  registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    authError.style.display = 'none';
    var fields = registerForm.querySelectorAll('[name]');
    var info = {};
    fields.forEach(function (f) { info[f.name] = f.value; });
    info.source = 'web';

    var btn = registerForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = '注册中...';

    AsterAPI.register(info).then(function () {
      updateAuthUI();
      closeAuthModal();
      showToast('注册成功！欢迎加入 Aster 🎌');
    }).catch(function (err) {
      authError.textContent = err.message;
      authError.style.display = 'block';
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '注册';
    });
  });

  // Nav user menu
  navUserBtn.addEventListener('click', function () {
    navUserDropdown.classList.toggle('show');
  });

  document.addEventListener('click', function (e) {
    if (!navUser.contains(e.target)) {
      navUserDropdown.classList.remove('show');
    }
  });

  btnLogout.addEventListener('click', function (e) {
    e.preventDefault();
    AsterAPI.logout().then(function () {
      updateAuthUI();
      showToast('已退出登录');
    });
  });

  btnProfile.addEventListener('click', function (e) {
    e.preventDefault();
    var user = AsterAPI.getUser();
    if (!user) { openAuthModal('login'); return; }
    navUserDropdown.classList.remove('show');
    // Show profile info
    var info = [];
    if (user.name) info.push('👤 姓名：' + user.name);
    if (user.email) info.push('📧 邮箱：' + user.email);
    if (user.wechat) info.push('💬 微信：' + user.wechat);
    if (user.phone) info.push('📱 手机：' + user.phone);
    if (user.targetStage) info.push('🎯 目标：' + user.targetStage);
    if (user.education) info.push('🎓 学历：' + user.education);
    var msg = info.join('\n') || '暂无个人资料';
    if (user.isAdmin) msg += '\n\n🔑 管理员权限已激活';
    alert(msg);
  });

  btnDashboard.addEventListener('click', function (e) {
    e.preventDefault();
    navUserDropdown.classList.remove('show');
    loadAdminDashboard();
  });

  // CTA buttons open auth
  document.querySelectorAll('[data-auth]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openAuthModal(btn.dataset.auth || 'register');
    });
  });

  function updateAuthUI() {
    var user = AsterAPI.getUser();
    if (user) {
      isLoggedIn = true;
      isAdmin = !!user.isAdmin;
      navUser.style.display = 'block';
      if (navLoginBtn) navLoginBtn.style.display = 'none';
      navUserName.textContent = user.name || user.email.split('@')[0];
      navUserAvatar.textContent = (user.name || user.email)[0].toUpperCase();
      btnDashboard.style.display = isAdmin ? 'block' : 'none';
    } else {
      isLoggedIn = false;
      isAdmin = false;
      navUser.style.display = 'none';
      if (navLoginBtn) navLoginBtn.style.display = '';
      btnDashboard.style.display = 'none';
      adminDashboard.style.display = 'none';
    }
  }

  // ===== Admin Dashboard =====
  function loadAdminDashboard() {
    if (!isAdmin) {
      showToast('没有管理员权限');
      return;
    }

    adminDashboard.style.display = 'block';
    adminDashboard.scrollIntoView({ behavior: 'smooth' });

    // Load stats
    AsterAPI.getStats().then(function (stats) {
      document.getElementById('statTotal').textContent = stats.totalUsers;
      document.getElementById('statToday').textContent = stats.newToday;
      document.getElementById('statWeek').textContent = stats.newThisWeek;
      document.getElementById('statActive').textContent = stats.activeToday;

      renderTargetChart(stats.byTarget);
      renderDailyChart(stats.byDay);
    }).catch(function (err) {
      console.error('Stats error:', err);
    });

    // Load users
    loadUserList();
    // Load contacts
    loadContactList();
  }

  function loadUserList(search) {
    AsterAPI.getUsers({ search: search, limit: 100 }).then(function (data) {
      var tbody = document.getElementById('adminUserList');
      if (!data.users.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#666">暂无用户数据</td></tr>';
        return;
      }
      tbody.innerHTML = data.users.map(function (u) {
        return '<tr>' +
          '<td>' + esc(u.name || '-') + '</td>' +
          '<td>' + esc(u.email || '-') + '</td>' +
          '<td>' + esc(u.wechat || '-') + '</td>' +
          '<td>' + esc(u.target_stage || '-') + '</td>' +
          '<td>' + esc(u.education || '-') + '</td>' +
          '<td>' + esc(u.source || '-') + '</td>' +
          '<td>' + esc(formatDate(u.created_at)) + '</td>' +
          '<td>' + (u.login_count || 0) + '</td>' +
          '</tr>';
      }).join('');
    }).catch(function (err) {
      console.error('Users error:', err);
    });
  }

  function loadContactList() {
    var token = AsterAPI.getToken();
    if (!token) return;
    fetch('/api/admin/contacts?limit=100', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var tbody = document.getElementById('adminContactList');
      if (!tbody) return;
      if (!data.contacts || !data.contacts.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#666">暂无咨询记录</td></tr>';
        return;
      }
      tbody.innerHTML = data.contacts.map(function(c) {
        return '<tr>' +
          '<td>' + esc(c.name) + '</td>' +
          '<td>' + esc(c.contact) + '</td>' +
          '<td>' + esc(c.target) + '</td>' +
          '<td>' + esc(c.message || '-') + '</td>' +
          '<td>' + esc(formatDate(c.createdAt)) + '</td>' +
          '</tr>';
      }).join('');
    }).catch(function(err) {
      console.error('Contacts error:', err);
    });
  }

  // Search
  var adminSearch = document.getElementById('adminSearch');
  if (adminSearch) {
    var searchTimer;
    adminSearch.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        loadUserList(adminSearch.value);
      }, 400);
    });
  }

  // Export CSV
  var btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', function () {
      AsterAPI.exportCSV().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'aster-users-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功');
      }).catch(function () {
        showToast('导出失败');
      });
    });

    // Export contacts CSV
    var btnExportContacts = document.getElementById('btnExportContacts');
    if (btnExportContacts) {
      btnExportContacts.addEventListener('click', function () {
        var token = AsterAPI.getToken();
        if (!token) { showToast('请先登录管理员账号'); return; }
        fetch('/api/admin/contacts/export', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function(res) {
          if (!res.ok) throw new Error('导出失败');
          return res.blob();
        }).then(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'aster-contacts-' + new Date().toISOString().split('T')[0] + '.csv';
          a.click();
          URL.revokeObjectURL(url);
          showToast('导出成功');
        }).catch(function() { showToast('导出失败'); });
      });
    }
  }

  function renderTargetChart(data) {
    var container = document.getElementById('chartTarget');
    if (!data.length) { container.innerHTML = '<p style="color:#666">暂无数据</p>'; return; }
    var max = Math.max.apply(null, data.map(function (d) { return d.count; }));
    container.innerHTML = data.map(function (d) {
      var pct = max > 0 ? Math.round(d.count / max * 100) : 0;
      var label = d.target_stage || '未选择';
      return '<div class="chart__bar">' +
        '<span class="chart__label">' + esc(label) + '</span>' +
        '<span class="chart__track"><span class="chart__fill" style="width:' + pct + '%"></span></span>' +
        '<span class="chart__val">' + d.count + '</span>' +
        '</div>';
    }).join('');
  }

  function renderDailyChart(data) {
    var container = document.getElementById('chartDaily');
    if (!data.length) { container.innerHTML = '<p style="color:#666">暂无数据</p>'; return; }
    var max = Math.max.apply(null, data.map(function (d) { return d.count; }));
    max = Math.max(max, 1);
    container.innerHTML = '<div class="chart__bars">' + data.map(function (d) {
      var h = Math.round(d.count / max * 100);
      return '<div class="chart__bar-v"><span class="chart__bar-fill" style="height:' + h + '%"></span><span class="chart__bar-date">' + d.day.slice(5) + '</span></div>';
    }).join('') + '</div>';
  }

  // ===== Smooth Scroll =====
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ===== Scroll Reveal =====
  function setupReveal() {
    var revealElements = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(function (el) { observer.observe(el); });
  }

  // ===== Counter Animation =====
  var countersAnimated = false;
  function animateCounters() {
    if (countersAnimated) return;
    var statsSection = document.querySelector('.results');
    if (!statsSection) return;
    var rect = statsSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      countersAnimated = true;
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        var duration = 2000;
        var start = performance.now();
        (function update(now) {
          var progress = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target);
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = target;
        })(start);
      });
    }
  }
  window.addEventListener('scroll', animateCounters);
  animateCounters();

  // ===== Contact Form =====
  function setupFormValidation() {
    if (!contactForm) return;
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      var required = contactForm.querySelectorAll('[required]');

      required.forEach(function (field) {
        var errorEl = field.parentElement.querySelector('.form__error');
        field.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
        if (!field.value.trim()) {
          field.classList.add('error');
          if (errorEl) errorEl.textContent = '必填项目';
          valid = false;
        }
      });

      if (valid) {
        var btn = contactForm.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = '提交中...';

        var data = {};
        contactForm.querySelectorAll('[name]').forEach(function(f) {
          if (f.value.trim()) data[f.name] = f.value.trim();
        });

        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function(r) { return r.json(); })
        .then(function(resp) {
          if (resp.error) {
            showToast(resp.error);
          } else {
            showToast(resp.message || '已收到！我们会在24小时内联系你 🎌');
            contactForm.reset();
          }
        }).catch(function() {
          showToast('提交失败，请稍后重试');
        }).finally(function() {
          btn.disabled = false; btn.textContent = '提交咨询 · 免费评估';
        });
      }
    });

    contactForm.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        this.classList.remove('error');
        var errorEl = this.parentElement.querySelector('.form__error');
        if (errorEl) errorEl.textContent = '';
      });
    });
  }

  // ===== Toast =====
  window.showToast = function (msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  };

  // ===== Helpers =====
  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(d) {
    if (!d) return '-';
    return d.slice(0, 10);
  }

  // ===== Hero scroll indicator =====
  var heroScroll = document.getElementById('heroScroll');
  if (heroScroll) {
    window.addEventListener('scroll', function () {
      heroScroll.style.opacity = window.scrollY > 100 ? '0' : '1';
      heroScroll.style.transition = 'opacity 0.3s';
    });
  }

  // ===== Init =====
  init();
})();
 