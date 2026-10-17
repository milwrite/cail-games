// Slow attract lights; never compete with hover/focus or reduced-motion preferences.
const cards = [...document.querySelectorAll('.collection .game')];
const letters = [...document.querySelectorAll('.title-letter')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const timers = new Set();
let visible = false;

function later(callback, delay) {
  const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
  timers.add(timer);
}
function flash(element) {
  if (element.matches(':hover,:focus-within')) return;
  element.classList.add('is-lit');
  later(() => element.classList.remove('is-lit'), 250);
}
function shuffledCards() {
  const round = [...cards];
  for (let i = round.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  return round;
}
function cardRound() {
  const round = shuffledCards();
  round.forEach((card, i) => later(() => flash(card), i * 3000));
  later(cardRound, (round.length - 1) * 3000 + 250 + 5000);
}
function titleWave() {
  letters.forEach((letter, i) => later(() => flash(letter), i * 90));
  later(titleWave, 15000);
}
function sync() {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  [...cards, ...letters].forEach(element => element.classList.remove('is-lit'));
  if (motion.matches || document.hidden || !visible || !cards.length) return;
  later(cardRound, 3000);
  later(titleWave, 15000);
}
motion.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold:.1}).observe(document.querySelector('.collection'));
