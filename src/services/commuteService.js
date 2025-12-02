// src/services/commuteService.js

import { COMMUTE_CONFIG } from '../config/appConfig.js';

export async function fetchDriveTime(from, to) {
  const url =
    `${COMMUTE_CONFIG.routeBase}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Route failed');
  const json = await res.json();
  if (!json.routes || json.routes.length === 0) {
    throw new Error('No route');
  }
  return {
    seconds: json.routes[0].duration
  };
}
