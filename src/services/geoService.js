// src/services/geoService.js

import { COMMUTE_CONFIG } from '../config/appConfig.js';

export async function geocodeAddress(address) {
  const q = encodeURIComponent(address);
  const url = `${COMMUTE_CONFIG.geocodeBase}?q=${q}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Geocode failed');
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('No geocode result');
  }
  return {
    lat: parseFloat(json[0].lat),
    lon: parseFloat(json[0].lon)
  };
}
