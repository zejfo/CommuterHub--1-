// src/services/storageService.js

const PROFILE_KEY = 'ch_profile_v2';
const RESERVATIONS_KEY = 'ch_reservations_v2';

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    if (!profile) {
      localStorage.removeItem(PROFILE_KEY);
    } else {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  } catch {
    // ignore
  }
}

export function loadReservations() {
  try {
    const raw = localStorage.getItem(RESERVATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReservations(reservations) {
  try {
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations || []));
  } catch {
    // ignore
  }
}

export function clearAll() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(RESERVATIONS_KEY);
  } catch {
    // ignore
  }
}
