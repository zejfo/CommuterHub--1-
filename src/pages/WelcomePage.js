// src/pages/WelcomePage.js

import { createButton } from '../components/Button.js';

export function createWelcomePage({ onRegister, onGuest }) {
  const root = document.createElement('section');
  root.className = 'page welcome-page';
  root.dataset.page = 'welcome';

  const title = document.createElement('h1');
  title.textContent = 'Welcome to CommuterHub';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-muted';
  subtitle.textContent = 'Commuting made easy.';

  const buttonsWrap = document.createElement('div');
  buttonsWrap.style.marginTop = '18px';
  buttonsWrap.style.display = 'flex';
  buttonsWrap.style.flexDirection = 'column';
  buttonsWrap.style.gap = '10px';
  buttonsWrap.style.width = '100%';

  const register = createButton('Register', { variant: 'btn-gold' });
  const guest = createButton('Continue as Guest', { variant: 'btn-outline' });

  register.addEventListener('click', () => {
    if (onRegister) onRegister();
  });

  guest.addEventListener('click', () => {
    if (onGuest) onGuest();
  });

  buttonsWrap.append(register, guest);
  root.append(title, subtitle, buttonsWrap);

  return {
    root,
    setVisible(isVisible) {
      root.classList.toggle('hidden', !isVisible);
    }
  };
}
