// src/store/store.js

import { resources } from '../config/resources.js';
import {
  loadProfile,
  saveProfile,
  loadReservations,
  saveReservations
} from '../services/storageService.js';

const listeners = new Set();

const initialState = {
  profile: loadProfile(),
  reservations: loadReservations(),
  resources: resources.slice(),
  activePage: null,
  ui: {
    activeModal: null,
    lastToast: null,
    draftReservation: null
  }
};

let state = { ...initialState };

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function setState(updater) {
  const prev = state;
  const next = typeof updater === 'function' ? updater(prev) : updater;
  state = next;

  if (prev.profile !== next.profile) {
    saveProfile(next.profile);
  }
  if (prev.reservations !== next.reservations) {
    saveReservations(next.reservations);
  }

  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Called on startup to decide initial page
export function computeInitialPage() {
  const s = getState();
  if (!s.profile) {
    return 'welcome';
  }
  return 'home';
}
