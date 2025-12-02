// src/components/SlotPicker.js

import { RESERVATION_CONFIG } from '../config/appConfig.js';

function minsToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * createSlotPicker
 *
 * @param {Object} initialDraft - { id, resourceId, date, time, duration }
 * @param {Function|Object} optionsOrOnChange - onChange callback or options:
 *    { onChange, isSlotAvailable }
 */
export function createSlotPicker(initialDraft, optionsOrOnChange) {
  const opts =
    typeof optionsOrOnChange === 'function'
      ? { onChange: optionsOrOnChange }
      : optionsOrOnChange || {};

  const { onChange, isSlotAvailable } = opts;

  const root = document.createElement('div');
  root.className = 'slot-picker';

  const weekStrip = document.createElement('div');
  weekStrip.className = 'week-strip';

  const grid = document.createElement('div');
  grid.className = 'slot-grid';

  const durationWrap = document.createElement('div');
  durationWrap.className = 'duration-choice';

  const durationOptions = [1, 2];
  let selectedDate = initialDraft.date;
  let selectedTime = initialDraft.time;
  let durationHours = initialDraft.duration || 1;

  const days = [];
  const today = new Date();
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset
    );
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, d });
  }

  function emitChange() {
    if (onChange) {
      onChange({
        date: selectedDate,
        time: selectedTime,
        duration: durationHours
      });
    }
  }

  function renderDays() {
    weekStrip.innerHTML = '';
    days.forEach((day, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'week-strip-button';
      const label =
        idx === 0
          ? 'Today'
          : day.d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
      btn.textContent = label;
      if (day.iso === selectedDate) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        selectedDate = day.iso;
        renderDays();
        renderSlots();
        emitChange();
      });
      weekStrip.appendChild(btn);
    });
  }

  function renderSlots() {
    grid.innerHTML = '';
    const { openMinutes, closeMinutes, stepMinutes } = RESERVATION_CONFIG;

    for (let m = openMinutes; m < closeMinutes; m += stepMinutes) {
      const timeStr = minsToTime(m);

      // Ask the outside world if this slot is free
      const available =
        !isSlotAvailable ||
        isSlotAvailable(selectedDate, timeStr, durationHours);

      const slotBtn = document.createElement('div');
      slotBtn.className = 'slot-card';
      slotBtn.classList.add(available ? 'available' : 'unavailable');
      slotBtn.textContent = timeStr;

      const range = document.createElement('small');
      range.textContent = `${durationHours} hr`;
      slotBtn.appendChild(range);

      if (!available) {
        // If our previously selected slot became unavailable, clear it
        if (timeStr === selectedTime) {
          selectedTime = null;
          emitChange();
        }
      } else {
        if (timeStr === selectedTime) {
          slotBtn.classList.add('selected');
        }
        slotBtn.addEventListener('click', () => {
          selectedTime = timeStr;
          renderSlots();
          emitChange();
        });
      }

      grid.appendChild(slotBtn);
    }

    // When modifying, keep selected slot visible – safe scrollIntoView
    const selectedEl = grid.querySelector('.slot-card.selected');
    if (selectedEl) {
      try {
        selectedEl.scrollIntoView({ block: 'nearest' });
      } catch {
        selectedEl.scrollIntoView();
      }
    }
  }

  function renderDuration() {
    durationWrap.innerHTML = '';
    durationOptions.forEach((h) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'duration-button';
      btn.textContent = `${h} hr`;
      if (h === durationHours) btn.classList.add('active');
      btn.addEventListener('click', () => {
        durationHours = h;
        renderSlots();
        renderDuration();
        emitChange();
      });
      durationWrap.appendChild(btn);
    });
  }

  if (!selectedDate && days[0]) {
    selectedDate = days[0].iso;
  }

  renderDays();
  renderDuration();
  renderSlots();
  emitChange();

  root.append(weekStrip, grid, durationWrap);

  return {
    root
  };
}
