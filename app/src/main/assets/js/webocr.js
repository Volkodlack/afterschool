/* Version web : lecture du texte des photos (fiches, poésies) avec Tesseract, directement dans le navigateur.
   Les fichiers de Tesseract (≈ 5 Mo) ne sont chargés qu'à la première photo. */
(function () {
  if (window.AfterSchoolNative) return;
  const base = new URL('vendor/tesseract/', location.href).href;
  let loading = null;
  const load = () => loading || (loading = new Promise((res, rej) => {
    if (window.Tesseract) return res();
    const s = document.createElement('script'); s.src = base + 'tesseract.min.js';
    s.onload = res; s.onerror = () => { loading = null; rej(new Error('Lecteur de texte indisponible')); };
    document.head.appendChild(s);
  }));
  function shrink(dataUrl, max = 1800, q = .85) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', q));
      };
      img.onerror = () => res(dataUrl);
      img.src = dataUrl;
    });
  }
  window.WebOCR = {
    shrink,
    async read(dataUrl) {
      await load();
      const worker = await Tesseract.createWorker('fra', 1, { workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base + 'lang' });
      try {
        const { data } = await worker.recognize(dataUrl);
        return (data.text || '').replace(/[ \t]+\n/g, '\n').trim();
      } finally { worker.terminate(); }
    }
  };
})();
