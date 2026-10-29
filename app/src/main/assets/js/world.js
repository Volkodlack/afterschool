/* "Mon Monde": a little block-building canvas, unlocked with gems earned in the games. */
(function () {
  const { html, el } = UI;

  UI.register('world', (root) => {
    UI.setTitle('Mon Monde');
    const W = Store.data.world;
    const st = Store.data.stats;
    if (!W.init) {
      for (let x = 0; x < W.w; x++) { W.cells[x + ',' + (W.h - 1)] = 'terre'; W.cells[x + ',' + (W.h - 2)] = 'herbe'; }
      W.init = true; Store.save();
    }
    let sel = 'herbe', erase = false, painting = false;
    const wrap = el(html`<div class="world-wrap">
      <div class="row center">
        <span class="prompt">Construis ton monde ! Les gemmes débloquent de nouveaux blocs.</span>
      </div>
      <div class="world-grid"></div>
      <div class="palette"></div>
      <div class="row center">
        <button class="pix-btn small" data-a="erase">${Pixel.svg('pickaxe')} Casser</button>
        <button class="pix-btn small red" data-a="clear">${Pixel.svg('trash')} Tout effacer</button>
      </div></div>`);
    root.appendChild(wrap);
    const grid = wrap.querySelector('.world-grid');
    const pal = wrap.querySelector('.palette');
    const eraseBtn = wrap.querySelector('[data-a=erase]');

    function size() {
      const availW = Math.min(innerWidth - 40, 1300);
      const availH = innerHeight * 0.52;
      const c = Math.floor(Math.min(availW / W.w, availH / W.h));
      grid.style.gridTemplateColumns = `repeat(${W.w}, ${c}px)`;
      grid.style.gridAutoRows = c + 'px';
      grid.style.backgroundSize = `${c}px ${c}px`;
    }
    function drawGrid() {
      grid.innerHTML = '';
      for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
        const t = W.cells[x + ',' + y];
        const c = document.createElement('div');
        c.className = 'cell';
        c.dataset.k = x + ',' + y;
        if (t) c.style.backgroundImage = `url(${Pixel.texture(t)})`;
        grid.appendChild(c);
      }
    }
    function drawPalette() {
      pal.innerHTML = '';
      Object.entries(Pixel.BLOCKS).forEach(([k, b]) => {
        const unlocked = st.unlocked.includes(k);
        const p = el(`<div class="pal ${unlocked ? '' : 'locked'} ${k === sel && !erase ? 'sel' : ''}" title="${b.name}">${unlocked ? '' : `<span class="price">${Pixel.svg('gem')}${b.cost}</span>`}</div>`);
        p.style.backgroundImage = `url(${Pixel.texture(k)})`;
        p.onclick = async () => {
          if (!unlocked) {
            if (st.gems < b.cost) { UI.toast(`Il te faut ${b.cost} gemmes pour « ${b.name} ». Joue pour en gagner !`); UI.shake(p); SFX.play('bad'); return; }
            if (!(await UI.confirm(`Débloquer « ${b.name} » pour ${b.cost} gemmes ?`, 'Oui !', 'Non'))) return;
            Store.spendGems(b.cost); st.unlocked.push(k); Store.save(true);
            SFX.play('level'); UI.burstAt(p, { n: 30 }); UI.refreshHud(true);
          }
          sel = k; erase = false; eraseBtn.classList.remove('on');
          drawPalette();
        };
        pal.appendChild(p);
      });
    }
    function paint(target) {
      const c = target && target.closest && target.closest('.cell');
      if (!c) return;
      const k = c.dataset.k;
      if (erase) {
        if (!W.cells[k]) return;
        delete W.cells[k];
        c.style.backgroundImage = '';
        SFX.play('break');
        const r = c.getBoundingClientRect();
        UI.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 6, spread: 60 });
      } else {
        if (W.cells[k] === sel) return;
        W.cells[k] = sel;
        c.style.backgroundImage = `url(${Pixel.texture(sel)})`;
        c.classList.remove('placed'); void c.offsetWidth; c.classList.add('placed');
        SFX.play('place');
      }
      Store.save();
    }
    grid.addEventListener('pointerdown', e => { painting = true; grid.setPointerCapture(e.pointerId); paint(e.target); });
    grid.addEventListener('pointermove', e => { if (painting) paint(document.elementFromPoint(e.clientX, e.clientY)); });
    const endPaint = () => { painting = false; };
    grid.addEventListener('pointerup', endPaint);
    grid.addEventListener('pointercancel', endPaint);
    eraseBtn.onclick = () => { erase = !erase; eraseBtn.classList.toggle('on', erase); drawPalette(); };
    wrap.querySelector('[data-a=clear]').onclick = async () => {
      if (await UI.confirm('Tout effacer ton monde ?', 'Effacer', 'Non')) { W.cells = {}; W.init = false; Store.save(true); UI.go('world', {}, { replace: true }); }
    };
    size(); drawGrid(); drawPalette();
    addEventListener('resize', size);
    return () => removeEventListener('resize', size);
  });
})();
