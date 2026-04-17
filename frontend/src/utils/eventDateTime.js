export const getEventStartValue = (event) => event?.start_date || event?.start || null;
export const getEventEndValue = (event) => event?.end_date || event?.end || null;

const pad = (value) => String(value).padStart(2, '0');
const DISPLAY_TIMEZONE = 'Europe/Bucharest';

const parseDateValue = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getTzParts = (dateValue) => {
  const date = parseDateValue(dateValue);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
  }).formatToParts(date);

  const getPart = (type) => parts.find((part) => part.type === type)?.value;

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour,
    minute,
  };
};

export const getEventDateKey = (dateValue) => {
  if (!dateValue) return null;
  const parts = getTzParts(dateValue);
  if (!parts) return null;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const getEventTimeLabel = (dateValue) => {
  if (!dateValue) return '';
  const parts = getTzParts(dateValue);
  if (!parts) return '';
  return `${parts.hour}:${parts.minute}`;
};

export const getEventTimeRangeLabel = (startValue, endValue) => {
  const startTime = getEventTimeLabel(startValue);
  const endTime = getEventTimeLabel(endValue);
  if (startTime && endTime && startTime === endTime) return startTime;
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || '';
};

export const getEventDateLabel = (dateValue, locale = 'ro-RO') => {
  const date = parseDateValue(dateValue);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
};

export const getEventDayNumber = (dateValue) => {
  const parts = getTzParts(dateValue);
  if (!parts) return '';
  return String(parts.day);
};

export const getEventMonthShort = (dateValue, locale = 'ro-RO') => {
  const date = parseDateValue(dateValue);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
};
