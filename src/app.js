import { readDraft, saveDraft, wordCount } from './drafts.js';

const games = {
  corpse: {
    title: 'Exquisite Corpse',
    description: 'Take turns adding to a poem with a language model. In shared play, pass the device and let earlier lines fold out of view. Solo play keeps the growing poem open.',
    notice: 'Notice how a short contribution changes the direction of the poem, and how much the model can infer from what it is allowed to see.',
    url: 'https://cadavre.ailab-452.workers.dev/',
  },
  jeopardy: {
    title: 'Jeopardy',
    description: 'Choose topics, generate a quiz board, and play together. You can edit the clues before starting and keep a board for another session.',
    notice: 'Treat the clues and answers as claims to examine. A confident answer can still be wrong, and a question may assume more than it says.',
    url: 'https://jeopardy.ailab-452.workers.dev/',
  },
  cloze: {
    title: 'Cloze Reader',
    description: 'Read a passage with words missing and use the surrounding text to work out what belongs. Ask for a hint when you want another way into the passage.',
    notice: 'Notice which clues come from grammar, which come from context, and when more than one word could make sense. Consider what the model’s hint makes easier to see.',
    url: 'https://cloze.ailab-452.workers.dev/',
  },
};

let opener = null;
function openDialog(dialog, source) {
  opener = source;
  dialog.showModal();
  // Opening a phone form should not immediately open its keyboard.
  dialog.querySelector('[data-close]').focus({ preventScroll: true });
}
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.open), button)));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
  const game = games[button.dataset.game];
  document.getElementById('game-dialog-title').textContent = game.title;
  document.getElementById('game-description').textContent = game.description;
  document.getElementById('game-notice').textContent = game.notice;
  document.getElementById('game-play').href = game.url;
  document.getElementById('solo-play').hidden = button.dataset.game !== 'corpse';
  openDialog(document.getElementById('game-dialog'), button);
}));

const form = document.getElementById('contribution-form');
const summary = form.elements.summary;
const counter = document.getElementById('word-count');
const status = document.getElementById('draft-status');
function updateCount() {
  const count = wordCount(summary.value);
  counter.textContent = `${count} / 250 words`;
  counter.dataset.over = String(count > 250);
  summary.setCustomValidity(count > 250 ? 'Keep the summary to 250 words or fewer' : '');
}
function draftFromForm() {
  return Object.fromEntries(['name', 'title', 'url', 'summary'].map(key => [key, form.elements[key].value.trim()]));
}
function validate() {
  const url = form.elements.url;
  let validURL = false;
  try { validURL = ['http:', 'https:'].includes(new URL(url.value).protocol); } catch { /* Native validity handles empty input. */ }
  url.setCustomValidity(validURL ? '' : 'Use an http or https project link');
  ['name','title','summary'].forEach(key => form.elements[key].setCustomValidity(form.elements[key].value.trim() ? '' : 'Please complete this field'));
  updateCount();
  if (!summary.value.trim()) summary.setCustomValidity('Please include a project summary');
  return form.reportValidity();
}
form.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  updateCount();
  status.textContent = '';
});
const saved = readDraft();
if (saved) {
  ['name', 'title', 'url', 'summary'].forEach(key => { form.elements[key].value = saved[key]; });
  updateCount();
  status.textContent = 'Your saved draft is ready to edit';
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validate()) return;
  try {
    saveDraft(draftFromForm());
    status.textContent = 'Draft saved on this device';
  } catch {
    status.textContent = 'This browser could not save the draft — download a copy instead';
  }
});
document.getElementById('download-draft').addEventListener('click', () => {
  if (!validate()) return;
  const draft = draftFromForm();
  const text = `${draft.title}\n${draft.name}\n${draft.url}\n\n${draft.summary}\n`;
  const href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = 'cail-games-project-draft.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  status.textContent = 'Draft downloaded';
});
