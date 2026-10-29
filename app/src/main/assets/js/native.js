/* Bridge to Android (text-to-speech, camera + OCR, vibration) with browser fallbacks, plus 8-bit sound effects. */
(function () {
  const N = window.AfterSchoolNative || null;
  const listeners = {};
  let seq = 0;

  const AS_native = {
    hasNative: !!N,
    ttsEvent(type, id) {
      const l = listeners[id];
      if (!l) return;
      if (type === 'start' && l.onStart) l.onStart();
      if (type === 'done') { delete listeners[id]; l.onDone && l.onDone(); }
    },
    ttsRange(id, start, end) {
      const l = listeners[id];
      if (l && l.onRange) l.onRange(start, end);
    },
    _photoCb: null,
    _processingCb: null,
    onPhotoProcessing() { this._processingCb && this._processingCb(); },
    onPhoto(result) {
      const cb = this._photoCb;
      this._photoCb = null;
      cb && cb(result);
    }
  };
  window.AS_native = AS_native;

  let frVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    frVoice = vs.find(v => /fr[-_]FR/i.test(v.lang)) || vs.find(v => /^fr/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  const Speech = {
    rate: 0.9,
    available() {
      if (N) { try { return N.ttsAvailable(); } catch (e) { return false; } }
      return 'speechSynthesis' in window;
    },
    /* speak(text, {rate, onDone, onRange, onStart}) -> id */
    speak(text, opts = {}) {
      const id = 'u' + (++seq);
      const rate = opts.rate || this.rate;
      listeners[id] = { onDone: opts.onDone, onRange: opts.onRange, onStart: opts.onStart };
      if (N) {
        try { N.speak(String(text), rate, id); } catch (e) { AS_native.ttsEvent('done', id); }
        return id;
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = 'fr-FR'; u.rate = rate;
        if (frVoice) u.voice = frVoice;
        u.onstart = () => AS_native.ttsEvent('start', id);
        u.onend = () => AS_native.ttsEvent('done', id);
        u.onerror = () => AS_native.ttsEvent('done', id);
        u.onboundary = (ev) => {
          if (ev.name && ev.name !== 'word') return;
          const t = String(text);
          let end = ev.charIndex;
          while (end < t.length && /[\p{L}\p{N}'’-]/u.test(t[end])) end++;
          AS_native.ttsRange(id, ev.charIndex, end);
        };
        speechSynthesis.speak(u);
        return id;
      }
      setTimeout(() => AS_native.ttsEvent('done', id), 300);
      return id;
    },
    stop() {
      Object.keys(listeners).forEach(k => delete listeners[k]);
      if (N) { try { N.stopSpeak(); } catch (e) {} }
      else if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
  };
  window.Speech = Speech;

  window.Photo = {
    available: !!N,
    take(onResult, onProcessing) {
      AS_native._photoCb = onResult; AS_native._processingCb = onProcessing;
      if (N) N.takePhoto(); else this._browserPick(onResult, onProcessing);
    },
    pick(onResult, onProcessing) {
      AS_native._photoCb = onResult; AS_native._processingCb = onProcessing;
      if (N) N.pickPhoto(); else this._browserPick(onResult, onProcessing);
    },
    _browserPick(onResult, onProcessing) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return AS_native.onPhoto(null);
        onProcessing && onProcessing();
        const r = new FileReader();
        r.onload = () => AS_native.onPhoto({ text: '', image: r.result, ocrError: 'OCR indisponible dans le navigateur' });
        r.readAsDataURL(f);
      };
      inp.click();
    }
  };

  window.Haptic = (ms) => {
    if (N) { try { N.vibrate(ms || 40); } catch (e) {} }
    else if (navigator.vibrate) navigator.vibrate(ms || 40);
  };

  /* ---------- 8-bit sound effects ---------- */
  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type = 'square', vol = 0.12, slideTo) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(start, dur, vol = 0.15) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + start;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain(); g.gain.value = vol;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    s.connect(f).connect(g).connect(c.destination);
    s.start(t0);
  }
  const SFX = {
    enabled: true,
    play(name) {
      if (!this.enabled) return;
      switch (name) {
        case 'tap': tone(660, 0, 0.05, 'square', 0.06); break;
        case 'key': tone(520 + Math.random() * 120, 0, 0.04, 'square', 0.05); break;
        case 'good': [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.12, 'square', 0.09)); break;
        case 'bad': tone(220, 0, 0.18, 'sawtooth', 0.08, 140); tone(160, 0.15, 0.22, 'sawtooth', 0.07, 100); break;
        case 'gem': tone(1318, 0, 0.06, 'square', 0.07); tone(1760, 0.06, 0.12, 'square', 0.07); break;
        case 'break': noise(0, 0.25, 0.22); tone(180, 0, 0.12, 'triangle', 0.15, 80); break;
        case 'place': tone(300, 0, 0.06, 'triangle', 0.15, 200); noise(0, 0.06, 0.08); break;
        case 'pop': tone(400, 0, 0.08, 'square', 0.07, 900); break;
        case 'beep': tone(880, 0, 0.15, 'square', 0.09); break;
        case 'go': tone(1320, 0, 0.35, 'square', 0.1); break;
        case 'whoosh': noise(0, 0.18, 0.06); break;
        case 'win': [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.16, 'square', 0.09)); tone(130, 0, 0.66, 'triangle', 0.12); break;
        case 'level': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.2, 'square', 0.09)); [262, 330, 392].forEach((f, i) => tone(f, 0.55 + i * 0.12, 0.4, 'triangle', 0.1)); break;
        case 'record': [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.1, 0.2, 'square', 0.09)); break;
      }
    }
  };
  window.SFX = SFX;
})();
