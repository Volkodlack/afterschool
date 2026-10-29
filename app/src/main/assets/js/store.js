/* Persistent data: lists, sheets, progress (localStorage) + images/recordings (IndexedDB). */
(function () {
  const KEY = 'afterschool.v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const defaults = () => ({
    lists: [],      // {id, title, words:[], createdAt}
    sheets: [],     // {id, title, type, text, imageId, createdAt, attempts:[{id, date, ms, words, recId}]}
    stats: {
      xp: 0, gems: 0, words: {}, days: [], streak: 0, lastDay: null,
      unlocked: ['herbe', 'terre', 'pierre'], totalCorrect: 0
    },
    world: { w: 20, h: 12, cells: {} },
    settings: { name: '', sound: true, ttsRate: 0.85 }
  });

  let data;
  try { data = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { data = defaults(); }
  data.stats = Object.assign(defaults().stats, data.stats || {});
  data.settings = Object.assign(defaults().settings, data.settings || {});
  data.world = Object.assign(defaults().world, data.world || {});

  let saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    const doit = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn(e); } };
    if (now) doit(); else saveTimer = setTimeout(doit, 150);
  }

  /* ---------- IndexedDB blobs ---------- */
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('afterschool', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const Blobs = {
    async put(id, value) {
      const d = await db();
      return new Promise((res, rej) => {
        const tx = d.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').put(value, id);
        tx.oncomplete = () => res(id); tx.onerror = () => rej(tx.error);
      });
    },
    async get(id) {
      if (!id) return null;
      const d = await db();
      return new Promise((res) => {
        const r = d.transaction('blobs').objectStore('blobs').get(id);
        r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
      });
    },
    async del(id) {
      if (!id) return;
      const d = await db();
      return new Promise((res) => {
        const tx = d.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').delete(id);
        tx.oncomplete = () => res(); tx.onerror = () => res();
      });
    }
  };

  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  const Store = {
    data, save, uid, Blobs,

    /* ----- word lists ----- */
    lists() { return data.lists.slice().sort((a, b) => b.createdAt - a.createdAt); },
    list(id) { return data.lists.find(l => l.id === id); },
    saveList(l) {
      if (!l.id) { l.id = uid(); l.createdAt = Date.now(); data.lists.push(l); }
      else { const i = data.lists.findIndex(x => x.id === l.id); if (i >= 0) data.lists[i] = l; else data.lists.push(l); }
      save(true); return l;
    },
    deleteList(id) { data.lists = data.lists.filter(l => l.id !== id); save(true); },
    allWords() {
      const set = new Map();
      data.lists.forEach(l => l.words.forEach(w => { if (!set.has(w.toLowerCase())) set.set(w.toLowerCase(), w); }));
      return [...set.values()];
    },

    /* ----- word stats ----- */
    wordStat(w) { return data.stats.words[w.toLowerCase()] || { ok: 0, err: 0, seen: 0, last: 0, hist: [] }; },
    recordWord(w, firstTry) {
      const k = w.toLowerCase();
      const s = data.stats.words[k] || { ok: 0, err: 0, seen: 0, last: 0, hist: [] };
      s.seen++; s.last = Date.now();
      if (firstTry) s.ok++; else s.err++;
      s.hist = (s.hist || []).concat(firstTry ? 1 : 0).slice(-5);
      data.stats.words[k] = s;
      if (firstTry) data.stats.totalCorrect++;
      save();
    },
    mastery(w) {
      const s = this.wordStat(w);
      const h = s.hist || [];
      if (h.length >= 3 && h.slice(-3).every(x => x)) return 3;
      if (h.length >= 2 && h.slice(-2).every(x => x)) return 2;
      if (s.ok > 0) return 1;
      return 0;
    },
    listMastery(l) {
      if (!l.words.length) return 0;
      return l.words.reduce((a, w) => a + this.mastery(w), 0) / (l.words.length * 3);
    },
    /* weighted random pick for revision: difficult & not-seen-recently words come first */
    revisionWords(n) {
      const words = this.allWords();
      const now = Date.now();
      const scored = words.map(w => {
        const s = this.wordStat(w);
        const errRate = (s.err + 1) / (s.ok + s.err + 2);
        const age = Math.min(14, (now - (s.last || 0)) / 86400000);
        const weight = 0.4 + errRate * 2 + age * 0.12 + (3 - this.mastery(w)) * 0.3;
        return { w, k: Math.pow(Math.random(), 1 / weight) };
      });
      scored.sort((a, b) => b.k - a.k);
      return scored.slice(0, n).map(x => x.w);
    },

    /* ----- rewards ----- */
    level() {
      let xp = data.stats.xp, lvl = 1, need = 100;
      while (xp >= need) { xp -= need; lvl++; need = 100 + (lvl - 1) * 40; }
      return { lvl, cur: xp, need };
    },
    addReward(gems, xp) {
      const before = this.level().lvl;
      data.stats.gems += gems; data.stats.xp += xp;
      this.markDay();
      save();
      const after = this.level().lvl;
      return { levelUp: after > before ? after : 0 };
    },
    spendGems(n) { if (data.stats.gems < n) return false; data.stats.gems -= n; save(true); return true; },
    markDay() {
      const t = todayKey();
      if (data.stats.lastDay === t) return;
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      data.stats.streak = data.stats.lastDay === yk ? (data.stats.streak || 0) + 1 : 1;
      data.stats.lastDay = t;
      save();
    },
    streak() {
      const t = todayKey();
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      if (data.stats.lastDay === t || data.stats.lastDay === yk) return data.stats.streak || 0;
      return 0;
    },

    /* ----- reading sheets ----- */
    sheets() { return data.sheets.slice().sort((a, b) => b.createdAt - a.createdAt); },
    sheet(id) { return data.sheets.find(s => s.id === id); },
    saveSheet(s) {
      if (!s.id) { s.id = uid(); s.createdAt = Date.now(); s.attempts = []; data.sheets.push(s); }
      else { const i = data.sheets.findIndex(x => x.id === s.id); if (i >= 0) data.sheets[i] = s; }
      save(true); return s;
    },
    async deleteSheet(id) {
      const s = this.sheet(id);
      if (!s) return;
      await Blobs.del(s.imageId);
      for (const a of s.attempts || []) await Blobs.del(a.recId);
      data.sheets = data.sheets.filter(x => x.id !== id); save(true);
    },
    async addAttempt(sheet, attempt) {
      sheet.attempts = sheet.attempts || [];
      sheet.attempts.push(attempt);
      // keep last 12 recordings to save space
      const withRec = sheet.attempts.filter(a => a.recId);
      while (withRec.length > 12) { const a = withRec.shift(); await Blobs.del(a.recId); a.recId = null; }
      save(true);
    },
    best(sheet) {
      const a = (sheet.attempts || []);
      if (!a.length) return null;
      return a.reduce((m, x) => (x.ms < m.ms ? x : m));
    },

    resetProgress() {
      const d = defaults();
      data.stats = d.stats; data.world = d.world;
      data.sheets.forEach(s => { (s.attempts || []).forEach(a => Blobs.del(a.recId)); s.attempts = []; });
      save(true);
    }
  };
  window.Store = Store;
})();
