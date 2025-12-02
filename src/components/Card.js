// src/components/Card.js

export function createCard(classes = []) {
  const card = document.createElement('div');
  card.className = ['card', ...classes].join(' ');
  return card;
}
