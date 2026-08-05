// ---------------------------------------------------------
// scratch.js — realistic scratch-to-reveal canvas overlay.
// Drop a <canvas class="scratch-canvas"> over a result panel;
// call initScratchCard() to wire up the wipe interaction.
// ---------------------------------------------------------

export function initScratchCard(canvas, { onRevealed } = {}) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  drawFoil(ctx, canvas.width, canvas.height);

  let isDown = false;
  let revealed = false;

  const scratch = (x, y) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - r.left, y: point.clientY - r.top };
  };

  const checkRevealed = () => {
    if (revealed) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4 * 12) if (data[i] === 0) cleared++;
    const ratio = cleared / (data.length / (4 * 12));
    if (ratio > 0.55) {
      revealed = true;
      canvas.style.transition = 'opacity 400ms ease';
      canvas.style.opacity = '0';
      setTimeout(() => { canvas.style.display = 'none'; onRevealed?.(); }, 400);
    }
  };

  const start = (e) => { isDown = true; const p = getPos(e); scratch(p.x, p.y); };
  const move = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const p = getPos(e);
    scratch(p.x, p.y);
    checkRevealed();
  };
  const end = () => { isDown = false; };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: true });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);
}

function drawFoil(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#B8BDC9');
  grad.addColorStop(0.5, '#E4E7EE');
  grad.addColorStop(1, '#9AA0AE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10,11,16,0.85)';
  ctx.font = '600 14px Sora, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ Scratch here to reveal your prize ✨', w / 2, h / 2);
}
