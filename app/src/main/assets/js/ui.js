/* UI helpers: router, header, modals, effects, on-screen keyboard, parent gate. */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const screenEl = $('#screen');
  const stack = [];
  let cleanup = null;

  function html(strings, ...vals) {
    return strings.reduce((a, s, i) => a + s + (i < vals.length ? (vals[i] == null ? '' : vals[i]) : ''), '');
  }
  function el(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  }

  const UI = {
    $, html, el, esc: s => FR.esc(s), routes: {},

    register(name, fn) { this.routes[name] = fn; },

    go(name, params = {}, opts = {}) {
      Speech.stop();
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      if (opts.replace && stack.length) stack.pop();
      if (!opts.back) stack.push({ name, params });
      document.body.classList.toggle('can-back', stack.length > 1);
      screenEl.innerHTML = '';
      screenEl.scrollTop = 0;
      screenEl.className = 'screen-enter';
      void screenEl.offsetWidth;
      const r = this.routes[name](screenEl, params || {});
      if (typeof r === 'function') cleanup = r;
      this.refreshHud();
    },
    back() {
      if ($('#modal-root').children.length) { this.closeModal(); return true; }
      if (stack.length <= 1) return false;
      stack.pop();
      const prev = stack[stack.length - 1];
      this.go(prev.name, prev.params, { back: true });
      return true;
    },
    home() { stack.length = 0; this.go('home'); },
    setTitle(t) { $('#screen-title').textContent = t || ''; },
    current() { return stack[stack.length - 1]; },

    refreshHud(bump) {
      const st = Store.data.stats;
      $('#hud-gems').innerHTML = Pixel.svg('gem') + '<span>' + st.gems + '</span>';
      const lv = Store.level();
      $('#hud-level .lvl-num').textContent = 'Niveau ' + lv.lvl;
      $('#hud-level .xpfill').style.width = Math.round(lv.cur / lv.need * 100) + '%';
      const me = $('#hud-me');
      if (me && window.Avatar) me.innerHTML = Avatar.html(Store.data.settings.avatar) + (Store.data.settings.name ? '<span>' + FR.esc(Store.data.settings.name) + '</span>' : '');
      const s = Store.streak();
      $('#hud-streak').innerHTML = s > 1 ? Pixel.svg('fire') + '<span>' + s + '</span>' : '';
      if (bump) { const g = $('#hud-gems'); g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump'); }
    },

    /* ---------- modal ---------- */
    modal(content, opts = {}) {
      const root = $('#modal-root');
      const back = el(`<div class="modal-back"><div class="modal panel ${opts.cls || ''}"></div></div>`);
      const m = back.firstElementChild;
      if (typeof content === 'string') m.innerHTML = content; else m.appendChild(content);
      if (!opts.locked) back.addEventListener('click', e => { if (e.target === back) UI.closeModal(); });
      back._onClose = opts.onClose;
      root.appendChild(back);
      return m;
    },
    closeModal() {
      const root = $('#modal-root');
      const last = root.lastElementChild;
      if (!last) return;
      last.remove();
      last._onClose && last._onClose();
    },
    closeAllModals() { const root = $('#modal-root'); while (root.lastElementChild) this.closeModal(); },

    confirm(text, okLabel = 'Oui', cancelLabel = 'Non') {
      return new Promise(res => {
        const m = UI.modal(html`<h2>${FR.esc(text)}</h2><div class="row end"><button class="pix-btn" data-r="0">${cancelLabel}</button><button class="pix-btn red" data-r="1">${okLabel}</button></div>`,
          { onClose: () => res(false) });
        m.querySelectorAll('button').forEach(b => b.onclick = () => { const v = b.dataset.r === '1'; m.parentElement._onClose = null; UI.closeModal(); res(v); });
      });
    },

    toast(msg, ms = 2200) {
      const t = el(`<div class="toast">${FR.esc(msg)}</div>`);
      $('#toast-root').appendChild(t);
      setTimeout(() => t.remove(), ms);
    },

    /* ---------- effects ---------- */
    burst(x, y, opts = {}) {
      const layer = $('#fx-layer');
      const colors = opts.colors || ['#5faa3c', '#86603f', '#f5c542', '#4fe3d8', '#ffffff', '#e5533d'];
      const n = opts.n || 22;
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = 8 + Math.random() * 12;
        p.style.width = p.style.height = size + 'px';
        p.style.background = colors[i % colors.length];
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.boxShadow = 'inset -3px -3px 0 rgba(0,0,0,.25)';
        layer.appendChild(p);
        const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * (opts.spread || 220);
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 120;
        p.animate([
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .6 },
          { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 260}px)) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
      }
    },
    burstAt(node, opts) { const r = node.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2, opts); },
    confetti() {
      const W = innerWidth;
      for (let k = 0; k < 6; k++) setTimeout(() => this.burst(W * (0.15 + Math.random() * .7), innerHeight * (0.2 + Math.random() * .3), { n: 26, spread: 300 }), k * 180);
    },
    floatText(text, x, y, color) {
      const t = el(`<div class="float-text">${FR.esc(text)}</div>`);
      t.style.left = x + 'px'; t.style.top = y + 'px';
      if (color) t.style.color = color;
      $('#fx-layer').appendChild(t);
      setTimeout(() => t.remove(), 1200);
    },
    flyGems(fromNode, count) {
      const r = fromNode.getBoundingClientRect();
      const target = $('#hud-gems').getBoundingClientRect();
      const n = Math.min(count, 8);
      for (let i = 0; i < n; i++) {
        const g = el(`<div class="flygem">${Pixel.svg('gem')}</div>`);
        const sx = r.left + r.width / 2 + (Math.random() - .5) * 80, sy = r.top + r.height / 2 + (Math.random() - .5) * 40;
        g.style.left = sx + 'px'; g.style.top = sy + 'px';
        $('#fx-layer').appendChild(g);
        const tx = target.left + 20 - sx, ty = target.top + 10 - sy;
        g.animate([
          { transform: 'translate(-50%,-50%) scale(.3)' },
          { transform: `translate(calc(-50% + ${tx * .2}px), calc(-50% + ${ty * .2 - 120}px)) scale(1.2)`, offset: .35 },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(.6)` }
        ], { duration: 800 + i * 70, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { g.remove(); SFX.play('gem'); UI.refreshHud(true); };
      }
    },
    shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); },
    mascot(cls = '') { return Pixel.svg('mascot', 'mascot ' + cls); },
    mascotReact(root, kind) {
      const m = root.querySelector('.mascot');
      if (!m) return;
      m.classList.remove('jump', 'sad'); void m.getBoundingClientRect();
      m.classList.add(kind);
      setTimeout(() => m.classList.remove(kind), 650);
    },

    speakBtn(text, label = '') {
      const b = el(`<button class="pix-btn speak-btn ${label ? '' : 'icon-btn'}">${Pixel.svg('speaker')}${label ? FR.esc(label) : ''}</button>`);
      b.onclick = (e) => { e.stopPropagation(); Speech.speak(typeof text === 'function' ? text() : text, { rate: Store.data.settings.ttsRate }); };
      return b;
    },
    say(text) { Speech.speak(text, { rate: Store.data.settings.ttsRate }); },

    /* ---------- on-screen keyboard (no autocorrect) ---------- */
    keyboard({ onKey, onDel, onOk, space }) {
      const rows = [
        ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
        ['w', 'x', 'c', 'v', 'b', 'n', "'", '-'],
        ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'œ']
      ];
      const k = el('<div class="kbd"></div>');
      rows.forEach((r, ri) => {
        const row = el('<div class="krow"></div>');
        r.forEach(ch => {
          const b = el(`<button class="key ${ri === 3 ? 'acc' : ''}">${FR.esc(ch)}</button>`);
          b.dataset.ch = ch;
          row.appendChild(b);
        });
        if (ri === 2) row.appendChild(el('<button class="key wide del" data-act="del">⌫</button>'));
        k.appendChild(row);
      });
      const last = el('<div class="krow"></div>');
      if (space) last.appendChild(el('<button class="key wide" data-ch=" " style="max-width:340px;flex:4 1 0">espace</button>'));
      last.appendChild(el('<button class="key wide ok" data-act="ok">OK ✔</button>'));
      k.appendChild(last);
      k.addEventListener('pointerdown', e => {
        const b = e.target.closest('.key');
        if (!b) return;
        e.preventDefault();
        b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 90);
        if (b.dataset.act === 'del') onDel && onDel();
        else if (b.dataset.act === 'ok') onOk && onOk();
        else onKey && onKey(b.dataset.ch);
      });
      return k;
    },

    /* ---------- parent PIN (4 digits) ---------- */
    pinPad(title, sub) {
      return new Promise(res => {
        let val = '';
        const m = UI.modal(html`
          <h2 style="display:flex;align-items:center;gap:10px;justify-content:center"><span style="width:1.3em;display:inline-flex">${Pixel.svg('lock')}</span> ${FR.esc(title)}</h2>
          ${sub ? `<p style="font-size:clamp(16px,2.6vmin,24px);text-align:center;margin:0">${sub}</p>` : ''}
          <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
          <div class="gate-keys"></div>
          <div class="row center" style="margin-top:12px" data-z="extra"></div>`, { onClose: () => res(null) });
        const dots = m.querySelectorAll('.pin-dots i'), keys = m.querySelector('.gate-keys');
        const show = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach(ch => {
          const k = el(`<button class="key ${ch === 'OK' ? 'ok' : ch === '⌫' ? 'del' : ''}">${ch}</button>`);
          k.onclick = () => {
            if (ch === '⌫') val = val.slice(0, -1);
            else if (ch === 'OK') { if (val.length === 4) { m.parentElement._onClose = null; UI.closeModal(); res(val); } else UI.shake(m.querySelector('.pin-dots')); }
            else if (val.length < 4) val += ch;
            show();
            if (val.length === 4 && ch !== 'OK' && ch !== '⌫') setTimeout(() => { if (m.isConnected && val.length === 4) { m.parentElement._onClose = null; UI.closeModal(); res(val); } }, 180);
          };
          keys.appendChild(k);
        });
        m._extra = m.querySelector('[data-z=extra]');
        UI._pinModal = m;
      });
    },

    async createPin() {
      for (;;) {
        const a = await UI.pinPad('Code parent', 'Choisissez un code secret à 4 chiffres');
        if (!a) return false;
        const b = await UI.pinPad('Code parent', 'Tapez-le une deuxième fois');
        if (!b) return false;
        if (a === b) { Store.data.settings.pin = a; Store.save(true); UI.toast('Code parent enregistré !'); return true; }
        UI.toast('Les deux codes sont différents, on recommence');
      }
    },

    async parentGate() {
      const st = Store.data.settings;
      if (!st.pin) return UI.createPin();
      for (let tries = 0; tries < 5; tries++) {
        const p = UI.pinPad('Espace parent', tries ? '<span style="color:var(--red)">Code incorrect, réessayez</span>' : 'Entrez le code parent');
        const m = UI._pinModal;
        const forgot = el('<button class="pix-btn small wood">Code oublié ?</button>');
        let forgotClicked = false;
        forgot.onclick = () => { forgotClicked = true; m.parentElement._onClose = null; UI.closeModal(); UI._pinResolve && UI._pinResolve(); };
        m._extra.appendChild(forgot);
        const v = await Promise.race([p, new Promise(r => { UI._pinResolve = () => r('__forgot'); })]);
        UI._pinResolve = null;
        if (v === '__forgot' || forgotClicked) return UI.forgotPin();
        if (!v) return false;
        if (v === st.pin) return true;
        SFX.play('bad'); Haptic(150);
      }
      return false;
    },

    forgotPin() {
      return new Promise(res => {
        const a = 23 + Math.floor(Math.random() * 60), b = 6 + Math.floor(Math.random() * 4);
        const m = UI.modal(html`<h2>Code oublié</h2>
          <p style="font-size:clamp(16px,2.6vmin,24px)">Pour vérifier que vous êtes un adulte : combien font <b>${a} × ${b}</b> ?</p>
          <div class="field"><input type="number" inputmode="numeric" data-f="v"></div>
          <div class="row end"><button class="pix-btn" data-a="no">Annuler</button><button class="pix-btn green" data-a="ok">Valider</button></div>`, { onClose: () => res(false) });
        const inp = m.querySelector('[data-f=v]');
        m.querySelector('[data-a=no]').onclick = () => UI.closeModal();
        m.querySelector('[data-a=ok]').onclick = async () => {
          if (parseInt(inp.value, 10) !== a * b) { UI.shake(inp); SFX.play('bad'); return; }
          m.parentElement._onClose = null; UI.closeModal();
          res(await UI.createPin());
        };
      });
    },

    /* ---------- end-of-game results ---------- */
    results({ title, stars, gems, xp, lines = [], onAgain, onDone }) {
      const reward = Store.addReward(gems, xp);
      SFX.play(stars >= 2 ? 'win' : 'good');
      const m = UI.modal(html`
        <div class="levelup">
          <div class="rays"></div>
          <h2>${FR.esc(title)}</h2>
          <div class="result-stars">${[0, 1, 2].map(i => Pixel.svg('star', i < stars ? 'on' : '')).join('')}</div>
          <div class="row center" style="font-size:clamp(20px,3.6vmin,34px);font-weight:700">
            <span class="row" style="gap:6px"><span style="width:1.4em;display:inline-block">${Pixel.svg('gem')}</span> +${gems}</span>
            <span style="width:30px"></span><span>+${xp} XP</span>
          </div>
          ${lines.map(l => `<p style="font-size:clamp(16px,2.6vmin,24px);margin:.6em 0">${l}</p>`).join('')}
          <div class="row center" style="margin-top:2vmin">
            ${onAgain ? '<button class="pix-btn wood big" data-a="again">Rejouer</button>' : ''}
            <button class="pix-btn green big" data-a="ok">Super !</button>
          </div>
        </div>`, { locked: true });
      m.querySelectorAll('.result-stars svg.on').forEach((s, i) => { s.style.animationDelay = (0.25 + i * 0.3) + 's'; setTimeout(() => SFX.play('gem'), 250 + i * 300); });
      if (stars >= 2) setTimeout(() => UI.confetti(), 300);
      UI.flyGems(m, gems);
      m.querySelectorAll('button').forEach(b => b.onclick = () => {
        UI.closeModal();
        const after = () => (b.dataset.a === 'again' ? onAgain() : onDone && onDone());
        if (reward.levelUp) UI.levelUp(reward.levelUp, after); else after();
      });
    },

    levelUp(lvl, then) {
      SFX.play('level');
      const m = UI.modal(html`
        <div class="levelup">
          <div class="rays"></div>
          <h2>NIVEAU SUPÉRIEUR !</h2>
          <div class="big-num">${lvl}</div>
          <div style="margin:1vmin auto;width:clamp(100px,22vmin,200px)">${UI.mascot()}</div>
          <p style="font-size:clamp(18px,3vmin,28px)">Bravo ! Tu deviens de plus en plus fort !</p>
          <button class="pix-btn gold big">Trop bien !</button>
        </div>`, { locked: true });
      UI.confetti();
      m.querySelector('button').onclick = () => { UI.closeModal(); then && then(); };
    }
  };

  $('#btn-back').innerHTML = Pixel.svg('back');
  $('#btn-back').onclick = () => UI.back();
  window.AS_back = () => UI.back();
  window.AS_pause = () => { if (UI.onPause) UI.onPause(); };


  window.UI = UI;
})();
