export const rect = (left, top, right, bottom) => ({left, top, right, bottom});

// Representative three-, two-, and one-column layouts use the gallery's new
// 48/40/40px gaps and the remaining lights control as an obstacle.
export function geometry(mode = false) {
  const mobile = mode === true || mode === 'phone', tablet = mode === 'tablet';
  const width = mobile ? 390 : tablet ? 768 : 1440;
  const shellLeft = mobile ? 12 : tablet ? 24 : 120, shellRight = width - shellLeft;
  const left = mobile ? 29 : tablet ? 49 : 153, right = width - left;
  const columns = mobile ? 1 : tablet ? 2 : 3, gap = mobile || tablet ? 40 : 48;
  const cardWidth = (right - left - gap * (columns - 1)) / columns;
  const top = mobile ? 308 : tablet ? 320 : 330, cardHeight = mobile ? 218 : tablet ? 288 : 304;
  const cards = Array.from({length:6}, (_, i) => {
    const x = left + i % columns * (cardWidth + gap), y = top + Math.floor(i / columns) * (cardHeight + gap);
    return rect(x, y, x + cardWidth, y + cardHeight);
  });
  const footerTop = cards.at(-1).bottom + (mobile ? 32 : 64);
  const footer = rect(shellLeft, footerTop, shellRight, footerTop + (mobile ? 104 : 72));
  const lightsControl = rect(right - 112, top - 52, right, top - 8);
  const title = mobile ? rect(left, 132, right, 240) : tablet ? rect(left, 170, right, 240) : rect(left, 175, 1180, 255);
  const obstacles = mobile
    ? [rect(29, 20, 211, 64), rect(247, 20, 361, 64), rect(left, 132, right, 182), rect(left, 190, 269, 240)]
    : tablet
      ? [rect(left, 28, 316, 72), rect(605, 28, right, 72), rect(left, 170, 420, 240), rect(438, 170, 705, 240)]
      : [rect(left, 28, 420, 72), rect(1163, 28, right, 72), rect(left, 175, 700, 255), rect(726, 175, 1180, 255)];
  obstacles.push(lightsControl, rect(left, footerTop + 14, left + 97, footerTop + 58),
    mobile ? rect(left, footerTop + 58, right - 15, footerTop + 78) : rect(right - 447, footerTop + 27, right, footerTop + 47));
  for (const card of cards) obstacles.push(
    rect(card.left + 26, card.top + 29, card.right - 26, card.top + (mobile ? 63 : 108)),
    rect(card.left + 26, card.top + (mobile ? 81 : 126), card.right - 26, card.top + (mobile ? 132 : 178)),
    rect(card.left + 26, card.bottom - 67, card.right - 26, card.bottom - 23),
  );
  return {width, height:footer.bottom, cards, obstacles, lightsControl,
    shell:rect(shellLeft, 0, shellRight, footer.bottom),
    header:rect(shellLeft, 0, shellRight, mobile ? 84 : 100), title, footer};
}


