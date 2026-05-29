// Aster API Client
var AsterAPI = (function () {
  'use strict';

  var BASE = '/api';
  var RETRY_DELAYS = [1000, 2500, 5000];
  var token = localStorage.getItem('aster_token');
  var currentUser = null;

  function setToken(t) {
    token = t;
    if (t) {
      localStorage.setItem('aster_token', t);
    } else {
      localStorage.removeItem('aster_token');
    }
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isAuthPath(path) {
    return path === '/auth/login' || path === '/auth/register';
  }

  function isNetworkError(err) {
    return err && (
      err.name === 'TypeError' ||
      /Failed to fetch|NetworkError|Load failed|SSL|aborted|timeout|无法连接|网络/i.test(err.message || '')
    );
  }

  function parseJson(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { error: '服务器返回格式异常，请刷新后重试' };
    }
  }

  function xhrRequest(method, path, body) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, BASE + path, true);
      xhr.timeout = 18000;
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token && !isAuthPath(path)) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      }
      xhr.onload = function () {
        var data = parseJson(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || '请求失败'));
        }
      };
      xhr.onerror = function () { reject(new Error('NetworkError')); };
      xhr.ontimeout = function () { reject(new Error('Network timeout')); };
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  async function fetchRequest(method, path, body) {
    var opts = {
      method: method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    };
    if (token && !isAuthPath(path)) {
      opts.headers['Authorization'] = 'Bearer ' + token;
    }
    if (body) {
      opts.body = JSON.stringify(body);
    }
    if (!window.fetch) throw new Error('NetworkError');
    var res = await fetch(BASE + path, opts);
    var text = await res.text();
    var data = parseJson(text);
    if (!res.ok) {
      throw new Error(data.error || '请求失败');
    }
    return data;
  }

  async function requestOnce(method, path, body) {
    try {
      return await fetchRequest(method, path, body);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      return xhrRequest(method, path, body);
    }
  }

  async function request(method, path, body) {
    var lastErr;
    for (var i = 0; i <= RETRY_DELAYS.length; i++) {
      try {
        return await requestOnce(method, path, body);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        lastErr = err;
        if (i < RETRY_DELAYS.length) {
          await wait(RETRY_DELAYS[i]);
          try { await fetchRequest('GET', '/health'); } catch (e) {}
        }
      }
    }
    throw new Error('网络连接失败：服务器可能正在唤醒，请等 10 秒后再点一次登录');
  }

  return {
    getToken: function () { return token; },
    getUser: function () { return currentUser; },

    register: function (info) {
      return request('POST', '/auth/register', info).then(function (data) {
        setToken(data.token);
        currentUser = data.user;
        return data;
      });
    },

    login: function (email, password) {
      return request('POST', '/auth/login', { email: email, password: password }).then(function (data) {
        setToken(data.token);
        currentUser = data.user;
        return data;
      });
    },

    logout: function () {
      return request('POST', '/auth/logout').then(function () {
        setToken(null);
        currentUser = null;
      }).catch(function () {
        setToken(null);
        currentUser = null;
      });
    },

    getMe: function () {
      return request('GET', '/auth/me').then(function (data) {
        currentUser = data.user;
        return data;
      });
    },

    updateProfile: function (info) {
      return request('PUT', '/auth/profile', info).then(function (data) {
        currentUser = data.user;
        return data;
      });
    },

    // Admin
    getStats: function () {
      return request('GET', '/admin/stats');
    },

    getUsers: function (params) {
      var qs = [];
      if (params) {
        Object.keys(params).forEach(function (k) {
          if (params[k]) qs.push(k + '=' + encodeURIComponent(params[k]));
        });
      }
      return request('GET', '/admin/users' + (qs.length ? '?' + qs.join('&') : ''));
    },

    exportCSV: function () {
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(BASE + '/admin/users/export', { headers: headers }).then(function (res) {
        if (!res.ok) throw new Error('导出失败');
        return res.blob();
      });
    }
  };
})();
