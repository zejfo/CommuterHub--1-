// src/main.js

import { computeInitialPage, getState, setState, subscribe } from './store/store.js';
import { createHeader } from './components/Header.js';
import { createNavBar } from './components/NavBar.js';
import { createToastContainer, showToast } from './components/Toast.js';
import { createWelcomePage } from './pages/WelcomePage.js';
import { createRegisterPage } from './pages/RegisterPage.js';
import { createHomePage } from './pages/HomePage.js';
import { createResourcesPage } from './pages/ResourcesPage.js';
import { createBookingsPage } from './pages/BookingsPage.js';
import { createModal } from './components/Modal.js';
import { createSlotPicker } from './components/SlotPicker.js';
import { generateId } from './utils/idGenerator.js';
import { formatFullDate, formatTime24to12 } from './utils/formatters.js';
import { clearAll } from './services/storageService.js';

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const LOCKER_RANGE = { start: 100, end: 120 };
const RACK_RANGE = { start: 1, end: 20 }; // you can change this later


// Root
const phoneRoot = document.getElementById('phone-root');

// Toasts
const globalToast = createToastContainer();
document.body.appendChild(globalToast);

// Application frame containers
let headerCmp = null;
let navCmp = null;
let mainSlot = null;

// Pages
let welcomePage = null;
let registerPage = null;
let homePage = null;
let resourcesPage = null;
let bookingsPage = null;

// Modals
let profileModal = null;
let reservationModal = null;

function openProfileModal() {
  const st = getState();
  const profile = st.profile;
  if (!profile) return;

  if (profileModal) {
    profileModal.destroy();
  }

  profileModal = createModal({
    title: 'Profile',
    bodyBuilder(body) {
      const grid = document.createElement('div');
      grid.className = 'profile-grid';

      const avatar = document.createElement('div');
      avatar.className = 'profile-avatar';
      const initials =
        (profile.firstName?.[0] || '?') + (profile.lastName?.[0] || '');
      avatar.textContent = initials.toUpperCase();

      const info = document.createElement('div');
      info.innerHTML = `
        <div style="font-weight:700;">${profile.firstName} ${
        profile.lastName
      }</div>
        <div class="text-muted" style="font-size:13px;">${
          profile.email || ''
        }</div>
        <div class="text-muted" style="font-size:13px;margin-top:4px;">
          ${profile.address || 'No home address saved yet.'}
        </div>
      `;

      grid.append(avatar, info);
      body.appendChild(grid);
    },
    primary: {
      label: 'Log Out',
      variant: 'btn-outline',
      onClick() {
        clearAll();
        setState((prev) => ({
          ...prev,
          profile: null,
          reservations: [],
          activePage: 'welcome',
          ui: {
            activeModal: null,
            lastToast: {
              id: Date.now(),
              message: 'Logged out',
              type: 'info',
              ts: Date.now()
            },
            draftReservation: null
          }
        }));
        if (profileModal) profileModal.close();
      }
    },
    secondary: {
      label: 'Close',
      variant: 'btn-gold',
      onClick() {
        if (profileModal) profileModal.close();
      }
    }
  });

  document.body.appendChild(profileModal.root);
  profileModal.open();
}

function openReservationModal(resource, existingReservation) {
  if (reservationModal) {
    reservationModal.destroy();
  }

  const name = (resource.name || '').toLowerCase();
  const isLockerResource = name.includes('locker');
  const isRackResource = name.includes('bike') || name.includes('scooter');

  // ---------- SHARED DRAFT ----------
  const baseDraft = existingReservation || {
    id: null,
    resourceId: resource.id,
    resourceName: resource.name,
    date: null,
    time: null,
    duration: 1
  };

  // =========================================================
  //  A) LOCKER FLOW (numbers 100–120, no date/time question)
  // =========================================================
  if (isLockerResource) {
    function isLockerAvailable(lockerNumber) {
      const st = getState();
      const reservations = st.reservations || [];
      return !reservations.some((r) => {
        if (r.resourceId !== resource.id) return false;
        if (existingReservation && r.id === existingReservation.id) return false;
        return r.lockerNumber === lockerNumber;
      });
    }

    let selectedLocker = existingReservation?.lockerNumber || null;

    reservationModal = createModal({
      title: `Reserve ${resource.name}`,
      bodyBuilder(body) {
        const p = document.createElement('p');
        p.className = 'text-muted';
        p.textContent =
          'Choose a locker. It will stay reserved until you release it.';
        body.appendChild(p);

        const grid = document.createElement('div');
        grid.className = 'slot-grid locker-grid';

        for (let n = LOCKER_RANGE.start; n <= LOCKER_RANGE.end; n++) {
          const available = isLockerAvailable(n);

          const item = document.createElement('div');
          item.className = 'slot-card';
          item.textContent = String(n);

          const sub = document.createElement('small');
          sub.textContent = 'Locker';
          item.appendChild(sub);

          if (!available) {
            item.classList.add('unavailable');
          } else {
            if (selectedLocker === n) {
              item.classList.add('selected');
            }
            item.addEventListener('click', () => {
              selectedLocker = n;
              Array.from(grid.children).forEach((child) =>
                child.classList.remove('selected')
              );
              item.classList.add('selected');
            });
          }

          grid.appendChild(item);
        }

        body.appendChild(grid);

        const summary = document.createElement('div');
        summary.className = 'text-muted';
        summary.style.fontSize = '13px';
        summary.style.marginTop = '6px';

        function updateSummary() {
          if (!selectedLocker) {
            summary.textContent = 'No locker selected yet.';
          } else {
            summary.textContent = `Locker ${selectedLocker} • Reserved until released`;
          }
        }

        updateSummary();
        body.appendChild(summary);
      },
      primary: {
        label: existingReservation ? 'Update Reservation' : 'Confirm Reservation',
        variant: 'btn-gold',
        onClick() {
          if (!selectedLocker) {
            alert('Please choose a locker.');
            return;
          }
          if (!isLockerAvailable(selectedLocker)) {
            alert('That locker is already reserved.');
            return;
          }

          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          const timeStr = now.toTimeString().slice(0, 5);

          setState((prev) => {
            const list = prev.reservations || [];
            let next;

            if (existingReservation) {
              next = list.map((r) =>
                r.id === existingReservation.id
                  ? {
                      ...existingReservation,
                      lockerNumber: selectedLocker,
                      date: today,
                      time: timeStr,
                      duration: 0
                    }
                  : r
              );
            } else {
              next = [
                ...list,
                {
                  ...baseDraft,
                  id: generateId(),
                  lockerNumber: selectedLocker,
                  date: today,
                  time: timeStr,
                  duration: 0
                }
              ];
            }

            return {
              ...prev,
              reservations: next,
              ui: {
                ...prev.ui,
                lastToast: {
                  id: Date.now(),
                  message: existingReservation
                    ? 'Locker updated'
                    : 'Locker reserved',
                  type: 'success',
                  ts: Date.now()
                }
              }
            };
          });

          if (reservationModal) reservationModal.close();
        }
      },
      secondary: {
        label: 'Cancel',
        variant: 'btn-outline',
        onClick() {
          if (reservationModal) reservationModal.close();
        }
      }
    });

    document.body.appendChild(reservationModal.root);
    reservationModal.open();
    return; // ✅ done with lockers
  }

  // =========================================================
  //  B) BIKE / SCOOTER RACK FLOW (rack numbers, no date/time)
  // =========================================================
  if (isRackResource) {
    function isRackAvailable(rackNumber) {
      const st = getState();
      const reservations = st.reservations || [];
      return !reservations.some((r) => {
        if (r.resourceId !== resource.id) return false;
        if (existingReservation && r.id === existingReservation.id) return false;
        return r.rackNumber === rackNumber;
      });
    }

    let selectedRack = existingReservation?.rackNumber || null;

    reservationModal = createModal({
      title: `Reserve ${resource.name}`,
      bodyBuilder(body) {
        const p = document.createElement('p');
        p.className = 'text-muted';
        p.textContent =
          'Choose a rack. It will stay reserved until you release it.';
        body.appendChild(p);

        const grid = document.createElement('div');
        grid.className = 'slot-grid locker-grid';

        for (let n = RACK_RANGE.start; n <= RACK_RANGE.end; n++) {
          const available = isRackAvailable(n);

          const item = document.createElement('div');
          item.className = 'slot-card';
          item.textContent = String(n);

          const sub = document.createElement('small');
          sub.textContent = 'Rack';
          item.appendChild(sub);

          if (!available) {
            item.classList.add('unavailable');
          } else {
            if (selectedRack === n) {
              item.classList.add('selected');
            }
            item.addEventListener('click', () => {
              selectedRack = n;
              Array.from(grid.children).forEach((child) =>
                child.classList.remove('selected')
              );
              item.classList.add('selected');
            });
          }

          grid.appendChild(item);
        }

        body.appendChild(grid);

        const summary = document.createElement('div');
        summary.className = 'text-muted';
        summary.style.fontSize = '13px';
        summary.style.marginTop = '6px';

        function updateSummary() {
          if (!selectedRack) {
            summary.textContent = 'No rack selected yet.';
          } else {
            summary.textContent = `Rack ${selectedRack} • Reserved until released`;
          }
        }

        updateSummary();
        body.appendChild(summary);
      },
      primary: {
        label: existingReservation ? 'Update Reservation' : 'Confirm Reservation',
        variant: 'btn-gold',
        onClick() {
          if (!selectedRack) {
            alert('Please choose a rack.');
            return;
          }
          if (!isRackAvailable(selectedRack)) {
            alert('That rack is already reserved.');
            return;
          }

          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          const timeStr = now.toTimeString().slice(0, 5);

          setState((prev) => {
            const list = prev.reservations || [];
            let next;

            if (existingReservation) {
              next = list.map((r) =>
                r.id === existingReservation.id
                  ? {
                      ...existingReservation,
                      rackNumber: selectedRack,
                      date: today,
                      time: timeStr,
                      duration: 0
                    }
                  : r
              );
            } else {
              next = [
                ...list,
                {
                  ...baseDraft,
                  id: generateId(),
                  rackNumber: selectedRack,
                  date: today,
                  time: timeStr,
                  duration: 0
                }
              ];
            }

            return {
              ...prev,
              reservations: next,
              ui: {
                ...prev.ui,
                lastToast: {
                  id: Date.now(),
                  message: existingReservation
                    ? 'Rack updated'
                    : 'Rack reserved',
                  type: 'success',
                  ts: Date.now()
                }
              }
            };
          });

          if (reservationModal) reservationModal.close();
        }
      },
      secondary: {
        label: 'Cancel',
        variant: 'btn-outline',
        onClick() {
          if (reservationModal) reservationModal.close();
        }
      }
    });

    document.body.appendChild(reservationModal.root);
    reservationModal.open();
    return; // ✅ done with racks
  }

  // =========================================================
  //  C) NORMAL TIME-SLOT FLOW (study rooms, etc.)
  // =========================================================
  const draftTime = { ...baseDraft };

  function isSlotAvailable(date, timeStr, durationHours) {
    if (!date || !timeStr) return true;

    const st = getState();
    const reservations = st.reservations || [];
    const start = timeToMinutes(timeStr);
    const end = start + durationHours * 60;

    return !reservations.some((r) => {
      if (r.resourceId !== draftTime.resourceId || r.date !== date) return false;
      if (existingReservation && r.id === existingReservation.id) return false;

      const rStart = timeToMinutes(r.time);
      const rEnd = rStart + r.duration * 60;

      return start < rEnd && end > rStart;
    });
  }

  let updateSummary = null;

  const picker = createSlotPicker(draftTime, {
    onChange(partial) {
      draftTime.date = partial.date;
      draftTime.time = partial.time;
      draftTime.duration = partial.duration;
      if (updateSummary) updateSummary();
    },
    isSlotAvailable
  });

  reservationModal = createModal({
    title: `Reserve ${resource.name}`,
    bodyBuilder(body) {
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent =
        'Pick a day, time and duration. You can modify or cancel later.';
      body.appendChild(p);
      body.appendChild(picker.root);

      const summary = document.createElement('div');
      summary.className = 'text-muted';
      summary.style.fontSize = '13px';
      summary.style.marginTop = '6px';

      updateSummary = function () {
        if (!draftTime.date || !draftTime.time) {
          summary.textContent = 'No slot selected yet.';
          return;
        }
        summary.textContent = `${formatFullDate(
          draftTime.date
        )} · ${formatTime24to12(draftTime.time)} · ${draftTime.duration} hr`;
      };

      updateSummary();
      body.appendChild(summary);
    },
    primary: {
      label: existingReservation ? 'Update Reservation' : 'Confirm Reservation',
      variant: 'btn-gold',
      onClick() {
        if (!draftTime.date || !draftTime.time) {
          alert('Please choose a day and time.');
          return;
        }

        if (!isSlotAvailable(draftTime.date, draftTime.time, draftTime.duration)) {
          alert(
            'This time overlaps with an existing reservation for this resource.'
          );
          return;
        }

        setState((prev) => {
          const list = prev.reservations || [];
          let next;
          if (existingReservation) {
            next = list.map((r) =>
              r.id === existingReservation.id
                ? { ...existingReservation, ...draftTime }
                : r
            );
          } else {
            next = [
              ...list,
              {
                ...draftTime,
                id: generateId()
              }
            ];
          }
          return {
            ...prev,
            reservations: next,
            ui: {
              ...prev.ui,
              lastToast: {
                id: Date.now(),
                message: existingReservation
                  ? 'Reservation updated'
                  : 'Reservation confirmed',
                type: 'success',
                ts: Date.now()
              }
            }
          };
        });
        if (reservationModal) reservationModal.close();
      }
    },
    secondary: {
      label: 'Cancel',
      variant: 'btn-outline',
      onClick() {
        if (reservationModal) reservationModal.close();
      }
    }
  });

  document.body.appendChild(reservationModal.root);
  reservationModal.open();
}


function buildAppShell() {
  phoneRoot.innerHTML = '';

  const frame = document.createElement('div');
  frame.style.display = 'flex';
  frame.style.flexDirection = 'column';
  frame.style.height = '100%';

  headerCmp = createHeader({
    onProfileClick: () => openProfileModal()
  });

  const profile = getState().profile;
  const initials =
    (profile?.firstName?.[0] || '?') + (profile?.lastName?.[0] || '');
  headerCmp.setProfileInitials(initials.toUpperCase());

  mainSlot = document.createElement('main');
  mainSlot.className = 'app-main';

  navCmp = createNavBar({
    onTabChange: (pageId) => {
      setState((prev) => ({
        ...prev,
        activePage: pageId
      }));
    }
  });

  frame.append(headerCmp.root, mainSlot, navCmp.root);
  phoneRoot.appendChild(frame);

  homePage = createHomePage({
    store: { getState, setState, subscribe },
    onOpenReservation: (resource) => openReservationModal(resource)
  });

  resourcesPage = createResourcesPage({
    store: { getState, setState, subscribe },
    onReserve: (resource) => openReservationModal(resource)
  });

  bookingsPage = createBookingsPage({
    store: { getState, setState, subscribe },
    onModifyReservation(res) {
      const st = getState();
      const resource = (st.resources || []).find(
        (r) => r.id === res.resourceId
      );
      if (!resource) return;
      openReservationModal(resource, res);
    }
  });

  mainSlot.append(homePage.root, resourcesPage.root, bookingsPage.root);
}

function buildWelcomeFlow() {
  phoneRoot.innerHTML = '';

  const frame = document.createElement('div');
  frame.style.display = 'flex';
  frame.style.flexDirection = 'column';
  frame.style.height = '100%';

  welcomePage = createWelcomePage({
    onRegister() {
      setState((prev) => ({
        ...prev,
        activePage: 'register'
      }));
    },
    onGuest() {
      const guestProfile = {
        firstName: 'Guest',
        lastName: '',
        email: '',
        address: '',
        isGuest: true
      };

      setState((prev) => ({
        ...prev,
        profile: guestProfile,
        activePage: 'home'
      }));
    }
  });


  registerPage = createRegisterPage({
    onCancel() {
      setState((prev) => ({
        ...prev,
        activePage: 'welcome'
      }));
    },
    onDone(profile) {
      setState((prev) => ({
        ...prev,
        profile,
        activePage: 'home'
      }));
    }
  });

  frame.append(welcomePage.root, registerPage.root);
  phoneRoot.appendChild(frame);
}

function syncHeaderProfile() {
  const st = getState();
  if (!headerCmp) return;
  if (!st.profile) {
    headerCmp.setProfileInitials('?');
    return;
  }
  const initials =
    (st.profile.firstName?.[0] || '?') + (st.profile.lastName?.[0] || '');
  headerCmp.setProfileInitials(initials.toUpperCase());
}

function syncPages() {
  const st = getState();
  const page = st.activePage || computeInitialPage();

  if (!st.profile && page !== 'welcome' && page !== 'register') {
    setState((prev) => ({
      ...prev,
      activePage: 'welcome'
    }));
    return;
  }

  // 🔁 REPLACED BLOCK STARTS HERE
  if (page === 'welcome' || page === 'register') {
    if (!welcomePage || !registerPage || homePage || resourcesPage || bookingsPage || headerCmp || navCmp) {
      buildWelcomeFlow();
      homePage = null;
      resourcesPage = null;
      bookingsPage = null;
      headerCmp = null;
      navCmp = null;
    }
  } else {
    if (!homePage || !resourcesPage || !bookingsPage || !headerCmp || !navCmp) {
      buildAppShell();
      welcomePage = null;
      registerPage = null;
    }
  }
  // 🔁 REPLACED BLOCK ENDS HERE

  if (welcomePage && registerPage) {
    welcomePage.setVisible(page === 'welcome');
    registerPage.setVisible(page === 'register');
  }

  if (homePage && resourcesPage && bookingsPage) {
    homePage.setVisible(page === 'home');
    resourcesPage.setVisible(page === 'resources');
    bookingsPage.setVisible(page === 'bookings');

    if (navCmp) {
      navCmp.setActive(page);
    }
  }

  syncHeaderProfile();
}


function handleToastChanges(prev, next) {
  if (!prev.ui || !next.ui) return;
  const oldId = prev.ui.lastToast?.id;
  const newToast = next.ui.lastToast;
  if (newToast && newToast.id !== oldId) {
    showToast(globalToast, newToast.message);
  }
}

let lastState = getState();
setState((prev) => ({
  ...prev,
  activePage: computeInitialPage()
}));

syncPages();

subscribe((st) => {
  handleToastChanges(lastState, st);
  lastState = st;
  syncPages();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (reservationModal) {
      reservationModal.close();
    }
    if (profileModal) {
      profileModal.close();
    }
  }
});
