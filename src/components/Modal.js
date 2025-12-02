// src/components/Modal.js

import { createButton } from './Button.js';

export function createModal({ title, bodyBuilder, onClose, primary, secondary }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'modal-card';
  card.tabIndex = -1;

  const header = document.createElement('div');
  header.className = 'modal-header';

  const heading = document.createElement('h2');
  heading.className = 'modal-title';
  heading.textContent = title || '';

  header.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'modal-body';

  if (bodyBuilder) {
    bodyBuilder(body);
  }

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  if (secondary) {
    const btn = createButton(secondary.label, {
      variant: secondary.variant || 'btn-outline'
    });
    btn.addEventListener('click', () => {
      if (secondary.onClick) secondary.onClick();
    });
    footer.appendChild(btn);
  }

  if (primary) {
    const btn = createButton(primary.label, {
      variant: primary.variant || 'btn-gold'
    });
    btn.addEventListener('click', () => {
      if (primary.onClick) primary.onClick();
    });
    footer.appendChild(btn);
  }

  card.append(header, body, footer);
  backdrop.appendChild(card);

  function open() {
    backdrop.classList.add('open');
    document.body.classList.add('no-scroll');
    setTimeout(() => {
      card.focus();
    }, 0);
  }

  function close() {
    backdrop.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (onClose) onClose();
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
    }
  });

  function handleKey(e) {
    if (e.key === 'Escape') {
      close();
    }
  }

  document.addEventListener('keydown', handleKey);

  return {
    root: backdrop,
    open,
    close,
    destroy() {
      document.removeEventListener('keydown', handleKey);
      backdrop.remove();
    }
  };
}
