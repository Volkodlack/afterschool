/* Ink: écriture à la main sur l'écran (ML Kit Digital Ink, modèle français téléchargé une fois puis hors ligne). */
(function () {
  const N = window.AfterSchoolNative || null;
  const AS = window.AS_native;
  const pending = {};
  let seq = 0, status = null;
  const waiters = [];

  AS.onInk = (id, cands) => { const cb = pending[id]; delete pending[id]; cb && cb(cands); };
  AS.inkStatus = (st) => {
    status = st;
    if (st === 'ready') { waiters.splice(0).forEach(f => f(true)); }
    if (st === 'error' || st === 'unsupported') { waiters.splice(0).forEach(f => f(false)); }
  };

  const Ink = {
    supported() { return !!(N && N.inkRecognize); },
    status() { try { return status = N.inkStatus(); } catch (e) { return 'unsupported'; } },
    /* resolves true when the French handwriting model is ready (downloads it the first time) */
    prepare() {
      return new Promise(res => {
        const st = Ink.status();
        if (st === 'ready') return res(true);
        if (st === 'unsupported') return res(false);
        waiters.push(res);
        try { N.inkPrepare(); } catch (e) { res(false); }
      });
    },
    recognize(strokes, w, h) {
      return new Promise(res => {
        const id = 'ink' + (++seq);
        pending[id] = c => res(c || null);
        try { N.inkRecognize(JSON.stringify({ w, h, strokes }), id); } catch (e) { delete pending[id]; res(null); }
        setTimeout(() => { if (pending[id]) { delete pending[id]; res(null); } }, 6000);
      });
    },

    /* writing pad: Seyès lines, big pen; onChange(strokes) after each stroke */
    pad({ onChange, onOk }) {
      const box = UI.el(`<div class="ink-pad">
        <div class="ink-wrap"><canvas></canvas><div class="ink-hint">✏️ Écris le mot ici avec ton doigt</div></div>
        <div class="ink-btns">
          <button class="key wide" data-a="undo" aria-label="Annuler le trait">↶ Trait</button>
          <button class="key wide del" data-a="clear" aria-label="Tout effacer">🧽 Effacer</button>
          <button class="key wide ok" data-a="ok">OK ✔</button></div></div>`);
      const cv = box.querySelector('canvas'), wrapEl = box.querySelector('.ink-wrap'), hintEl = box.querySelector('.ink-hint');
      const ctx = cv.getContext('2d');
      let strokes = [], cur = null, dpr = 1, W = 0, H = 0;
      const ink = () => (document.body.classList.contains('theme-poney') ? '#5b3a8c' : '#1d3b8a');
      function size() {
        const r = wrapEl.getBoundingClientRect();
        if (!r.width) return;
        dpr = window.devicePixelRatio || 1; W = r.width; H = r.height;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        draw();
      }
      function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        // cahier Seyès : interligne + ligne d'écriture plus marquée
        const step = H / 8;
        for (let i = 1; i < 8; i++) {
          ctx.strokeStyle = i === 5 ? 'rgba(80,110,200,.55)' : i === 2 ? 'rgba(80,110,200,.28)' : 'rgba(120,150,220,.16)';
          ctx.lineWidth = i === 5 ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(W, i * step); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(220,80,80,.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(W * 0.06, 0); ctx.lineTo(W * 0.06, H); ctx.stroke();
        ctx.strokeStyle = ink(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, Math.min(9, H / 30));
        strokes.forEach(s => {
          ctx.beginPath();
          s.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          if (s.length === 1) ctx.lineTo(s[0][0] + .1, s[0][1] + .1);
          ctx.stroke();
        });
      }
      const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, Date.now()]; };
      cv.addEventListener('pointerdown', e => {
        e.preventDefault(); cv.setPointerCapture(e.pointerId);
        cur = [pt(e)]; strokes.push(cur); hintEl.style.opacity = 0; draw();
      });
      cv.addEventListener('pointermove', e => {
        if (!cur) return; e.preventDefault();
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        evs.forEach(ev => cur.push(pt(ev)));
        draw();
      });
      const up = () => { if (!cur) return; cur = null; onChange && onChange(strokes); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
      box.addEventListener('pointerdown', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        e.preventDefault();
        b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 90);
        if (b.dataset.a === 'undo') { strokes.pop(); draw(); onChange && onChange(strokes); }
        if (b.dataset.a === 'clear') api.clear(true);
        if (b.dataset.a === 'ok') onOk && onOk(strokes);
      });
      const ro = window.ResizeObserver ? new ResizeObserver(size) : null;
      if (ro) ro.observe(wrapEl); else setTimeout(size, 50);
      const api = {
        el: box,
        get strokes() { return strokes; },
        get w() { return W; }, get h() { return H; },
        clear(notify) { strokes = []; hintEl.style.opacity = ''; draw(); if (notify && onChange) onChange(strokes); }
      };
      return api;
    }
  };
  window.Ink = Ink;
})();
