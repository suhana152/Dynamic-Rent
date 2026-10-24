// One place for the backend address.
// Local testing: use http://localhost:5001/api
// Deployed (what the faculty will see): the Render URL below
const DR_CONFIG = {
  API_URL: "https://dynamicrent-api.onrender.com/api",
};

window.DR = window.DR || {};
window.DR.config = DR_CONFIG;