// Automatic previews stop when readers interact, leave the page, or scroll away.
for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const slides = [...gallery.querySelectorAll('[data-slide]')];
  const controls = gallery.querySelector('[data-controls]');
  const rotation = gallery.querySelector('[data-rotation]');
  const count = gallery.querySelector('[data-count]');
  const status = gallery.querySelector('[data-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer, visible = false, hovered = false, focused = false;
  let paused = motion.matches;

  function schedule() {
    clearTimeout(timer);
    if (!paused && !hovered && !focused && visible && !document.hidden) {
      timer = setTimeout(() => show(index + 1), 6000);
    }
  }
  function show(next, manual = false) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    count.textContent = `${index + 1} / ${slides.length}`;
    if (manual) status.textContent = `Preview ${index + 1} of ${slides.length}: ${slides[index].querySelector('figcaption').textContent}`;
    schedule();
  }
  function updateRotation() {
    rotation.textContent = paused ? 'Play' : 'Pause';
    rotation.setAttribute('aria-label', paused ? 'Play automatic previews' : 'Pause automatic previews');
    schedule();
  }
  gallery.querySelector('[data-previous]').addEventListener('click', () => { paused = true; show(index - 1, true); updateRotation(); });
  gallery.querySelector('[data-next]').addEventListener('click', () => { paused = true; show(index + 1, true); updateRotation(); });
  rotation.addEventListener('click', () => { paused = !paused; updateRotation(); });
  gallery.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  gallery.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  gallery.addEventListener('focusin', () => { focused = true; schedule(); });
  gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { if (motion.matches) paused = true; updateRotation(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold:.15}).observe(gallery);
  controls.hidden = false;
  updateRotation();
}
