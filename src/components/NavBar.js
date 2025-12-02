// src/components/NavBar.js

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home'
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: 'list'
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: 'calendar'
  }
];

function createIconSvg(kind) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');

  if (kind === 'home') {
    path.setAttribute('d', 'M3 12l9-9 9 9v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-9Z');
  } else if (kind === 'list') {
    path.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
  } else {
    // calendar
    path.setAttribute(
      'd',
      'M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 0 0 2-2v-6H3v6a2 2 0 0 0 2 2Z'
    );
  }

  svg.appendChild(path);
  return svg;
}

export function createNavBar({ onTabChange }) {
  const nav = document.createElement('nav');
  nav.className = 'tab-bar';
  nav.setAttribute('aria-label', 'Main navigation');

  const buttons = new Map();

  NAV_ITEMS.forEach((item, idx) => {
    const button = document.createElement('button');
    button.className = 'tab-bar-button';
    button.dataset.page = item.id;
    button.type = 'button';
    button.appendChild(createIconSvg(item.icon));
    button.appendChild(document.createTextNode(item.label));

    button.addEventListener('click', () => {
      if (onTabChange) onTabChange(item.id);
    });

    if (idx === 0) {
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
    }

    buttons.set(item.id, button);
    nav.appendChild(button);
  });

  function setActive(pageId) {
    buttons.forEach((btn, id) => {
      const isActive = id === pageId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
  }

  return {
    root: nav,
    setActive
  };
}
