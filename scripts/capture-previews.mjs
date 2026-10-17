import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/previews/', import.meta.url));
const manifestPath = root + 'captures.json';
const gameIds = new Set(['cadavre','jeopardy','cloze','haggle','langames']);

// Run from the connected browser session after preparing a real game view.
// Screenshots are saved unchanged; source URLs omit account and saved-work IDs.
export async function capturePreview(tab, { game, view, caption, alt, source, attribution }) {
  if (!gameIds.has(game) || ![1,2,3].includes(view)) throw new Error('Choose a game and view 1–3.');
  const url = new URL(source);
  if (url.protocol !== 'https:') throw new Error('Use the live HTTPS game URL.');
  url.search = ''; url.hash = '';
  await mkdir(root + game, { recursive:true });
  const bytes = await tab.screenshot({ fullPage:false });
  await writeFile(`${root}${game}/${view}.jpg`, bytes);
  let captures = [];
  try { captures = JSON.parse(await readFile(manifestPath,'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const record = { game, view, caption, alt, source:url.href, capturedAt:new Date().toISOString(), ...(attribution ? {attribution} : {}) };
  captures = captures.filter(item => item.game !== game || item.view !== view);
  captures.push(record);
  captures.sort((a,b) => a.game.localeCompare(b.game) || a.view-b.view);
  await writeFile(manifestPath, JSON.stringify(captures,null,2) + '\n');
  return { path:`${root}${game}/${view}.jpg`, ...record };
}
