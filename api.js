// Aster API Client
var AsterAPI = (function () {
  'use strict';

  var BASE = '/api';
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

  async function request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) {
      opts.headers['Authorization'] = 'Bearer ' + token;
    }
    if (body) {
      opts.body = JSON.stringify(body);
    }
    var res = await fetch(BASE + path, opts);
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '请求失败');
    }
    return data;
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
