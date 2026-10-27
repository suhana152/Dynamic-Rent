// One place for the backend address.
// Local testing:  http://localhost:5001/api
// Deployed (what the faculty will see): the Render URL below
const DR_CONFIG = {
  API_URL: "https://dynamicrent-api.onrender.com/api",

  // turns "/uploads/photo.jpg" into a full link on the backend server
  assetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${this.API_URL.replace(/\/api\/?$/, '')}${path}`;
  },
};

window.DR = window.DR || {};
window.DR.config = DR_CONFIG;