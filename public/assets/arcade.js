// Permanent accent colors with a gentle travelling highlight; no per-frame JS.
const cards = [...document.querySelectorAll('.collection .game')];
const letters = [...document.querySelectorAll('.title-letter')];
const control = document.querySelector('[data-lights-toggle]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const contrast = matchMedia('(forced-colors: active)');
const glows = new Map();
const glowDuration = 6000;
let visible = false, titleVisible = false, departed = false, paused = false;
try { paused = sessionStorage.getItem('cail-lights-paused') === 'true'; } catch { /* Storage is optional. */ }

const waves = letters.map((letter, index) => {
  const accent = getComputedStyle(letter).getPropertyValue('--accent').trim();
  // A broad highlight accelerates gently through the center and eases around
  // each end. Every frame retains the letter's hue and its original geometry.
  const frames = Array.from({length:61}, (_, frame) => {
    const offset = frame / 60;
    const center = (1 - Math.cos(offset * 2 * Math.PI)) / 2 * (letters.length - 1);
    const proximity = Math.max(0, 1 - Math.abs(index - center) / 4);
    const strength = (1 - Math.cos(proximity * Math.PI)) / 2;
    return {offset,
      color:`color-mix(in srgb, ${accent} ${100 - 24 * strength}%, white)`,
      textShadow:`0 0 ${10 * strength}px color-mix(in srgb, ${accent} ${36 * strength}%, transparent)`,
    };
  });
  const wave = letter.animate(frames, {duration:12000, iterations:Infinity});
  wave.pause();
  return wave;
});
function running() {
  return !paused && !motion.matches && !contrast.matches && !document.hidden && !departed;
}
function glow(element) {
  // A return visit leaves the current fade intact instead of restarting it.
  if (glows.has(element) || element.matches(':hover,:focus-within')) return;
  element.classList.add('is-lit');
  glows.set(element, setTimeout(() => {
    glows.delete(element);
    element.classList.remove('is-lit');
  }, glowDuration));
}
function clearGlows() {
  for (const [element, timer] of glows) {
    clearTimeout(timer);
    element.classList.remove('is-lit');
  }
  glows.clear();
}
function sync() {
  const preference = motion.matches || contrast.matches;
  const active = running();
  if (!active || !visible) clearGlows();
  waves.forEach(wave => active && titleVisible ? wave.play() : wave.pause());
  control.disabled = preference;
  control.textContent = preference ? 'Lights still' : paused ? 'Resume lights' : 'Pause lights';
  control.setAttribute('aria-label', preference ? 'Lights still: motion or contrast preference enabled' : control.textContent);
}
document.addEventListener('arcade:snake-visit', event => {
  const index = event.detail?.index;
  if (!running() || !visible || !Number.isInteger(index) || index < 0 || index >= cards.length) return;
  glow(cards[index]);
});
control.addEventListener('click', () => {
  paused = !paused;
  try { sessionStorage.setItem('cail-lights-paused', String(paused)); } catch { /* Keep working without storage. */ }
  sync();
});
control.hidden = false;
motion.addEventListener('change', sync);
contrast.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
addEventListener('pagehide', () => { departed = true; sync(); });
addEventListener('pageshow', () => { departed = false; sync(); });
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold:.1}).observe(document.querySelector('.collection'));
new IntersectionObserver(([entry]) => { titleVisible = entry.isIntersecting; sync(); }).observe(document.querySelector('.arcade-title'));
sync();
