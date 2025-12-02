// src/config/appConfig.js

export const APP_NAME = 'CommuterHub';

export const SUFFOLK_LOCATION = {
  lat: 42.3586,
  lon: -71.0602
};

export const WEATHER_CONFIG = {
  lat: 42.3584,
  lon: -71.0598,
  apiBase: 'https://api.open-meteo.com/v1/forecast',
  refreshMs: 5 * 60 * 1000, // 5 min
  stampRefreshMs: 30 * 1000
};

export const COMMUTE_CONFIG = {
  geocodeBase: 'https://nominatim.openstreetmap.org/search',
  routeBase: 'https://router.project-osrm.org/route/v1/driving'
};

export const RESERVATION_CONFIG = {
  openMinutes: 7 * 60,  // 7:00
  closeMinutes: 23 * 60, // 23:00
  stepMinutes: 30,
  maxDurationHours: 2
};
