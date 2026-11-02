import { LIMITS } from '../../public/js/shared/rules.js';

export const ROOM_PATTERN = /^[A-Z0-9-]{2,24}$/;

export function roomCode(value) {
  const code = String(value ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  return ROOM_PATTERN.test(code) ? code : null;
}

// Users' text is always rendered with textContent, but markup characters are still stripped at the boundary.
export function cleanText(value, max) {
  return String(value ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const cleanName = value => cleanText(value, LIMITS.name) || 'Khách';

export function number(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : null;
}

export const oneOf = (value, list, fallback = null) => list.includes(value) ? value : fallback;

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const isId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(value);
