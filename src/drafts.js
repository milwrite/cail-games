const KEY = 'cail-games-contribution-v1';
export const wordCount = value => value.trim().split(/\s+/u).filter(Boolean).length;
export function readDraft(storage) {
  try {
    const value = JSON.parse((storage ?? localStorage).getItem(KEY) || 'null');
    if (!value || value.version !== 1) return null;
    if (!['name', 'title', 'url', 'summary'].every(key => typeof value[key] === 'string')) return null;
    return value;
  } catch { return null; }
}
export function saveDraft(draft, storage = localStorage) {
  const value = { version: 1, ...draft, savedAt: new Date().toISOString() };
  storage.setItem(KEY, JSON.stringify(value));
  return value;
}
