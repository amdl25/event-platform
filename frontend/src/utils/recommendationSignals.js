const RECENT_CATEGORY_CLICKS_KEY = 'recentCategoryClicksV1';
const MAX_HISTORY_ITEMS = 120;
const normalizeCategoryToken = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isValidEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return false;
  if (!Array.isArray(entry.categories) || entry.categories.length === 0) return false;
  return Number.isFinite(Number(entry.at));
};

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export const recordEventCategoryClick = (event) => {
  const storage = getStorage();
  if (!storage) return;

  const categories = Array.from(
    new Set(
      (event?.categories || [])
        .map((category) => normalizeCategoryToken(category?.name))
        .filter(Boolean)
    )
  );

  if (categories.length === 0) return;
  const history = safeParse(storage.getItem(RECENT_CATEGORY_CLICKS_KEY)).filter(isValidEntry);
  history.push({
    eventId: event?.id || null,
    categories,
    at: Date.now(),
  });

  const limitedHistory = history.slice(-MAX_HISTORY_ITEMS);
  storage.setItem(RECENT_CATEGORY_CLICKS_KEY, JSON.stringify(limitedHistory));
};

export const getRecentCategoryClickCounts = ({ days = 45, maxEntries = MAX_HISTORY_ITEMS } = {}) => {
  const storage = getStorage();
  if (!storage) return {};

  const rawHistory = safeParse(storage.getItem(RECENT_CATEGORY_CLICKS_KEY)).filter(isValidEntry);
  const limitedHistory = rawHistory.slice(-Math.max(1, maxEntries));
  const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

  return limitedHistory.reduce((accumulator, entry) => {
    if (Number(entry.at) < cutoff) return accumulator;

    entry.categories.forEach((category) => {
      const normalized = normalizeCategoryToken(category);
      if (!normalized) return;
      accumulator[normalized] = (accumulator[normalized] || 0) + 1;
    });

    return accumulator;
  }, {});
};
