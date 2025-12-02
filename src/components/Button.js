// src/components/Button.js

export function createButton(label, options = {}) {
  const btn = document.createElement('button');
  btn.type = options.type || 'button';
  btn.className = ['btn', options.variant || ''].join(' ').trim();
  btn.textContent = label;
  if (options.id) btn.id = options.id;
  if (options.ariaLabel) btn.setAttribute('aria-label', options.ariaLabel);
  return btn;
}
