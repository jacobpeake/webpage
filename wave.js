(function () {
  const ROWS = 6;
  const CHARS = ['·', '·', '~', '~', '·', '·'];
  const SPEED = 0.4;
  const FREQ = 0.06;

  // create the wave element
  const wave = document.createElement('pre');
  wave.className = 'ascii-wave';
  wave.setAttribute('aria-hidden', 'true');

  const layout = document.querySelector('.layout');
  if (!layout) return;

  // insert after the layout div so it spans full width (sidebar + content)
  layout.parentElement.appendChild(wave);

  let frame = 0;
  let cols = 80;

  function measure() {
    // approximate columns from container width / char width
    const ch = parseFloat(getComputedStyle(wave).fontSize) * 0.6;
    cols = Math.floor(layout.offsetWidth / ch);
    cols = Math.min(cols, 160);
  }

  function render() {
    const t = frame * SPEED;
    const grid = [];

    for (let r = 0; r < ROWS; r++) {
      grid.push(new Array(cols).fill(' '));
    }

    for (let c = 0; c < cols; c++) {
      // two overlapping sine waves for visual depth
      const y1 = Math.sin(c * FREQ + t * 0.03) * ((ROWS - 1) / 2) + (ROWS - 1) / 2;
      const y2 = Math.sin(c * FREQ * 1.3 + t * 0.02 + 2) * ((ROWS - 2) / 2) + (ROWS - 1) / 2;

      const row1 = Math.round(y1);
      const row2 = Math.round(y2);

      if (row1 >= 0 && row1 < ROWS) {
        grid[row1][c] = CHARS[row1];
      }
      if (row2 >= 0 && row2 < ROWS) {
        // second wave uses a lighter character
        if (grid[row2][c] === ' ') {
          grid[row2][c] = '.';
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
