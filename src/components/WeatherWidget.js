// src/components/WeatherWidget.js

import { createCard } from './Card.js';
import { fetchWeatherForBoston, mapWeatherCode } from '../services/weatherService.js';

export function createWeatherWidget() {
  const root = document.createElement('div');

  const card = createCard(['weather-card']);
  card.style.marginBottom = '12px';

  const main = document.createElement('div');
  main.className = 'weather-main';

  const emojiEl = document.createElement('div');
  emojiEl.style.fontSize = '28px';

  const infoWrap = document.createElement('div');
  const tempEl = document.createElement('div');
  tempEl.style.fontSize = '18px';
  tempEl.style.fontWeight = '700';

  const descEl = document.createElement('div');
  descEl.className = 'text-muted';
  descEl.style.fontSize = '13px';

  infoWrap.append(tempEl, descEl);

  main.append(emojiEl, infoWrap);
  card.appendChild(main);

  const miniRow = document.createElement('div');
  miniRow.className = 'weather-mini-row';
  miniRow.style.marginTop = '10px';
  card.appendChild(miniRow);

  // ⭐ NEW: smart commute tip element
  const tipEl = document.createElement('div');
  tipEl.className = 'weather-advice';
  tipEl.style.display = 'block';           // force visible
  tipEl.style.marginTop = '8px';
  tipEl.style.fontSize = '12px';
  tipEl.style.color = 'var(--muted)';
  tipEl.textContent = 'Loading commute tip...';
  card.appendChild(tipEl);


  const expandCard = createCard();
  expandCard.classList.add('hidden');
  const expandInner = document.createElement('div');
  expandInner.style.maxHeight = '140px';
  expandInner.style.overflowY = 'auto';
  expandCard.appendChild(expandInner);

  root.append(card, expandCard);

  let hourlyState = null;
  let expanded = false;

  function toggleExpand() {
    expanded = !expanded;
    expandCard.classList.toggle('hidden', !expanded);
  }

  main.addEventListener('click', toggleExpand);

  // ⭐ NEW: simple rule-based "AI" advice from weather
  function buildCommuteAdvice(currentWeather) {
    if (!currentWeather) {
      return 'Check the commute estimator and weather to plan ahead.';
    }

    const temp = currentWeather.temperature;      // °C
    const code = currentWeather.weathercode;      // Open-Meteo code
    const [label] = mapWeatherCode(code);

    const rainyCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
    const snowyCodes = [71, 73, 75, 77];
    const badWeather = rainyCodes.includes(code) || snowyCodes.includes(code);
    const niceWeather = [0, 1, 2].includes(code);

    if (badWeather && temp <= 5) {
      return 'Bad weather today (cold and wet). Plan extra time, book a locker, and avoid bringing a bike or scooter.';
    }

    if (badWeather) {
      return 'Rainy conditions today. Consider booking a locker so you don\'t carry wet gear and maybe skip the bike/scooter.';
    }

    if (snowyCodes.includes(code)) {
      return 'Snow in the forecast. Give yourself extra commute time and avoid riding a bike or scooter.';
    }

    if (niceWeather && temp >= 8 && temp <= 23) {
      return 'Nice weather today. If traffic feels heavy, riding a bike or walking part of the route could be a good option.';
    }

    if (temp <= 0) {
      return 'Very cold today. Dress warm and think about booking a locker so you don\'t have to carry extra layers all day.';
    }

    if (temp >= 28) {
      return 'Hot day ahead. Bring water and try to travel light – a locker can help you avoid carrying heavy stuff on your commute.';
    }

    return 'Weather looks okay. Use the commute estimator to check drive time and plan your locker or bike choices.';
  }

  async function refresh() {
    try {
      const data = await fetchWeatherForBoston();
      const cw = data.current_weather;
      const [label, emoji] = mapWeatherCode(cw.weathercode);

      emojiEl.textContent = emoji;
      tempEl.textContent = `${Math.round(cw.temperature)}°C`;
      descEl.textContent = `${label} · Boston`;

      // ⭐ NEW: show smart commute tip
      tipEl.textContent = buildCommuteAdvice(cw);

      hourlyState = data.hourly || null;
      renderMini(data);
      renderExpanded(data);
    } catch {
      descEl.textContent = 'Unable to load weather.';
      tipEl.textContent = 'Commute tip unavailable – check your connection and try again.';
    }
  }

  function renderMini(data) {
    miniRow.innerHTML = '';

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const codes = data.hourly.weathercode;

    const now = new Date();

    const rows = [];
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      if (t > now && rows.length < 5) {
        rows.push({
          time: t,
          temp: temps[i],
          code: codes[i]
        });
      }
    }

    rows.forEach((row) => {
      const chip = document.createElement('div');
      chip.className = 'weather-chip';
      chip.innerHTML = `
        <div style="font-size:12px;">${row.time.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        })}</div>
        <div style="font-size:14px;font-weight:700;">
          ${Math.round(row.temp)}°C
        </div>
      `;
      miniRow.appendChild(chip);
    });
  }

  function renderExpanded(data) {
    expandInner.innerHTML = '';
    if (!data.hourly) return;

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const codes = data.hourly.weathercode;
    const now = new Date();

    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      const diffHours = (t - now) / (1000 * 60 * 60);
      if (diffHours < 0 || diffHours > 24) continue;  // ⏱ only next 24 hours

      const row = document.createElement('div');
      row.style.padding = '4px 0';

      const when = document.createElement('span');
      when.textContent = t.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      when.style.fontWeight = '600';

      const tempSpan = document.createElement('span');
      tempSpan.textContent = `${Math.round(temps[i])}°C`;
      tempSpan.style.margin = '0 10px';
      tempSpan.style.minWidth = '42px';

      const codeSpan = document.createElement('span');
      const [label] = mapWeatherCode(codes[i]);
      codeSpan.textContent = label;
      codeSpan.style.fontSize = '12px';

      row.append(when, tempSpan, codeSpan);
      expandInner.appendChild(row);
    }
  }

  refresh();

  return {
    root,
    refresh
  };
}
