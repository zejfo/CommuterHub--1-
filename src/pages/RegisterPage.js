// src/pages/RegisterPage.js

import { createButton } from '../components/Button.js';

export function createRegisterPage({ onDone, onCancel }) {
  const root = document.createElement('section');
  root.className = 'page register-page';
  root.dataset.page = 'register';

  const title = document.createElement('h1');
  title.textContent = 'Create your profile';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-muted';
  subtitle.textContent = 'We use this to personalize your commute tools.';

  const form = document.createElement('form');
  form.style.width = '100%';
  form.style.maxWidth = '320px';
  form.autocomplete = 'off';

  function addField(labelText, id, type = 'text') {
    const field = document.createElement('div');
    field.className = 'field';
    const label = document.createElement('label');
    label.textContent = labelText;
    label.htmlFor = id;
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    field.append(label, input);
    form.appendChild(field);
    return input;
  }

  const firstNameInput = addField('First name', 'reg-first');
  const lastNameInput = addField('Last name', 'reg-last');
  const emailInput = addField('Email', 'reg-email', 'email');
  const addressInput = addField(
    'Home address (optional)',
    'reg-address',
    'text'
  );

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '10px';

  const cancelBtn = createButton('Cancel', { variant: 'btn-outline' });
  const doneBtn = createButton('Done', { variant: 'btn-gold' });
  doneBtn.type = 'submit';

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (onCancel) onCancel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      email: emailInput.value.trim(),
      address: addressInput.value.trim()
    };
    if (!profile.firstName || !profile.lastName || !profile.email) {
      alert('Please fill in first name, last name, and email.');
      return;
    }
    if (onDone) onDone(profile);
  });

  actions.append(cancelBtn, doneBtn);
  form.appendChild(actions);

  root.append(title, subtitle, form);

  return {
    root,
    setVisible(isVisible) {
      root.classList.toggle('hidden', !isVisible);
    }
  };
}
