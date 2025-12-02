// src/pages/HomePage.js

import { createCard } from '../components/Card.js';
import { createToastContainer } from '../components/Toast.js';
import { createWeatherWidget } from '../components/WeatherWidget.js';
import { createCommuteCard } from '../components/CommuteCard.js';
import { formatFullDate, formatTime24to12 } from '../utils/formatters.js';

export function createHomePage({ store, onOpenReservation }) {
  const root = document.createElement('section');
  root.className = 'page page-home';
  root.dataset.page = 'home';

  const toastContainer = createToastContainer();
  root.appendChild(toastContainer);

  const upcomingCard = createCard();

  const upTitle = document.createElement('h2');
  upTitle.className = 'section-title';
  upTitle.textContent = 'Upcoming Reservation';

  const upBody = document.createElement('div');
  upBody.className = 'text-muted';
  upBody.textContent = 'No upcoming reservations.';

  upcomingCard.append(upTitle, upBody);

  const quickCard = createCard();
  const quickTitle = document.createElement('h2');
  quickTitle.className = 'section-title';
  quickTitle.textContent = 'Quick View Resources';

  const quickList = document.createElement('div');
  quickList.style.display = 'flex';
  quickList.style.flexDirection = 'column';
  quickList.style.gap = '6px';

  quickCard.append(quickTitle, quickList);

  const weatherTitle = document.createElement('h2');
  weatherTitle.className = 'section-title';
  weatherTitle.textContent = 'Boston Weather';

  const weatherWidget = createWeatherWidget();

  const commuteCard = createCommuteCard({
    onProfileAddress(addr) {
      const st = store.getState();
      if (!st.profile) return;
      store.setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, address: addr }
      }));
    }
  });

  root.append(
    upcomingCard,
    weatherTitle,
    weatherWidget.root,
    commuteCard.root,
    quickCard
  );

  function findUpcoming(reservations) {
    if (!reservations || !reservations.length) return null;

    // 1️⃣ Persistent reservations (Lockers & Racks)
    const persistent = reservations.filter(
      (r) => r.lockerNumber || r.rackNumber
    );

    if (persistent.length > 0) {
     // Return the earliest-created persistent reservation
     return persistent[0];
    }

    // 2️⃣ Normal time-based reservations (future only)
    const now = new Date();

    const upcoming = reservations
     .filter((r) => {
       if (!r.date || !r.time) return false;
       const dt = new Date(`${r.date}T${r.time}`);
       return dt >= now;
      })
      .sort((a, b) => {
        const ad = new Date(`${a.date}T${a.time}`);
        const bd = new Date(`${b.date}T${b.time}`);
        return ad - bd;
      })[0];

    return upcoming || null;
  }


  function renderUpcoming() {
  const state = store.getState();
  const next = findUpcoming(state.reservations || []);

  if (!next) {
    upBody.textContent = 'No upcoming reservations.';
    return;
  }

  // ✅ Locker
  if (next.lockerNumber) {
    upBody.textContent = `${next.resourceName} • Locker ${next.lockerNumber} • Reserved until released`;
    return;
  }

  // ✅ Bike / Scooter rack
  if (next.rackNumber) {
    upBody.textContent = `${next.resourceName} • Rack ${next.rackNumber} • Reserved until released`;
    return;
  }

  // ✅ Normal time-based reservation
  const dateText = formatFullDate(next.date);
  const timeText = formatTime24to12(next.time);
  upBody.textContent = `${next.resourceName} • ${dateText} • ${timeText} (${next.duration} hr)`;
}


  function renderQuickResources() {
    const state = store.getState();
    const top = (state.resources || []).slice(0, 3);
    quickList.innerHTML = '';
    top.forEach((res) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      const label = document.createElement('div');
      label.textContent = res.name;
      label.style.fontSize = '14px';

      const reserveBtn = document.createElement('button');
      reserveBtn.type = 'button';
      reserveBtn.className = 'btn btn-outline';
      reserveBtn.textContent = 'Reserve';
      reserveBtn.style.fontSize = '12px';
      reserveBtn.addEventListener('click', () => {
        if (onOpenReservation) onOpenReservation(res);
      });

      row.append(label, reserveBtn);
      quickList.appendChild(row);
    });
  }

  let unsubscribe = null;

  function mount() {
    renderUpcoming();
    renderQuickResources();
    const state = store.getState();
    if (state.profile?.address) {
      commuteCard.setAddress(state.profile.address);
    }
    unsubscribe = store.subscribe(() => {
      renderUpcoming();
      renderQuickResources();
    });
  }

  function unmount() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }

  return {
    root,
    toastContainer,
    mount,
    unmount,
    setVisible(isVisible) {
      root.classList.toggle('hidden', !isVisible);
      if (isVisible) {
        mount();
      } else {
        unmount();
      }
    }
  };
}
