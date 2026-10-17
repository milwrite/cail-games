// Automatic previews stop when readers interact, leave the page, or scroll away.
for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const slides = [...gallery.querySelectorAll('[data-slide]')];
  const controls = gallery.querySelector('[data-controls]');
  const rotation = gallery.querySelector('[data-rotation]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer, visible = false, hovered = false, focused = false;
  let paused = motion.matches, explicitContinue = false;

  function schedule() {
    clearTimeout(timer);
    if (!paused && (explicitContinue || (!hovered && !focused)) && visible && !document.hidden) {
      timer = setTimeout(() => show(index + 1), 6000);
    }
  }
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    schedule();
  }
  function updateRotation() {
    rotation.textContent = paused ? 'Continue' : 'Pause';
    rotation.setAttribute('aria-label', paused ? 'Continue gallery' : 'Pause gallery');
    schedule();
  }
  rotation.addEventListener('click', () => { paused = !paused; explicitContinue = !paused; updateRotation(); });
  gallery.addEventListener('mouseenter', () => { hovered = true; explicitContinue = false; schedule(); });
  gallery.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  gallery.addEventListener('focusin', () => { focused = true; explicitContinue = false; schedule(); });
  gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { if (motion.matches) {paused = true; explicitContinue = false;} updateRotation(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold:.15}).observe(gallery);
  controls.hidden = false;
  updateRotation();
}
