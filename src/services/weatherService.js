// src/services/weatherService.js

import { WEATHER_CONFIG } from '../config/appConfig.js';

const WMAP = {
  0: ['Clear', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Depositing rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌧️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌧️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent rain showers', '⛈️'],
  95: ['Thunderstorm', '⛈️']
};

function emojiFor(code) {
  return (WMAP[code] || ['', '⛅'])[1];
}

export function mapWeatherCode(code) {
  return WMAP[code] || ['Weather', '⛅'];
}

export function getWeatherEmoji(code) {
  return emojiFor(code);
}

export async function fetchWeatherForBoston() {
  const { lat, lon, apiBase } = WEATHER_CONFIG;
  const url = `${apiBase}?latitude=${lat}&longitude=${lon}` +
    '&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=2';

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Weather fetch failed');
  }
  const data = await res.json();
  if (!data.current_weather) {
    throw new Error('No current weather');
  }
  return data;
}
