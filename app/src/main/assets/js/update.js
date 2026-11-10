/* Mises à jour automatiques de l'appli Android (voir Updater.kt).
   AS_REQUIRED_NATIVE_API : à augmenter en même temps que Updater.NATIVE_API quand le code Android change. */
window.AS_REQUIRED_NATIVE_API = 2;
(function () {
  const N = window.AfterSchoolNative || null;
  const AS = window.AS_native;
  let otaPending = false, apkModal = null;
  const quiet = () => { const c = UI.current && UI.current(); return !document.querySelector('.modal') && (!c || c.name === 'home' || c.name === 'profiles'); };
  AS.otaReady = () => {
    otaPending = true;
    if (quiet()) { UI.toast('✨ Nouvelle version de l\'appli !'); setTimeout(() => N.reloadApp(), 1200); }
  };
  // appliquée dès qu'on revient à l'accueil
  const go = UI.go.bind(UI);
  UI.go = (name, params, opts) => {
    if (otaPending && (name === 'home' || name === 'profiles') && !document.querySelector('.modal')) { otaPending = false; N.reloadApp(); return; }
    return go(name, params, opts);
  };
  AS.updateStatus = (s) => {
    if (s === 'none') UI.toast('L\'appli est à jour 👍');
    else if (s === 'error') UI.toast('Pas de connexion : réessaie plus tard');
  };
  AS.apkAvailable = (ver, size, required) => {
    if (apkModal && apkModal.isConnected) return;
    const mo = size ? Math.round(size / 1048576) + ' Mo' : '';
    apkModal = UI.modal(UI.html`<h2>✨ Nouvelle version ${FR.esc(ver)}</h2>
      <p>${required ? 'Cette mise à jour change le cœur de l\'appli : elle doit être installée.' : 'Une nouvelle version complète de l\'appli est disponible.'} Tes données sont conservées.</p>
      <p class="muted">Téléchargement ${mo ? 'de ' + mo + ' ' : ''}(de préférence en Wi-Fi), puis Android demande de confirmer l'installation.</p>
      <div class="progress apk-prog" style="display:none"><div style="width:0%"></div></div>
      <p class="apk-msg" style="font-weight:700;min-height:1.2em"></p>
      <div class="row center"><button class="pix-btn small" data-a="later">Plus tard</button><button class="pix-btn green big" data-a="go">Installer</button></div>`, { locked: true });
    apkModal.querySelector('[data-a=later]').onclick = () => UI.closeModal();
    apkModal.querySelector('[data-a=go]').onclick = (e) => {
      e.target.disabled = true;
      apkModal.querySelector('.apk-prog').style.display = '';
      apkModal.querySelector('.apk-msg').textContent = 'Téléchargement…';
      N.apkInstall();
    };
  };
  AS.apkProgress = (p) => {
    if (!apkModal) return;
    const bar = apkModal.querySelector('.apk-prog > div'), msg = apkModal.querySelector('.apk-msg'), btn = apkModal.querySelector('[data-a=go]');
    if (p === -2) { msg.textContent = 'Autorise « After School » à installer des applis (interrupteur), reviens ici puis appuie encore sur Installer.'; btn.disabled = false; return; }
    if (p === -1) { msg.textContent = 'Le téléchargement a échoué. Vérifie la connexion et réessaie.'; btn.disabled = false; return; }
    bar.style.width = p + '%';
    msg.textContent = p >= 100 ? 'Android va proposer l\'installation : appuie sur « Mettre à jour ».' : `Téléchargement… ${p} %`;
  };
  window.AppUpdate = {
    available: !!(N && N.updateInfo),
    info() { try { return JSON.parse(N.updateInfo()); } catch (e) { return null; } },
    check() { if (N && N.updateCheck) { UI.toast('Recherche d\'une mise à jour…'); N.updateCheck(); } },
    confirm() { try { N && N.updateConfirm && N.updateConfirm(); } catch (e) {} }
  };
})();
