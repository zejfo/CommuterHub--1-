# CommuterHub (Browser-only SPA)

This is a **single-page application** implemented with:

- HTML
- CSS
- Vanilla JavaScript (ES modules only)
- No React, no npm, no bundlers

You can open `index.html` directly in a browser and the app will run.

---

## Architecture

### High-level

The app is organized into:

- `index.html` – entry HTML and `.phone` frame container
- `src/main.js` – bootstrap + wiring
- `src/config` – static configuration (resources, app constants)
- `src/store/store.js` – central state manager (`getState`, `setState`, `subscribe`)
- `src/services` – API + localStorage access
- `src/components` – reusable UI building blocks
- `src/pages` – page-level views (Welcome, Register, Home, Resources, Bookings)
- `src/styles` – CSS tokens + main layout

Everything is wired through **ES module imports**. There are **no global script tags** and no framework.

### State Flow

The central store holds:

```js
{
  profile,        // user profile or null
  reservations,   // array of reservation objects
  resources,      // static resources from config
  activePage,     // 'welcome' | 'register' | 'home' | 'resources' | 'bookings'
  ui: {
    activeModal,  // null | 'profile' | 'reservation'
    lastToast,    // { id, message, type, ts } | null
    draftReservation // { id?, resourceId, date, time, duration } | null
  }
}
```

**Flow example:**

1. User hits `index.html`.  
2. `store.js` loads initial data from `storageService` (profile + reservations) and config resources.  
3. `main.js` inspects `profile`:
   - If no profile → `activePage = 'welcome'`
   - If profile exists → `activePage = 'home'`
4. `main.js` renders:
   - Welcome/Register pages (no app shell)
   - OR app shell (Header + NavBar + Home/Resources/Bookings)
5. Pages and components call `setState(updater)` to:
   - Switch pages (`activePage`)
   - Update profile / reservations
   - Open/close modals (`ui.activeModal`)
   - Trigger toasts (`ui.lastToast`)
6. `store.subscribe()` notifies main UI, pages, and components to re-render when needed.

### LocalStorage

All persistence goes through `src/services/storageService.js`:

- `loadProfile`, `saveProfile`
- `loadReservations`, `saveReservations`
- `clearAll`

`store.js` calls these functions internally whenever profile or reservations change, so pages/components never touch `localStorage` directly.

### API services

All HTTP calls go through `src/services`:

- `weatherService.js`
  - `fetchWeatherForBoston()` – Open-Meteo API
- `geoService.js`
  - `geocodeAddress(address)` – Nominatim geocoding
- `commuteService.js`
  - `fetchDriveTime(from, to)` – OSRM routing

Pages and components access these via the services, not `fetch` directly.

---

## Adding a New Feature

Example: Add a new **"Notifications"** tab.

1. **Add a new page module**

Create `src/pages/NotificationsPage.js`:

```js
export function createNotificationsPage() {
  const root = document.createElement('section');
  root.className = 'page page-notifications';
  root.dataset.page = 'notifications';
  root.innerHTML = `<h2>Notifications</h2><p>No notifications yet.</p>`;
  return {
    root,
    setVisible(isVisible) {
      root.classList.toggle('hidden', !isVisible);
    }
  };
}
```

2. **Register page in `main.js`**

- Import the page:
  ```js
  import { createNotificationsPage } from './pages/NotificationsPage.js';
  ```
- Instantiate and add to the main content container.
- Update the `pages` map so that when `activePage === 'notifications'`, `setVisible(true)` is called.

3. **Update NavBar**

In `src/components/NavBar.js`:

- Add a new nav item config:
  ```js
  { id: 'notifications', label: 'Notifications', icon: 'bell' }
  ```
- Ensure it calls the callback with `'notifications'`.

4. **Update state type**

In `store.js`, ensure `activePage` can take `'notifications'` and that initial state (if needed) can default to `'home'`.

5. **Use state + services**

If the feature needs persistent or remote data, use:

- `setState` / `getState` for state
- `storageService` for local persistence
- A new `notificationsService.js` if you talk to an API

---

## Running the App

No build step required:

1. Open the folder.
2. Double-click `index.html` OR open it in your browser.
3. Everything is loaded as ES modules and runs entirely in the browser.

If you want to avoid CORS / mixed-content issues on some machines, you can also run a lightweight static server (e.g., `python -m http.server`), but for grading, **double–click on `index.html` works.**
