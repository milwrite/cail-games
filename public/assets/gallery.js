// Automatic previews stop when readers interact, leave the page, or scroll away.
for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const slides = [...gallery.querySelectorAll('[data-slide]')];
  const controls = gallery.querySelector('[data-controls]');
  const rotation = gallery.querySelector('[data-rotation]');
  const images = slides.map(slide => slide.querySelector('img'));
  const prepared = new Map();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer, visible = false, hovered = false, focused = false;
  let paused = motion.matches, explicitContinue = false, revision = 0;

  function canRotate() {
    return !paused && (explicitContinue || (!hovered && !focused)) && visible && !document.hidden;
  }
  function prepare(next) {
    if (!prepared.has(next)) {
      // Only prepare the next view once the gallery is visible and running.
      images[next].loading = 'eager';
      prepared.set(next, images[next].decode().then(() => true, () => false));
    }
    return prepared.get(next);
  }
  function schedule() {
    clearTimeout(timer);
    const scheduledRevision = ++revision;
    if (!canRotate()) return;
    const next = (index + 1) % slides.length;
    const ready = prepare(next);
    timer = setTimeout(async () => {
      const loaded = await ready;
      // A late image must not override Pause, reduced motion, or leaving the page.
      if (scheduledRevision !== revision || !canRotate()) return;
      if (!loaded) {
        prepared.delete(next);
        paused = true;
        explicitContinue = false;
        updateRotation();
        return;
      }
      index = next;
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      schedule();
    }, 6000);
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
