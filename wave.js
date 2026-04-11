(function () {
  const ROWS = 9;

  const wave = document.createElement('pre');
  wave.className = 'ascii-wave';
  wave.setAttribute('aria-hidden', 'true');

  const layout = document.querySelector('.layout');
  if (!layout) return;

  layout.parentElement.appendChild(wave);

  let frame = 0;
  let cols = 80;

  function measure() {
    const ch = parseFloat(getComputedStyle(wave).fontSize) * 0.6;
    cols = Math.floor(layout.offsetWidth / ch);
    cols = Math.min(cols, 160);
  }

  const FILL = ['~', '-', '.', '·'];

  function fillChar(depth) {
    if (depth < FILL.length) return FILL[depth];
    return '·';
  }

  function render() {
    const t = frame * 0.02;
    const grid = [];

    for (let r = 0; r < ROWS; r++) {
      grid.push(new Array(cols).fill(' '));
    }

    const freq = (2 * 2 * Math.PI) / cols;
    const maxAmp = (ROWS - 1) / 2;
    const center = (ROWS - 1) / 2;

    // single wave with oscillating amplitude
    // all peaks grow and shrink together uniformly
    const amp = maxAmp * Math.abs(Math.sin(t * 0.3));
    const horizSpeed = 0.8;

    for (let c = 0; c < cols; c++) {
      const phase = c * freq - t * horizSpeed;
      const y = amp * Math.sin(phase);

      const waveRow = Math.round(center - y);
      const clamped = Math.max(0, Math.min(ROWS - 1, waveRow));

      if (y >= 0) {
        for (let r = clamped + 1; r < ROWS; r++) {
          const depth = r - clamped - 1;
          grid[r][c] = fillChar(depth);
        }
      } else {
        for (let r = clamped - 1; r >= 0; r--) {
          const depth = clamped - r - 1;
          grid[r][c] = fillChar(depth);
        }
      }

      grid[clamped][c] = '≈';

      if (c > 0) {
        const phasePrev = (c - 1) * freq - t * horizSpeed;
        const yPrev = amp * Math.sin(phasePrev);
        const prevRow = Math.max(0, Math.min(ROWS - 1, Math.round(center - yPrev)));
        const lo = Math.min(clamped, prevRow);
        const hi = Math.max(clamped, prevRow);
        for (let r = lo + 1; r < hi; r++) {
          grid[r][c] = '│';
        }
      }
    }

    wave.textContent = grid.map(row => row.join('')).join('\n');
    frame++;
    requestAnimationFrame(render);
  }

  measure();
  window.addEventListener('resize', measure);
  render();
})();
