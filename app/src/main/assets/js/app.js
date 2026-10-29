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
      `${hello}${name ? ' ' + name : ''} ! On mine quelques mots ?`,
      `${hello}${name ? ' ' + name : ''} ! Un nouveau booster de cartes ?`,
      `${hello}${name ? ' ' + name : ''} ! Un petit chrono de lecture ?`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

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
          <span class="ic">${Pixel.svg('pack')}</span>Mes cartes<span class="sub">${Cards.ownedCount()} / ${Cards.CARDS.length} · boosters avec tes émeraudes</span></button>
      </div>
    </div>`));
    root.querySelectorAll('.tile').forEach((t, i) => t.style.animationDelay = (0.1 + i * 0.1) + 's');
    root.querySelectorAll('[data-go]').forEach(t => t.onclick = () => {
      const g = t.dataset.go;
      if (g === 'words') UI.go('list', { listId: latest && latest.id });
      else UI.go(g);
    });
    const lock = el(`<button class="pix-btn icon-btn wood parent-lock" aria-label="Espace parent">${Pixel.svg('lock')}</button>`);
    lock.onclick = async () => { if (await UI.parentGate()) UI.go('parent'); };
    document.body.appendChild(lock);
    const m = root.querySelector('.mascot');
    m.addEventListener('click', () => { UI.mascotReact(root, 'jump'); SFX.play('pop'); UI.burstAt(m, { n: 10, spread: 90 }); root.querySelector('.bubble').textContent = greeting(); });
    return () => lock.remove();
  });

  SFX.enabled = Store.data.settings.sound !== false;
  UI.go('home');
})();
