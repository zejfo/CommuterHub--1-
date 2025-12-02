// src/utils/idGenerator.js

let counter = 0;

export function generateId() {
  counter += 1;
  return Date.now() + counter;
}
