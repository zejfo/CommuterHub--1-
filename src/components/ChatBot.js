// src/components/ChatBot.js

import { fetchWeatherForBoston, mapWeatherCode } from '../services/weatherService.js';
import { generateId } from '../utils/idGenerator.js';

const LOCKER_RANGE = { start: 100, end: 120 };
const RACK_RANGE = { start: 1, end: 20 }; // for future rack features

export function createChatBot({ store }) {
  const root = document.createElement('div');
  root.className = 'chatbot-root';

  // --- Toggle button ---
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'chatbot-toggle';
  toggleBtn.textContent = '💬';

  // --- Panel ---
  const panel = document.createElement('div');
  panel.className = 'chatbot-panel hidden';

  panel.innerHTML = `
    <div class="chatbot-header">
      CommuterHub Assistant
    </div>
    <div class="chatbot-messages"></div>
    <div class="chatbot-input-row">
      <input
        type="text"
        id="chatbot-input"
        name="chatbot-input"
        placeholder="Ask Rammy about lockers, study rooms, weather..."
      />
      <button type="button">Send</button>
    </div>
  `;

  const messagesEl = panel.querySelector('.chatbot-messages');
  const inputEl = panel.querySelector('input');
  const sendBtn = panel.querySelector('button');

  root.append(panel, toggleBtn);

  let isOpen = false;

  // Pending actions for YES / NO
  // cancel: { id, label }
  let pendingCancel = null;
  // booking:
  // { kind: 'locker'|'study', phase?, lockerNumber?, roomId?, roomName?, time24?, timeLabel? }
  let pendingBooking = null;

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('hidden', !isOpen);
    if (isOpen) {
      inputEl.focus();
    }
  }

  toggleBtn.addEventListener('click', togglePanel);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') togglePanel();
  });

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // ---------- UI helpers ----------

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chatbot-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addSystemTyping() {
    const div = document.createElement('div');
    div.className = 'chatbot-msg ai chatbot-typing';
    div.textContent = '…';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function handleSend() {
    const raw = inputEl.value.trim();
    if (!raw) return;
    inputEl.value = '';

    addMessage('user', raw);

    const typingEl = addSystemTyping();
    const reply = await buildReply(raw);
    typingEl.remove();

    addMessage('ai', reply);
  }

  // ---------- Data helpers ----------

  function getReservations() {
    const st = store.getState();
    return st.reservations || [];
  }

  function getResources() {
    const st = store.getState();
    return st.resources || [];
  }

  function getReservationsSummary() {
    const reservations = getReservations();
    if (!reservations.length) {
      return 'You do not have any active reservations yet.';
    }

    const now = new Date();

    const timed = reservations.filter((r) => r.date && r.time);
    const lockers = reservations.filter((r) => r.lockerNumber);
    const racks = reservations.filter((r) => r.rackNumber);

    let summary = '';

    if (timed.length) {
      const upcoming = timed
        .filter((r) => {
          const dt = new Date(`${r.date}T${r.time}`);
          return dt >= now;
        })
        .sort((a, b) => {
          const da = new Date(`${a.date}T${a.time}`);
          const db = new Date(`${b.date}T${b.time}`);
          return da - db;
        })[0];

      if (upcoming) {
        summary += `You have an upcoming reservation for ${upcoming.resourceName} on ${upcoming.date} at ${upcoming.time} for ${upcoming.duration} hour(s). `;
      }
    }

    if (lockers.length) {
      summary += `You currently have ${lockers.length} locker reservation(s) (reserved until released). `;
    }
    if (racks.length) {
      summary += `You currently have ${racks.length} bike/scooter rack reservation(s) (reserved until released). `;
    }

    if (!summary) {
      summary = 'You have reservations, but none with specific times coming up soon.';
    }

    return summary.trim();
  }

  function findLockerResource() {
    const resources = getResources();
    return resources.find((r) =>
      (r.name || '').toLowerCase().includes('locker')
    );
  }

  function findRackResource() {
    const resources = getResources();
    const nameIncludes = (n) =>
      n.includes('bike') || n.includes('scooter') || n.includes('rack');
    return resources.find((r) => nameIncludes((r.name || '').toLowerCase()));
  }

  function getStudyRooms() {
    const resources = getResources();
    const map = { A: null, B: null };

    resources.forEach((r) => {
      const name = (r.name || '').toLowerCase();
      if (name.includes('study room a')) {
        map.A = r;
      } else if (name.includes('study room b')) {
        map.B = r;
      }
    });

    return map;
  }

  function isLockerAvailable(num) {
    const list = getReservations();
    return !list.some((r) => r.lockerNumber === num);
  }

  function isRackAvailable(num) {
    const list = getReservations();
    return !list.some((r) => r.rackNumber === num);
  }

  function parseTimeFromText(text) {
    const lower = text.toLowerCase();
    const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return null;

    let hour = parseInt(m[1], 10);
    let minute = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3];

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    if (!ampm && hour >= 0 && hour <= 5) {
      // if user just writes "10" we assume daytime, not 10 PM vs 10 AM
      // but realistically 10 works as-is, 22 would be explicit.
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    const time24 = `${hh}:${mm}`;

    const fakeDate = new Date();
    fakeDate.setHours(hour, minute, 0, 0);
    const label = fakeDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    return { time24, label };
  }

  function userHasStudyAt(date, time24) {
    const reservations = getReservations();
    return reservations.some((r) => {
      const name = (r.resourceName || '').toLowerCase();
      const isStudy = name.includes('study room');
      return isStudy && r.date === date && r.time === time24;
    });
  }

  async function getWeatherAdvice() {
    try {
      const data = await fetchWeatherForBoston();
      const cw = data.current_weather;
      const [label] = mapWeatherCode(cw.weathercode);
      const temp = cw.temperature;

      const code = cw.weathercode;
      const rainyCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
      const snowyCodes = [71, 73, 75, 77];

      const isRain = rainyCodes.includes(code);
      const isSnow = snowyCodes.includes(code);
      const niceWeather = [0, 1, 2].includes(code);

      let base = `Right now in Boston it is about ${Math.round(
        temp
      )}°C and ${label.toLowerCase()}. `;

      if (isSnow || (isRain && temp <= 5)) {
        base +=
          'Conditions are pretty bad for biking or scooters. Plan extra time, consider booking a locker, and try not to bring a bike or scooter today.';
      } else if (isRain) {
        base +=
          'It is rainy, so driving or transit is safer. A locker is useful so you do not carry wet gear around.';
      } else if (niceWeather && temp >= 8 && temp <= 23) {
        base +=
          'Weather is nice for walking or biking. If car traffic feels heavy, riding a bike or walking part of the way could be a good option.';
      } else if (temp <= 0) {
        base +=
          'It is very cold. Dress warmly and think about booking a locker so you can store extra layers at Suffolk.';
      } else if (temp >= 28) {
        base +=
          'It is quite hot. Bring water and travel light. Lockers can help you avoid carrying heavy stuff in the heat.';
      } else {
        base +=
          'Weather looks okay. You can choose car, transit, or bike based on your preference.';
      }

      return base;
    } catch {
      return 'I could not load live weather right now, but you can still use the main weather card above.';
    }
  }

  // ---------- "Brain" ----------

  async function buildReply(rawText) {
    const text = rawText.trim().toLowerCase();

    // ===== YES / NO CONFIRMATION LAYER =====

    if (text === 'yes' || text === 'yes.' || text === 'y') {
      // Confirm cancel
      if (pendingCancel) {
        const state = store.getState();
        const current = state.reservations || [];
        const updated = current.filter((r) => r.id !== pendingCancel.id);

        store.setState((prev) => ({
          ...prev,
          reservations: updated,
          ui: {
            ...prev.ui,
            lastToast: {
              id: Date.now(),
              message: 'Reservation cancelled via Rammy',
              type: 'info',
              ts: Date.now()
            }
          }
        }));

        const label = pendingCancel.label;
        pendingCancel = null;
        return `✅ Okay, I cancelled your reservation for ${label}.`;
      }

      // Confirm booking (locker or study)
      if (pendingBooking) {
        if (pendingBooking.kind === 'locker') {
          const num = pendingBooking.lockerNumber;

          if (!isLockerAvailable(num)) {
            pendingBooking = null;
            return `Locker ${num} is no longer available. Try “free lockers” or reserve a different number.`;
          }

          const resource = findLockerResource();
          if (!resource) {
            pendingBooking = null;
            return 'I could not find a locker resource in the app. Please use the Resources tab to reserve a locker.';
          }

          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          const timeStr = now.toTimeString().slice(0, 5);

          store.setState((prev) => {
            const list = prev.reservations || [];
            const next = [
              ...list,
              {
                id: generateId(),
                resourceId: resource.id,
                resourceName: resource.name,
                date: today,
                time: timeStr,
                duration: 0,
                lockerNumber: num
              }
            ];
            return {
              ...prev,
              reservations: next,
              ui: {
                ...prev.ui,
                lastToast: {
                  id: Date.now(),
                  message: `Locker ${num} reserved`,
                  type: 'success',
                  ts: Date.now()
                }
              }
            };
          });

          const label = `Locker ${num}`;
          pendingBooking = null;
          return `✅ Done. I reserved ${label} for today. It will stay reserved until you release it.`;
        }

        if (pendingBooking.kind === 'study' && pendingBooking.phase === 'confirm') {
          const { roomId, roomName, time24, timeLabel } = pendingBooking;

          const now = new Date();
          const today = now.toISOString().slice(0, 10);

          // Don't double-book user
          if (userHasStudyAt(today, time24)) {
            pendingBooking = null;
            return `You already have a study room booked at ${timeLabel}. I won't create another one.`;
          }

          const resources = getResources();
          const resource = resources.find((r) => r.id === roomId);
          if (!resource) {
            pendingBooking = null;
            return 'I could not find that study room in the app anymore. Please use the Resources tab.';
          }

          store.setState((prev) => {
            const list = prev.reservations || [];
            const next = [
              ...list,
              {
                id: generateId(),
                resourceId: resource.id,
                resourceName: resource.name,
                date: today,
                time: time24,
                duration: 1
              }
            ];
            return {
              ...prev,
              reservations: next,
              ui: {
                ...prev.ui,
                lastToast: {
                  id: Date.now(),
                  message: `${roomName} reserved at ${timeLabel}`,
                  type: 'success',
                  ts: Date.now()
                }
              }
            };
          });

          pendingBooking = null;
          return `✅ Done. I reserved ${roomName} at ${timeLabel} for today.`;
        }
      }
    }

    if (text === 'no' || text === 'no.' || text === 'n') {
      if (pendingCancel) {
        const label = pendingCancel.label;
        pendingCancel = null;
        return `❌ Okay, I will NOT cancel your reservation for ${label}.`;
      }
      if (pendingBooking) {
        let label = 'that reservation';
        if (pendingBooking.kind === 'locker') {
          label = `Locker ${pendingBooking.lockerNumber}`;
        } else if (pendingBooking.kind === 'study') {
          label = pendingBooking.roomName || 'that study room';
        }
        pendingBooking = null;
        return `❌ Okay, I will NOT reserve ${label}.`;
      }
    }

    // ===== MULTI-STEP STUDY ROOM FLOW (remembering context) =====

    // Step 2: user choosing room (A or B)
    if (pendingBooking && pendingBooking.kind === 'study' && pendingBooking.phase === 'room') {
      const rooms = getStudyRooms();
      let chosenKey = null;

      if (text.includes('room a') || text === 'a') chosenKey = 'A';
      if (text.includes('room b') || text === 'b') chosenKey = 'B';

      if (!chosenKey) {
        return 'Please tell me “Room A” or “Room B”.';
      }

      const chosen = rooms[chosenKey];
      if (!chosen) {
        return `I could not find Group Study Room ${chosenKey} in the app.`;
      }

      pendingBooking = {
        kind: 'study',
        phase: 'time',
        roomId: chosen.id,
        roomName: chosen.name
      };

      return `Great, I’ll use ${chosen.name}. Tell me a time for today, for example “3pm” or “10:30 am”.`;
    }

    // Step 3: user giving time for study room
    if (pendingBooking && pendingBooking.kind === 'study' && pendingBooking.phase === 'time') {
      const parsed = parseTimeFromText(text);
      if (!parsed) {
        return 'I could not understand that time. Try something like “3pm” or “10:30 am”.';
      }

      const { time24, label } = parsed;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      if (userHasStudyAt(today, time24)) {
        const reservations = getReservations();
        const existing = reservations.find((r) => {
          const name = (r.resourceName || '').toLowerCase();
          return name.includes('study room') && r.date === today && r.time === time24;
        });
        if (existing) {
          pendingBooking = null;
          return `You already have a study room booked then: ${existing.resourceName} at ${existing.time}.`;
        }
      }

      const resources = getResources();
      const room = resources.find((r) => r.id === pendingBooking.roomId);
      if (!room) {
        pendingBooking = null;
        return 'I could not find that study room in the app anymore. Please use the Resources tab.';
      }

      pendingBooking = {
        kind: 'study',
        phase: 'confirm',
        roomId: room.id,
        roomName: room.name,
        time24,
        timeLabel: label
      };

      return `I can book ${room.name} today at ${label}. Do you want me to reserve it? Type YES or NO.`;
    }

    // ===== ACTION INTENTS =====

    // Help / capabilities
    if (
      text.includes('what can you do') ||
      text === 'help' ||
      text.startsWith('help ')
    ) {
      return (
        "I can help you with your commute tools. I can:\n" +
        "• Check your upcoming reservations.\n" +
        "• Cancel locker, rack, or study room reservations (with confirmation).\n" +
        "• Reserve a locker for you.\n" +
        "• Book a same-day study room (Room A or B) for a time you choose.\n" +
        "• Give weather-based tips for biking, driving, or walking.\n" +
        'Try asking things like: “Do I have any bookings today?”, “Cancel my locker.”, “Book room A at 3pm”, “Should I bring my bike?”, or “How is the weather for commuting?”.'
      );
    }

    // CANCEL LOCKER / RACK / STUDY ROOM
    if (text.includes('cancel')) {
      const reservations = getReservations();

      // Study room cancel
      if (text.includes('study') || text.includes('room')) {
        const study = reservations.filter((r) =>
          (r.resourceName || '').toLowerCase().includes('study room')
        );
        if (!study.length) {
          return "I couldn't find any study room reservations to cancel.";
        }

        let target = null;
        if (text.includes('room a')) {
          target = study.find((r) =>
            (r.resourceName || '').toLowerCase().includes('room a')
          );
        } else if (text.includes('room b')) {
          target = study.find((r) =>
            (r.resourceName || '').toLowerCase().includes('room b')
          );
        }

        if (!target) {
          // pick earliest upcoming
          const now = new Date();
          target = study
            .map((r) => ({ r, dt: new Date(`${r.date}T${r.time}`) }))
            .sort((a, b) => a.dt - b.dt)[0].r;
        }

        const label = `${target.resourceName} on ${target.date} at ${target.time}`;
        pendingCancel = { id: target.id, label };
        pendingBooking = null;

        return `I found a reservation for ${label}. Are you sure you want to cancel it? Type YES to confirm or NO to keep it.`;
      }

      // Locker / rack (old behavior)
      if (text.includes('locker') || text.includes('rack')) {
        const state = store.getState();
        const list = state.reservations || [];

        let target = null;
        let label = '';

        if (text.includes('locker')) {
          const lockers = list.filter((r) => r.lockerNumber);
          if (!lockers.length) {
            return "I couldn't find any locker reservations to cancel.";
          }

          const match = text.match(/(\d{3})/);
          if (match) {
            const num = parseInt(match[1], 10);
            target = lockers.find((r) => r.lockerNumber === num);

            if (!target) {
              const owned = lockers.map((r) => r.lockerNumber).join(', ');
              return `You don't have a reservation for Locker ${num}. Your locker reservations are: ${owned}.`;
            }
          } else {
            target = lockers[0];
          }

          label = `Locker ${target.lockerNumber}`;
        } else if (text.includes('rack')) {
          const racks = list.filter((r) => r.rackNumber);
          if (!racks.length) {
            return "I couldn't find any bike/scooter rack reservations to cancel.";
          }

          const match = text.match(/(\d{1,3})/);
          if (match) {
            const num = parseInt(match[1], 10);
            target = racks.find((r) => r.rackNumber === num);

            if (!target) {
              const owned = racks.map((r) => r.rackNumber).join(', ');
              return `You don't have a reservation for Rack ${num}. Your rack reservations are: ${owned}.`;
            }
          } else {
            target = racks[0];
          }

          label = `Rack ${target.rackNumber}`;
        }

        if (!target) {
          return "I couldn't find any matching locker or rack reservation to cancel.";
        }

        pendingCancel = { id: target.id, label };
        pendingBooking = null;

        return `I found a reservation for ${label}. Are you sure you want to cancel it? Type YES to confirm or NO to keep it.`;
      }
    }

    // BOOK / RESERVE LOCKER
    if (
      (text.includes('book') || text.includes('reserve')) &&
      text.includes('locker')
    ) {
      const resource = findLockerResource();
      if (!resource) {
        return 'I could not find a locker resource in the app. Please use the Resources tab to reserve a locker.';
      }

      const match = text.match(/(\d{3})/);
      let requestedNumber = match ? parseInt(match[1], 10) : null;

      if (requestedNumber !== null) {
        if (
          requestedNumber < LOCKER_RANGE.start ||
          requestedNumber > LOCKER_RANGE.end
        ) {
          return `Locker ${requestedNumber} is outside the valid range (${LOCKER_RANGE.start}–${LOCKER_RANGE.end}).`;
        }
        if (!isLockerAvailable(requestedNumber)) {
          return `Locker ${requestedNumber} is already reserved. Try a different number or say “free lockers” to check availability.`;
        }

        pendingBooking = {
          kind: 'locker',
          lockerNumber: requestedNumber
        };
        pendingCancel = null;

        return `Locker ${requestedNumber} is free. Do you want me to reserve it for you now? Type YES or NO.`;
      }

      let firstFree = null;
      for (let n = LOCKER_RANGE.start; n <= LOCKER_RANGE.end; n++) {
        if (isLockerAvailable(n)) {
          firstFree = n;
          break;
        }
      }

      if (!firstFree) {
        return `All lockers from ${LOCKER_RANGE.start} to ${LOCKER_RANGE.end} appear to be reserved right now.`;
      }

      pendingBooking = {
        kind: 'locker',
        lockerNumber: firstFree
      };
      pendingCancel = null;

      return `The first free locker I see is Locker ${firstFree}. Do you want me to reserve it for you? Type YES or NO.`;
    }

    // BOOK / RESERVE STUDY ROOM (room + time dialog)
    if (
      (text.includes('book') || text.includes('reserve')) &&
      (text.includes('study') || text.includes('room'))
    ) {
      const rooms = getStudyRooms();
      if (!rooms.A && !rooms.B) {
        return 'I could not find any study rooms in the app. Please use the Resources tab.';
      }

      // If the message already has room and time: e.g. "book room b at 3pm"
      const hasA = text.includes('room a') || text.includes('study room a');
      const hasB = text.includes('room b') || text.includes('study room b');
      const parsedTime = parseTimeFromText(text);

      // If both room and time are given, try a one-shot flow
      if ((hasA || hasB) && parsedTime) {
        const chosenKey = hasB ? 'B' : 'A';
        const room = rooms[chosenKey];
        if (!room) {
          return `I could not find Group Study Room ${chosenKey} in the app.`;
        }

        const { time24, label } = parsedTime;
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        if (userHasStudyAt(today, time24)) {
          const reservations = getReservations();
          const existing = reservations.find((r) => {
            const name = (r.resourceName || '').toLowerCase();
            return name.includes('study room') && r.date === today && r.time === time24;
          });
          if (existing) {
            return `You already have a study room booked then: ${existing.resourceName} at ${existing.time}.`;
          }
        }

        pendingBooking = {
          kind: 'study',
          phase: 'confirm',
          roomId: room.id,
          roomName: room.name,
          time24,
          timeLabel: label
        };
        pendingCancel = null;

        return `I can book ${room.name} today at ${label}. Do you want me to reserve it? Type YES or NO.`;
      }

      // Otherwise start the dialogue: first room, then time.
      pendingBooking = {
        kind: 'study',
        phase: 'room'
      };
      pendingCancel = null;

      return 'Sure, which study room would you like: Group Study Room A or Group Study Room B?';
    }

    // ===== OTHER INTENTS =====

    // Greetings
    if (/^(hi|hello|hey)\b/.test(text)) {
      return "Hi, my name is Rammy, your commuter assistant. If you want to know what I can do, just ask “what can you do?” or “help”.";
    }

    // Reservations summary
    if (
      text.includes('reservation') ||
      text.includes('booking')
    ) {
      return getReservationsSummary();
    }

    // Bike / scooter advice (weather-aware)
    if (
      text.includes('bike') ||
      text.includes('scooter') ||
      text.includes('biking')
    ) {
      const base = await getWeatherAdvice();
      return (
        base +
        ' Since you specifically asked about bikes/scooters, focus on how wet, icy, or windy it is before deciding.'
      );
    }

    // General weather / commute question
    if (
      text.includes('weather') ||
      text.includes('rain') ||
      text.includes('snow') ||
      text.includes('cold') ||
      text.includes('hot') ||
      text.includes('commute')
    ) {
      return getWeatherAdvice();
    }

    return "I’m not sure how to answer that one yet, but I can help with bookings, lockers, study rooms, racks, and weather-based commute tips. Try something like: “Do I have any bookings today?”, “Cancel my study room.”, “Book room A at 3pm.” or “Should I bring my bike?”";
  }

  // Initial greeting
  addMessage(
    'ai',
    "Hi, my name is Rammy – your CommuterHub assistant. If you want to know what I can do, just ask “what can you do?” or “help”."
  );

  return { root };
}

