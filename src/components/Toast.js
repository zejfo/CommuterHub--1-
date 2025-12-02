// src/components/Toast.js

export function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  return container;
}

export function showToast(container, message) {
  if (!container) return;
  container.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
