/* Home screen and boot. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;

  function greeting() {
    const name = Store.data.settings.name;
    const h = new Date().getHours();
    const hello = h < 12 ? 'Bonjour' : h < 18 ? 'Salut' : 'Bonsoir';
    const lines = [
      `${hello}${name ? ' ' + name : ''} ! Prêt pour l'aventure ?`,
      `${hello}${name ? ' ' + name : ''} ! ${Theme.t.greet}`,
      `${hello}${name ? ' ' + name : ''} ! Un nouveau booster de cartes ?`,
      `${hello}${name ? ' ' + name : ''} ! Un petit chrono de lecture ?`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }


  /* ---------- avatar & first-launch welcome ---------- */
  const AVATARS = ['mascot', 1, 13, 25, 37, 49, 61, 73, 85, 4, 16, 28, 40, 64, 76, 88];
  window.Avatar = {
    list: AVATARS.map(a => a === 'mascot' ? 'mascot' : 'c:' + a),
    html(id, cls = '') {
      if (id && id.startsWith && id.startsWith('c:')) {
        const c = Cards.CARDS[+id.slice(2) - 1];
        if (c) return `<span class="av ${cls}"><img src="${Cards.art(c)}" alt=""></span>`;
      }
      return `<span class="av ${cls}">${Pixel.svg('mascot')}</span>`;
    }
  };

  UI.register('welcome', (root, { edit, themeOnly }) => {
    UI.setTitle(edit ? 'Mon profil' : 'Bienvenue !');
    const st = Store.data.settings;
    let name = st.name || '';
    let avatar = st.avatar || 'mascot';
    function stepName() {
      root.innerHTML = '';
      root.classList.add('typing', 'full');
      const w = el(html`<div class="game center-col">
        <div class="home-hero" style="margin:0">${UI.mascot('small')}<div class="bubble">${edit ? 'Tu veux changer ton prénom ?' : `Salut ! Je suis ${Theme.t.mascot}. Comment tu t'appelles ?`}</div></div>
        <div class="name-display"></div></div>`);
      root.appendChild(w);
      const disp = w.querySelector('.name-display');
      const show = () => disp.textContent = name;
      show();
      w.appendChild(UI.keyboard({
        space: true,
        onKey(ch) { if (name.length < 16) { name += name.length === 0 || name.endsWith(' ') || name.endsWith('-') ? ch.toUpperCase() : ch; show(); } },
        onDel() { name = name.slice(0, -1); show(); },
        onOk() {
          name = name.trim();
          if (!name) { UI.shake(disp); return; }
          SFX.play('good'); UI.burstAt(disp, { n: 16 });
          setTimeout(stepAvatar, 500);
        }
      }));
    }
    function stepAvatar() {
      root.innerHTML = '';
      root.classList.remove('typing', 'full');
      const w = el(html`<div class="game center-col">
        <div class="home-hero" style="margin:0">${UI.mascot('small')}<div class="bubble">Super, ${FR.esc(name)} ! Choisis ton image :</div></div>
        <div class="avatar-grid">${Avatar.list.map((a, i) => `<button class="avatar-pick ${a === avatar ? 'sel' : ''}" data-a="${a}" style="animation-delay:${i * 0.04}s">${Avatar.html(a)}</button>`).join('')}</div>
        <button class="pix-btn green big" data-ok>${Pixel.svg('check')} C'est moi !</button></div>`);
      root.appendChild(w);
      w.querySelectorAll('.avatar-pick').forEach(b => b.onclick = () => {
        avatar = b.dataset.a; SFX.play('pop');
        w.querySelectorAll('.avatar-pick').forEach(x => x.classList.toggle('sel', x === b));
      });
      w.querySelector('[data-ok]').onclick = async () => {
        st.name = name; st.avatar = avatar; Store.save(true);
        UI.refreshHud();
        if (edit) { SFX.play('good'); UI.back(); return; }
        stepParent();
      };
    }
    function stepParent() {
      root.innerHTML = '';
      const w = el(html`<div class="game center-col" style="text-align:center">
        <div style="width:clamp(120px,24vmin,240px)">${Avatar.html(avatar)}</div>
        <div class="bubble" style="animation-delay:0s">Dernière étape : demande à un parent de choisir un code secret pour l'espace parent.</div>
        <button class="pix-btn gold big" data-ok>${Pixel.svg('lock')} Je suis le parent</button></div>`);
      root.appendChild(w);
      w.querySelector('[data-ok]').onclick = async () => {
        if (Store.data.settings.pin || await UI.createPin()) {
          st.onboarded = true; Store.save(true);
          SFX.play('level'); UI.confetti();
          UI.home();
        }
      };
    }
    function stepTheme() {
      root.innerHTML = '';
      const w = el(html`<div class="game center-col">
        <h2 class="pix-title" style="text-align:center">Choisis ton monde !</h2>
        <div class="tiles theme-pick">
          <button class="tile theme-tile tt-pixel" data-t="pixel"><span class="ic">${Pixel.svg('mascot')}</span>Monde des blocs<span class="sub">Pixel art, blocs et créatures</span></button>
          <button class="tile theme-tile tt-poney" data-t="poney"><span class="ic">${Theme.previewSVG('poney')}</span>Centre équestre<span class="sub">Kawaii, poneys et chevaux</span></button>
        </div></div>`);
      root.appendChild(w);
      w.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
        SFX.play('good');
        if (b.dataset.t === Theme.id) { st.theme = Theme.id; Store.save(true); if (themeOnly) UI.home(); else stepName(); }
        else Theme.set(b.dataset.t);
      });
    }
    if (!edit && !st.theme) stepTheme(); else stepName();
    return () => root.classList.remove('typing', 'full');
  });

  UI.register('home', (root) => {
    UI.setTitle('');
    const latest = Store.lists()[0];
    const fresh = latest && Date.now() - latest.createdAt < 3 * 86400000;
    const word = 'AFTER SCHOOL';
    root.appendChild(el(html`<div class="center-col">
      <div class="home-hero">
        <div>
          <div class="logo">${[...word].map((c, i) => c === ' ' ? '<br>' : `<span style="animation-delay:${i * 0.12}s">${c}</span>`).join('')}</div>
        </div>
        ${UI.mascot()}
        <div class="bubble">${esc(greeting())}</div>
      </div>
      <div class="tiles">
        <button class="tile" data-go="words" style="background-image:url(${Pixel.texture('herbe')})">
          ${fresh ? '<span class="badge">NOUVEAU</span>' : ''}
          <span class="ic">${Pixel.svg('book')}</span>Mots de la semaine
          <span class="sub">${latest ? latest.words.length + ' mots à apprendre' : 'Pas encore de liste'}</span></button>
        <button class="tile" data-go="revision" style="background-image:url(${Pixel.texture('pierre')})">
          <span class="ic">${Pixel.svg('pickaxe')}</span>Révision<span class="sub">Mots au hasard</span></button>
        <button class="tile" data-go="reading" style="background-image:url(${Pixel.texture('bois')})">
          <span class="ic">${Pixel.svg('clock')}</span>Lecture<span class="sub">Lis et bats ton record</span></button>
        <button class="tile" data-go="cards" style="background-image:url(${Pixel.texture('violet')})">
          ${Cards.left() && Store.data.stats.gems >= Cards.BOOSTER_COST ? '<span class="badge">BOOSTER !</span>' : ''}
          <span class="ic">${Pixel.svg('pack')}</span>Mes cartes<span class="sub">${Cards.ownedCount()} / ${Cards.CARDS.length} · boosters avec tes ${Theme.t.cur}</span></button>
      </div>
    </div>`));
    root.querySelectorAll('.tile').forEach((t, i) => t.style.animationDelay = (0.1 + i * 0.1) + 's');
    root.querySelectorAll('[data-go]').forEach(t => t.onclick = () => {
      const g = t.dataset.go;
      if (g === 'words') UI.go('list', { listId: latest && latest.id });
      else UI.go(g);
    });
    const lockRow = el(`<div class="parent-lock-row center-col"><button class="pix-btn icon-btn wood parent-lock" aria-label="Espace parent">${Pixel.svg('lock')}</button></div>`);
    const lock = lockRow.querySelector('button');
    lock.onclick = async () => { if (await UI.parentGate()) UI.go('parent'); };
    root.appendChild(lockRow);
    const m = root.querySelector('.mascot');
    m.addEventListener('click', () => { UI.mascotReact(root, 'jump'); SFX.play('pop'); UI.burstAt(m, { n: 10, spread: 90 }); root.querySelector('.bubble').textContent = greeting(); });
  });

  SFX.enabled = Store.data.settings.sound !== false;
  if (Store.data.settings.onboarded && !Store.data.settings.theme) UI.go('welcome', { themeOnly: true });
  else if (Store.data.settings.onboarded) UI.go('home'); else UI.go('welcome', {});
})();
