// src/utils/formatters.js

export function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime24to12(timeStr) {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return timeStr;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h = ((hh + 11) % 12) + 1;
  return `${h}:${String(mm).padStart(2, '0')} ${ampm}`;
}
