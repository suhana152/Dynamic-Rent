/**
 * api.js
 * Every call to the DynamicRent backend goes through here, so the base URL,
 * the login token and error handling live in one place.
 */

const DRApi = (() => {
  const getToken = () => {
    const user = window.DR.storage.getCurrentUser();
    return user && user.token ? user.token : null;
  };

  const buildQuery = (params) => {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const key in params) {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, value);
      }
    }
    const text = search.toString();
    return text ? `?${text}` : '';
  };

  const request = async (method, path, body) => {
    const headers = {};
    // login/register never need a token
    const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/register');
    const token = isAuthCall ? null : getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const options = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${window.DR.config.API_URL}${path}`, options);
    } catch (err) {
      throw new Error('Cannot reach the server. It may be waking up, please wait 30 seconds and try again.');
    }

    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    if (!response.ok) {
      // the saved login has expired or is invalid: sign out and ask to log in again
      if (response.status === 401 && token) {
        window.DR.storage.clearCurrentUser();
        window.location.href = 'login.html';
      }
      const error = new Error((data && data.message) || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  };

  return {
    get: (path, params) => request('GET', `${path}${buildQuery(params)}`),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
    getToken,
  };
})();

window.DR = window.DR || {};
window.DR.api = DRApi;