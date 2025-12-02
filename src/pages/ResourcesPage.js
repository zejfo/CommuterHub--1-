// src/pages/ResourcesPage.js

import { createCard } from '../components/Card.js';
import { createButton } from '../components/Button.js';

export function createResourcesPage({ store, onReserve }) {
  const root = document.createElement('section');
  root.className = 'page page-resources hidden';
  root.dataset.page = 'resources';

  const header = document.createElement('div');
  header.style.marginBottom = '8px';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Resources';

  const searchField = document.createElement('div');
  searchField.className = 'field';
  const label = document.createElement('label');
  label.textContent = 'Search resources';
  label.htmlFor = 'resources-search-input';
  const input = document.createElement('input');
  input.id = 'resources-search-input';
  input.placeholder = 'Lockers, study rooms, bike parking…';

  searchField.append(label, input);
  header.append(title, searchField);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '10px';

  root.append(header, list);

  function renderList() {
    const query = input.value.trim().toLowerCase();
    const state = store.getState();
    const all = state.resources || [];
    const filtered = all.filter((r) => {
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        (r.description || '').toLowerCase().includes(query)
      );
    });

    list.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = 'No matching resources.';
      list.appendChild(empty);
      return;
    }

    filtered.forEach((res) => {
      const card = createCard();
      const name = document.createElement('h3');
      name.textContent = res.name;

      const desc = document.createElement('p');
      desc.className = 'text-muted';
      desc.textContent = res.description;

      const meta = document.createElement('p');
      meta.style.fontSize = '13px';
      meta.innerHTML = `<strong>Location:</strong> ${res.location}`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';

      const reserveBtn = createButton('Reserve Now', { variant: 'btn-gold' });
      reserveBtn.addEventListener('click', () => {
        if (onReserve) onReserve(res);
      });

      actions.appendChild(reserveBtn);
      card.append(name, desc, meta, actions);
      list.appendChild(card);
    });
  }

  input.addEventListener('input', () => renderList());

  let unsubscribe = null;

  function mount() {
    renderList();
    unsubscribe = store.subscribe(() => {
      renderList();
    });
  }

  function unmount() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }

  return {
    root,
    mount,
    unmount,
    setVisible(isVisible) {
      root.classList.toggle('hidden', !isVisible);
      if (isVisible) mount();
      else unmount();
    }
  };
}
