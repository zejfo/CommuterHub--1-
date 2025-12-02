// src/pages/BookingsPage.js

import { createCard } from '../components/Card.js';
import { createButton } from '../components/Button.js';
import { formatFullDate, formatTime24to12 } from '../utils/formatters.js';

export function createBookingsPage({ store, onModifyReservation }) {
  const root = document.createElement('section');
  root.className = 'page page-bookings hidden';
  root.dataset.page = 'bookings';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Your Bookings';

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '10px';

  root.append(title, list);

  function render() {
    const state = store.getState();
    const reservations = state.reservations || [];
    list.innerHTML = '';

    if (reservations.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = 'No bookings yet.';
      list.appendChild(empty);
      return;
    }

    reservations
      .slice()
      .sort((a, b) => {
        const ad = new Date(`${a.date}T${a.time}`);
        const bd = new Date(`${b.date}T${b.time}`);
        return ad - bd;
      })
      .forEach((r) => {
        const card = createCard();
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const name = document.createElement('div');
        name.textContent = r.resourceName;
        name.style.fontWeight = '700';

        const badge = document.createElement('span');
        badge.className = 'badge';
        const dt = new Date(`${r.date}T${r.time}`);
        const now = new Date();
        badge.textContent = dt > now ? 'Upcoming' : 'Past';

        header.append(name, badge);

        const when = document.createElement('p');
        when.style.fontSize = '13px';

        if (r.lockerNumber) {
          when.textContent = `Locker ${r.lockerNumber} • Reserved until released`;
        } else if (r.rackNumber) {
          when.textContent = `Rack ${r.rackNumber} • Reserved until released`;
        } else {
         when.textContent = `${formatFullDate(r.date)} ${formatTime24to12(
          r.time
          )} • ${r.duration} hr`;
        }


        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '6px';

        const modifyBtn = createButton('Modify', { variant: 'btn-outline' });
        const cancelBtn = createButton('Cancel', { variant: 'btn-outline' });

        modifyBtn.addEventListener('click', () => {
          if (onModifyReservation) onModifyReservation(r);
        });

        cancelBtn.addEventListener('click', () => {
          if (
            window.confirm(
              'Cancel this reservation? This cannot be undone.'
            )
          ) {
            const st = store.getState();
            const next = (st.reservations || []).filter(
              (x) => x.id !== r.id
            );
            store.setState((prev) => ({
              ...prev,
              reservations: next,
              ui: {
                ...prev.ui,
                lastToast: {
                  id: Date.now(),
                  message: 'Reservation cancelled',
                  type: 'info',
                  ts: Date.now()
                }
              }
            }));
          }
        });

        actions.append(modifyBtn, cancelBtn);

        card.append(header, when, actions);
        list.appendChild(card);
      });
  }

  let unsubscribe = null;

  function mount() {
    render();
    unsubscribe = store.subscribe(render);
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
