// src/components/CommuteCard.js

import { createCard } from './Card.js';
import { createButton } from './Button.js';
import { geocodeAddress } from '../services/geoService.js';
import { fetchDriveTime } from '../services/commuteService.js';
import { SUFFOLK_LOCATION } from '../config/appConfig.js';

export function createCommuteCard({ onProfileAddress }) {
  const card = createCard();
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = 'Commute Estimator';

  const desc = document.createElement('p');
  desc.className = 'text-muted';
  desc.textContent = 'Estimate drive time to Suffolk from your address.';

  const form = document.createElement('form');
  form.autocomplete = 'off';

  const field = document.createElement('div');
  field.className = 'field';
  const label = document.createElement('label');
  label.textContent = 'Home address';
  label.htmlFor = 'commute-address-input';

  const input = document.createElement('input');
  input.id = 'commute-address-input';
  input.placeholder = 'e.g., 120 Tremont St, Boston, MA';

  field.append(label, input);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '6px';

  const estimateBtn = createButton('Estimate', { variant: 'btn-gold' });
  estimateBtn.type = 'submit';

  const status = document.createElement('div');
  status.className = 'text-muted';
  status.style.fontSize = '13px';
  status.style.marginTop = '6px';

  actions.appendChild(estimateBtn);

  form.append(field, actions, status);

  const result = document.createElement('div');
  result.style.marginTop = '6px';
  result.style.fontWeight = '700';

  card.append(heading, desc, form, result);

  let working = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (working) return;
    const value = input.value.trim();
    if (!value) {
      status.textContent = 'Please enter an address.';
      return;
    }

    working = true;
    estimateBtn.disabled = true;
    status.textContent = 'Calculating…';
    result.textContent = '';

    try {
      const from = await geocodeAddress(value);
      const to = SUFFOLK_LOCATION;
      const { seconds } = await fetchDriveTime(from, to);
      const minutes = Math.round(seconds / 60);
      const label =
        minutes <= 2 ? 'Right next to campus' : `${minutes} minute drive`;
      result.textContent = label;
      status.textContent = 'Estimated car travel time.';
      if (onProfileAddress) {
        onProfileAddress(value);
      }
    } catch {
      status.textContent = 'Unable to estimate. Please try again.';
    } finally {
      working = false;
      estimateBtn.disabled = false;
    }
  });

  return {
    root: card,
    setAddress(addr) {
      if (addr) input.value = addr;
    }
  };
}
