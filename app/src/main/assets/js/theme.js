/* Themes: "pixel" (blocks) and "poney" (kawaii equestrian centre, vector art). */
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get('theme') || Store.data.settings.theme || 'pixel';
  const OL = '#6b4a5a'; // kawaii outline

  const STR = {
    pixel: {
      cur: 'émeraudes', mascot: 'Bloki', greet: 'On mine quelques mots ?', pv: 'PV',
      oreName: 'Le bon bloc', oreDesc: 'Casse le bon mot', orePrompt: 'Écoute, puis casse le bloc du mot bien écrit !',
      packTitle: 'CARTES<br>AFTER<br>SCHOOL', legendTxt: 'Une légende que très peu de dresseurs ont vue.',
      worldName: 'Monde des blocs', trainer: 'dresseur'
    },
    poney: {
      cur: 'fers à cheval', mascot: 'Caramel', greet: 'On part au galop ?', pv: '♥',
      oreName: 'La bonne carotte', oreDesc: 'Trouve le mot bien écrit', orePrompt: 'Écoute, puis donne au poney la carotte du mot bien écrit !',
      packTitle: 'MES<br>PONEYS', legendTxt: 'Un poney de légende que très peu de cavaliers ont vu.',
      worldName: 'Centre équestre', trainer: 'cavalier'
    }
  };

  /* ---------- kawaii pony (vector) ---------- */
  function ponySVG(o, inline) {
    const uid = 'p' + Math.random().toString(36).slice(2, 8);
    const coat = o.gold ? `url(#${uid}g)` : o.coat;
    const manes = o.rainbow ? ['#ff8fb1', '#ffb36b', '#ffe066', '#8fe0a0', '#7ec8f5', '#c49bf0'] : [o.mane, o.mane2 || o.mane];
    const mc = i => manes[i % manes.length];
    // shapes that make the silhouette (outlined as one)
    const silhouette = [
      `<ellipse cx="44" cy="62" rx="24" ry="15"/>`,
      `<path d="M56 60 C58 46 61 36 65 30 L82 36 C78 45 74 54 70 64 Z"/>`,
      `<ellipse cx="72" cy="31" rx="17" ry="15"/>`,
      `<ellipse cx="84" cy="40" rx="10.5" ry="8.5"/>`,
      `<path d="M63 21 L65 7 L73 18 Z"/>`
    ];
    const maneShapes = [[59, 21, 7], [56, 29, 7.5], [55, 38, 7], [56, 47, 6.5], [66, 16, 6], [72, 15, 4.5]];
    const tail = `M23 56 C8 52 4 70 12 84 C14 74 18 68 26 66 Z`;
    let s = `<svg ${inline ? 'class="' + (o.cls || '') + '"' : ''} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">`;
    if (o.gold) s += `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#f5c542"/><stop offset="1" stop-color="#d9a31c"/></linearGradient></defs>`;
    // tail
    s += `<path d="${tail}" fill="${mc(1)}" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += `<path d="M18 62 C12 66 12 74 14 79" fill="none" stroke="${mc(2)}" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`;
    // far legs
    [31, 57].forEach(x => {
      s += `<rect x="${x}" y="66" width="8.5" height="23" rx="4.2" fill="${o.coatDark}" stroke="${OL}" stroke-width="1.6"/>`;
      s += `<rect x="${x}" y="84" width="8.5" height="5.5" rx="2.5" fill="${o.hoof}" stroke="${OL}" stroke-width="1.4"/>`;
    });
    // far wing
    if (o.wings) s += `<path d="M46 50 C40 34 48 22 58 26 C55 32 60 34 57 40 C62 39 63 45 58 48 Z" fill="#f3ecff" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round" transform="translate(-6 -2)"/>`;
    // mane outline (behind)
    s += `<g fill="${OL}">${maneShapes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 1.6}"/>`).join('')}</g>`;
    // silhouette: outline pass then fill pass
    s += `<g fill="${OL}" stroke="${OL}" stroke-width="3.2" stroke-linejoin="round">${silhouette.join('')}</g>`;
    s += `<g fill="${coat}">${silhouette.join('')}</g>`;
    s += `<ellipse cx="84" cy="40" rx="10.5" ry="8.5" fill="${o.muzzle}"/>`;
    s += `<path d="M65 18.5 L66.3 10.5 L70.6 17.5 Z" fill="#ffb3c7"/>`;
    // belly shine
    s += `<ellipse cx="40" cy="57" rx="13" ry="5" fill="#ffffff" opacity=".18"/>`;
    // spots
    if (o.spots) [[34, 58, 3], [44, 66, 2.4], [50, 55, 2.8], [28, 64, 2]].forEach(([x, y, r]) => s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.coatDark}" opacity=".55"/>`);
    // saddle pad + rosette
    if (o.saddle) {
      s += `<path d="M32 48 Q44 44 56 48 L54 62 Q44 65 34 62 Z" fill="${o.saddle}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += `<path d="M34 59 Q44 62 54 59" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="2 2"/>`;
    }
    if (o.blanket) {
      s += `<path d="M28 50 Q44 43 60 50 L58 66 Q44 70 30 66 Z" fill="${o.blanket}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>`;
      [[36, 55], [46, 60], [52, 52], [40, 63]].forEach(([x, y]) => s += `<path d="M${x} ${y - 2.2} l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#fff6b0"/>`);
    }
    // near legs
    [24, 50].forEach(x => {
      s += `<rect x="${x}" y="66" width="9" height="24" rx="4.5" fill="${coat}" stroke="${OL}" stroke-width="1.6"/>`;
      if (o.socks) s += `<rect x="${x + .8}" y="78" width="7.4" height="7" rx="2" fill="#ffffff"/>`;
      s += `<rect x="${x}" y="84.5" width="9" height="5.5" rx="2.5" fill="${o.hoof}" stroke="${OL}" stroke-width="1.4"/>`;
    });
    // near wing
    if (o.wings) s += `<path d="M38 56 C26 44 30 28 42 30 C40 36 47 37 44 43 C51 41 53 48 47 52 C50 54 46 59 38 56 Z" fill="#ffffff" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/><path d="M36 42 C38 46 41 48 44 49" fill="none" stroke="#d9c8f0" stroke-width="1.3" stroke-linecap="round"/>`;
    // scarf
    if (o.scarf) s += `<path d="M58 52 C64 57 72 56 76 49" fill="none" stroke="${OL}" stroke-width="8.6" stroke-linecap="round"/><path d="M58 52 C64 57 72 56 76 49" fill="none" stroke="${o.scarf}" stroke-width="6" stroke-linecap="round"/><path d="M64 55 L62 66 L67 65 Z" fill="${o.scarf}" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/>`;
    // mane fill
    s += maneShapes.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${mc(i)}"/>`).join('');
    s += `<path d="M53 28 C55 34 54 40 55 46" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>`;
    // blaze / star
    if (o.blaze === 'star') s += `<path d="M76 22 l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#ffffff"/>`;
    if (o.blaze === 'stripe') s += `<path d="M75 21 C78 26 82 31 86 35" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`;
    // horn
    if (o.horn) s += `<path d="M69 17 L75 -1 L78.5 18 Z" fill="${o.gold ? '#fff2a8' : '#ffe58a'}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/><path d="M70.5 12 L77 10 M72 6 L76.5 5" stroke="#d9a31c" stroke-width="1.3" stroke-linecap="round"/>`;
    // eye, lashes, blush, nostril, mouth
    s += `<g class="eye"><ellipse cx="74" cy="31" rx="5.2" ry="6.4" fill="#3b2541"/><circle cx="75.9" cy="28.6" r="2.1" fill="#fff"/><circle cx="72.4" cy="33.6" r="1.1" fill="#fff"/></g>`;
    s += `<path d="M78.5 26.5 l3-2.2 M79.5 29 l3.3-1" stroke="#3b2541" stroke-width="1.3" stroke-linecap="round"/>`;
    s += `<ellipse cx="80" cy="38.5" rx="3.6" ry="2.2" fill="#ff8fb1" opacity=".6"/>`;
    s += `<ellipse cx="89" cy="38" rx="1.3" ry="1.8" fill="${OL}" opacity=".55"/>`;
    s += `<path d="M84 45 q3 2.4 6 .2" fill="none" stroke="${OL}" stroke-width="1.3" stroke-linecap="round"/>`;
    if (o.glasses) s += `<rect x="67" y="26" width="14" height="10" rx="4" fill="#3b2541" opacity=".9"/><path d="M67 30 L60 28" stroke="#3b2541" stroke-width="1.5"/><path d="M70 28 l3 0" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`;
    // bow
    if (o.bow) s += `<g transform="translate(58 19)"><path d="M0 0 L-8 -5 L-8 5 Z M0 0 L8 -5 L8 5 Z" fill="${o.bow}" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/><circle r="2.6" fill="${o.bow}" stroke="${OL}" stroke-width="1.4"/></g>`;
    // flower crown
    if (o.flowers) [[62, 15, '#ff8fb1'], [68, 12, '#ffe066'], [74, 13, '#ffffff'], [57, 19, '#c49bf0']].forEach(([x, y, c]) => {
      s += `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180) * 2.2).toFixed(2)}" cy="${(Math.sin(a * Math.PI / 180) * 2.2).toFixed(2)}" r="1.9" fill="${c}" stroke="${OL}" stroke-width=".8"/>`).join('')}<circle r="1.3" fill="#ffb36b"/></g>`;
    });
    // royal crown
    if (o.crown) s += `<path d="M60 14 L62 4 L66 10 L69 1 L72 10 L76 4 L77 14 Z" fill="#ffd54f" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="69" cy="10" r="1.3" fill="#ff8fb1"/>`;
    // rosette
    if (o.rosette) s += `<g transform="translate(40 52)"><path d="M-3 4 L-5 14 L-1 11 L1 15 L3 5" fill="#3d7be5" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>${[...Array(10)].map((_, i) => `<circle cx="${(Math.cos(i * .628) * 5).toFixed(2)}" cy="${(Math.sin(i * .628) * 5).toFixed(2)}" r="2.2" fill="${o.rosette}" stroke="${OL}" stroke-width=".8"/>`).join('')}<circle r="4" fill="#fff6b0" stroke="${OL}" stroke-width="1"/></g>`;
    if (o.sparkles) [[10, 18], [90, 70], [20, 40], [88, 12]].forEach(([x, y]) => s += `<path d="M${x} ${y - 4} Q${x} ${y} ${x + 4} ${y} Q${x} ${y} ${x} ${y + 4} Q${x} ${y} ${x - 4} ${y} Q${x} ${y} ${x} ${y - 4}Z" fill="#fff6b0" stroke="#f5c542" stroke-width=".8"/>`);
    return s + '</svg>';
  }

  /* ---------- kawaii icons (24x24) ---------- */
  const st = `stroke="${OL}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
  const W = (c, body) => `<svg class="${c}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const ICONS = {
    gem: c => W(c, `<path d="M6 4 C3.5 10 4.5 17 12 19.5 C19.5 17 20.5 10 18 4" fill="none" stroke="${OL}" stroke-width="6.4" stroke-linecap="round"/><path d="M6 4 C3.5 10 4.5 17 12 19.5 C19.5 17 20.5 10 18 4" fill="none" stroke="#f5c542" stroke-width="3.6" stroke-linecap="round"/><g fill="#fff8d0"><circle cx="5.6" cy="9" r=".9"/><circle cx="7" cy="14.5" r=".9"/><circle cx="18.4" cy="9" r=".9"/><circle cx="17" cy="14.5" r=".9"/></g>`),
    star: c => W(c, `<path d="M12 2.5l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 16.8l-5.7 3 1.2-6.3L2.9 9.1l6.3-.8z" fill="#ffd54f" ${st}/><circle cx="9.6" cy="12" r=".9" fill="${OL}"/><circle cx="14.4" cy="12" r=".9" fill="${OL}"/>`),
    heart: c => W(c, `<path d="M12 20s-8-4.8-8-10.3C4 6.8 6 5 8.3 5c1.6 0 2.9.9 3.7 2.2C12.8 5.9 14.1 5 15.7 5 18 5 20 6.8 20 9.7 20 15.2 12 20 12 20z" fill="#ff7aa8" ${st}/><ellipse cx="8.2" cy="8.6" rx="1.6" ry="1" fill="#fff" opacity=".7"/>`),
    pickaxe: c => W(c, `<path d="M15.5 8.5 L4 20 Q3 19 4.2 17.6 L12.5 6.3 Z" fill="#ff9d4d" ${st}/><path d="M7 15.5l2 1M9.2 12.5l2 1" stroke="${OL}" stroke-width="1.1" stroke-linecap="round"/><path d="M14 7 C13 4 15 2.5 16 4 C17 2 19.5 3 18 5 C21 5 21 7.5 18.5 8 C19 10 16.5 10.5 16 9 Z" fill="#7bd389" ${st}/>`),
    book: c => W(c, `<path d="M12 6 C9 4.5 5.5 4.5 3 5.5 V19 C5.5 18 9 18 12 19.5 C15 18 18.5 18 21 19 V5.5 C18.5 4.5 15 4.5 12 6Z" fill="#ffd1e3" ${st}/><path d="M12 6v13.5" ${st}/><path d="M5.5 9h4M5.5 12h4M14.5 9h4M14.5 12h4" stroke="#ff8fb1" stroke-width="1.3" stroke-linecap="round"/>`),
    clock: c => W(c, `<circle cx="12" cy="13" r="8" fill="#fff" ${st}/><circle cx="12" cy="13" r="6" fill="#e9f7ff"/><path d="M12 13V9.2M12 13l3 1.6" ${st}/><rect x="10" y="2.5" width="4" height="2.5" rx="1" fill="#ff8fb1" ${st}/><circle cx="12" cy="13" r="1" fill="${OL}"/>`),
    mic: c => W(c, `<rect x="8.5" y="3" width="7" height="11" rx="3.5" fill="#c49bf0" ${st}/><path d="M5.5 11.5 a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" fill="none" ${st}/>`),
    camera: c => W(c, `<rect x="2.5" y="7" width="19" height="13" rx="4" fill="#8fe0c8" ${st}/><path d="M8 7l1.5-3h5L16 7" fill="#8fe0c8" ${st}/><circle cx="12" cy="13.5" r="4" fill="#fff" ${st}/><circle cx="12" cy="13.5" r="2" fill="#7ec8f5"/><circle cx="18" cy="10" r="1" fill="#ff8fb1"/>`),
    image: c => W(c, `<rect x="2.5" y="4" width="19" height="16" rx="4" fill="#cfeaff" ${st}/><path d="M3 17l5-5 4 4 3-3 6 5v.5a3.5 3.5 0 0 1-3.5 1.5h-11A3.5 3.5 0 0 1 3 17z" fill="#8fe0a0" ${st}/><circle cx="16.5" cy="8.5" r="2" fill="#ffe066" ${st}/>`),
    speaker: c => W(c, `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#ffd54f" ${st}/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" fill="none" ${st}/>`),
    chest: c => W(c, `<rect x="3" y="9" width="18" height="11" rx="3" fill="#ffb3c7" ${st}/><path d="M3 9h18v3H3z" fill="#ff8fb1" ${st}/><path d="M12 9v11" stroke="#fff" stroke-width="2"/><path d="M12 9 C8 9 6 5 8.5 4.5 C10.5 4 12 9 12 9 C12 9 13.5 4 15.5 4.5 C18 5 16 9 12 9Z" fill="#fff" ${st}/>`),
    lock: c => W(c, `<path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="10.5" width="14" height="10.5" rx="3.5" fill="#ffd1e3" ${st}/><path d="M12 13.6c-.9-.9-2.4-.2-2.4 1 0 1.5 2.4 2.8 2.4 2.8s2.4-1.3 2.4-2.8c0-1.2-1.5-1.9-2.4-1z" fill="#ff7aa8"/>`),
    back: c => W(c, `<path d="M10 5 L3.5 12 L10 19 V15 H19 A1.5 1.5 0 0 0 20.5 13.5 V10.5 A1.5 1.5 0 0 0 19 9 H10Z" fill="#fff" ${st}/>`),
    play: c => W(c, `<path d="M7 4.5 C7 3.5 8 3 8.8 3.5 L19 10.8 C19.8 11.4 19.8 12.6 19 13.2 L8.8 20.5 C8 21 7 20.5 7 19.5Z" fill="#fff" ${st}/>`),
    stop: c => W(c, `<rect x="5" y="5" width="14" height="14" rx="3.5" fill="#fff" ${st}/>`),
    check: c => W(c, `<path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" fill="none" stroke="#9be7a8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),
    cross: c => W(c, `<path d="M6 6l12 12M18 6L6 18" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M6 6l12 12M18 6L6 18" stroke="#ff8fa3" stroke-width="2.6" stroke-linecap="round"/>`),
    plus: c => W(c, `<path d="M12 4v16M4 12h16" stroke="${OL}" stroke-width="5.4" stroke-linecap="round"/><path d="M12 4v16M4 12h16" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`),
    pencil: c => W(c, `<path d="M4 20l1.2-4.6L16.3 4.3a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="#ffd54f" ${st}/><path d="M14.5 6l3.5 3.5" ${st}/><path d="M4 20l1.2-4.6 3.4 3.4z" fill="#ffd1b0" ${st}/>`),
    trash: c => W(c, `<path d="M6 8h12l-1 12a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.5z" fill="#ffd1e3" ${st}/><path d="M4 6.5h16M9.5 6.5V4h5v2.5M10 11v6M14 11v6" fill="none" ${st}/>`),
    sword: c => W(c, `<path d="M12 3.5 l2 4.2 4.6.5-3.4 3.2.9 4.5L12 13.6l-4.1 2.3.9-4.5-3.4-3.2 4.6-.5z" fill="#ffd54f" ${st}/><path d="M9 15l-2 6 3-1.5 1.5 2 1-5.5M15 15l2 6-3-1.5-1.5 2-1-5.5" fill="#ff8fb1" ${st}/>`),
    fire: c => W(c, `<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.4 3-5.4 3.5-9 2.2 1.5 3.4 3.5 3.4 5.5 1-1 1.5-2.2 1.5-3.3 2.4 1.8 4.6 4.3 4.6 7.2 0 3.2-2.5 5.6-6.5 5.6z" fill="#ffb36b" ${st}/><path d="M12 19c-1.8 0-3-1.1-3-2.6 0-1.6 1.6-2.4 2.2-4 1.6 1.2 3.8 2.3 3.8 4 0 1.5-1.2 2.6-3 2.6z" fill="#ffe066"/>`),
    trophy: c => W(c, `<g transform="translate(12 10)">${[...Array(10)].map((_, i) => `<circle cx="${(Math.cos(i * .628) * 5.5).toFixed(2)}" cy="${(Math.sin(i * .628) * 5.5).toFixed(2)}" r="2.6" fill="#ff8fb1" stroke="${OL}" stroke-width="1"/>`).join('')}<circle r="4.5" fill="#ffe066" stroke="${OL}" stroke-width="1.3"/><path d="M-3 7 L-5 13 L-2 12 L0 14.5 L1 8" fill="#7ec8f5" ${st}/><path d="M3 7 L5 13 L2 12" fill="#7ec8f5" ${st}/></g>`),
    ruler: c => W(c, `<rect x="2" y="8" width="20" height="8" rx="3" fill="#ffe066" ${st}/><path d="M6 8v3M10 8v4M14 8v3M18 8v4" ${st}/>`),
    eye: c => W(c, `<path d="M2.5 12 C6 6 18 6 21.5 12 C18 18 6 18 2.5 12Z" fill="#fff" ${st}/><circle cx="12" cy="12" r="3.6" fill="#8b5cf6"/><circle cx="12" cy="12" r="1.7" fill="#3b2541"/><circle cx="13.3" cy="10.7" r="1" fill="#fff"/>`),
    turtle: c => W(c, `<ellipse cx="11" cy="14" rx="7" ry="5" fill="#8fe0a0" ${st}/><path d="M7 12l4-2 4 2-1 4h-6z" fill="#5fbf73" opacity=".6"/><circle cx="19.5" cy="13" r="2.5" fill="#bdf0c5" ${st}/><circle cx="20" cy="12.5" r=".6" fill="${OL}"/><path d="M7 18.5v1.5M15 18.5v1.5" ${st}/>`),
    rabbit: c => W(c, `<ellipse cx="9" cy="6" rx="2" ry="4.5" fill="#fff" ${st}/><ellipse cx="15" cy="6" rx="2" ry="4.5" fill="#fff" ${st}/><circle cx="12" cy="14.5" r="6.5" fill="#fff" ${st}/><circle cx="9.8" cy="13.5" r=".9" fill="${OL}"/><circle cx="14.2" cy="13.5" r=".9" fill="${OL}"/><ellipse cx="12" cy="16" rx="1" ry=".7" fill="#ff8fb1"/>`),
    dice: c => W(c, `<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="#fff" ${st}/><g fill="#ff8fb1"><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="8" cy="16" r="1.6"/><circle cx="16" cy="16" r="1.6"/></g>`),
    letters: c => W(c, `<rect x="1.5" y="6" width="10" height="11" rx="3" fill="#ffd1e3" ${st} transform="rotate(-8 6.5 11.5)"/><rect x="12.5" y="6" width="10" height="11" rx="3" fill="#cfeaff" ${st} transform="rotate(8 17.5 11.5)"/><text x="6.5" y="15" font-size="8" font-weight="700" text-anchor="middle" fill="${OL}" font-family="Fredoka, sans-serif" transform="rotate(-8 6.5 11.5)">A</text><text x="17.5" y="15" font-size="8" font-weight="700" text-anchor="middle" fill="${OL}" font-family="Fredoka, sans-serif" transform="rotate(8 17.5 11.5)">b</text>`),
    rain: c => W(c, `<path d="M6.5 14h11a3.5 3.5 0 0 0 .2-7A5.5 5.5 0 0 0 7.3 7.4 3.4 3.4 0 0 0 6.5 14z" fill="#fff" ${st}/><path d="M8 17.5v2M12 17v3M16 17.5v2" stroke="#7ec8f5" stroke-width="2.2" stroke-linecap="round"/>`),
    hole: c => W(c, `<rect x="2.5" y="6" width="19" height="12" rx="4" fill="#fff" ${st}/><path d="M6 14h3M15 14h3" ${st}/><rect x="10" y="9" width="4" height="6" rx="1.5" fill="#ffe066" ${st}/>`),
    pack: c => W(c, `<rect x="5" y="2.5" width="14" height="19" rx="3.5" fill="#c49bf0" ${st}/><path d="M5 6.5h14" ${st}/><path d="M12 16.5s-3.6-2.1-3.6-4.6c0-1.3.9-2.1 2-2.1.7 0 1.3.4 1.6 1 .3-.6.9-1 1.6-1 1.1 0 2 .8 2 2.1 0 2.5-3.6 4.6-3.6 4.6z" fill="#ff8fb1" ${st}/>`),
    el_prairie: c => W(c, `${[0, 72, 144, 216, 288].map(a => `<circle cx="${(12 + Math.cos(a * Math.PI / 180) * 5).toFixed(2)}" cy="${(12 + Math.sin(a * Math.PI / 180) * 5).toFixed(2)}" r="4" fill="#fff" ${st}/>`).join('')}<circle cx="12" cy="12" r="3.4" fill="#ffd54f" ${st}/>`),
    el_plage: c => W(c, `<path d="M12 21 C5 21 3 15 4 11 C6 13 8 13 9 10 C10 13 14 13 15 10 C16 13 18 13 20 11 C21 15 19 21 12 21Z" fill="#ffd1b0" ${st}/><path d="M12 21V12M8 20l-1-6M16 20l1-6" ${st}/>`),
    el_neige: c => W(c, `<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="#cfeaff" stroke-width="2" stroke-linecap="round"/>`),
    el_foret: c => W(c, `<path d="M12 3 C19 6 20 14 12 21 C4 14 5 6 12 3Z" fill="#8fe0a0" ${st}/><path d="M12 6v15M12 11l-3-2M12 15l3-2" ${st}/>`),
    el_concours: c => ICONS.trophy(c),
    el_carrousel: c => W(c, `<circle cx="12" cy="9" r="6.5" fill="#fff" ${st}/><path d="M6.5 6.5 A6.5 6.5 0 0 1 17.5 6.5 L12 9Z" fill="#ff8fb1"/><path d="M5.6 10.5 A6.5 6.5 0 0 0 12 15.5 L12 9Z" fill="#7ec8f5"/><circle cx="12" cy="9" r="6.5" fill="none" ${st}/><path d="M12 15.5V22" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/>`),
    el_nuit: c => W(c, `<path d="M15 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15 3.5z" fill="#ffe066" ${st}/><circle cx="12" cy="13" r=".9" fill="${OL}"/><circle cx="16" cy="14.5" r=".9" fill="${OL}"/>`),
    el_arcenciel: c => W(c, `${['#ff8fb1', '#ffb36b', '#ffe066', '#8fe0a0', '#7ec8f5'].map((col, i) => `<path d="M${3 + i * 1.6} 18 A${9 - i * 1.6} ${9 - i * 1.6} 0 0 1 ${21 - i * 1.6} 18" fill="none" stroke="${col}" stroke-width="1.8"/>`).join('')}<path d="M2 18.5h5M17 18.5h5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
    mascot: c => ponySVG(Object.assign({ cls: c }, MASCOT), true)
  };
  const MASCOT = { coat: '#e8a66b', coatDark: '#c9844c', mane: '#ff8fb1', mane2: '#ffb3c7', muzzle: '#fff1e0', hoof: '#8a5a4a', bow: '#7ec8f5', blaze: 'star', socks: true };

  /* ---------- pastel textures for tiles ---------- */
  const TEX = {
    herbe: ['#a8e6b0', '#c6f0cc'], terre: ['#e8c9a8', '#f2dcc4'], pierre: ['#c9b8f0', '#ddd0fa'], bois: ['#ffc9a8', '#ffdcc6'],
    violet: ['#ffb3d1', '#ffd1e3'], sable: ['#ffe9a8', '#fff3cc'], brique: ['#ffb0a8', '#ffcdc8'], eau: ['#a8d8ff', '#cce8ff'],
    or: ['#ffe066', '#fff0a8'], gemme: ['#b8f0e8', '#d8faf4'], laine: ['#ffc6dd', '#ffdcea'], tronc: ['#e8c0a0', '#f4d8c0'],
    champi: ['#ffb3c0', '#ffd6dc'], citrouille: ['#ffcc99', '#ffe0bf']
  };
  const texCache = {};
  function pastelTexture(name) {
    if (texCache[name]) return texCache[name];
    const [a, b] = TEX[name] || TEX.violet;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = a; x.fillRect(0, 0, 64, 64);
    x.fillStyle = b;
    [[16, 16], [48, 48]].forEach(([cx, cy]) => {
      x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI * 2); x.fill();
    });
    // tiny heart
    x.fillStyle = 'rgba(255,255,255,.55)';
    const heart = (hx, hy, s) => { x.beginPath(); x.moveTo(hx, hy + s * .35); x.bezierCurveTo(hx - s, hy - s * .4, hx - s * .2, hy - s, hx, hy - s * .3); x.bezierCurveTo(hx + s * .2, hy - s, hx + s, hy - s * .4, hx, hy + s * .35); x.fill(); };
    heart(48, 18, 6); heart(16, 50, 6);
    texCache[name] = cv.toDataURL();
    return texCache[name];
  }

  /* ---------- pony card set ---------- */
  const pony = {
    EL: {
      prairie:   { name: 'Prairie', frame: '#8fd49b', frame2: '#5fae6e', bg: '#eafbe8', manes: ['#ffe066', '#ff8fb1', '#ffffff', '#ffb36b'], acc: 'flowers',
                   atk: ['Petit trot', 'Roulade dans l\'herbe', 'Bouquet surprise', 'Galop fleuri'], txt: ['Il adore les pissenlits.', 'Elle fait la sieste au soleil.', 'Il collectionne les trèfles à quatre feuilles.'] },
      plage:     { name: 'Plage', frame: '#7fd6d0', frame2: '#3faaa2', bg: '#e6fbfa', manes: ['#7ec8f5', '#ffffff', '#ffd1b0', '#8fe0c8'], acc: 'glasses',
                   atk: ['Galop sur la plage', 'Éclaboussure', 'Château de sable', 'Vague géante'], txt: ['Il adore sauter dans les vagues.', 'Elle ramasse des coquillages.', 'Il fait des bulles dans l\'eau.'] },
      neige:     { name: 'Neige', frame: '#a9d4f5', frame2: '#6aa8d8', bg: '#f0f8ff', manes: ['#ffffff', '#cfeaff', '#c49bf0', '#ffd1e3'], acc: 'scarf',
                   atk: ['Glissade', 'Boule de neige', 'Câlin tout chaud', 'Flocon magique'], txt: ['Il porte une écharpe tricotée par sa mamie.', 'Elle adore le chocolat chaud.', 'Il fait des anges dans la neige.'] },
      foret:     { name: 'Forêt', frame: '#b5c98a', frame2: '#7f9a52', bg: '#f3f7e6', manes: ['#a0663f', '#d9a066', '#5c8a3a', '#f2c46d'], acc: 'flowers',
                   atk: ['Cache-cache', 'Saut de ruisseau', 'Cueillette', 'Chant des oiseaux'], txt: ['Il connaît tous les écureuils.', 'Elle cherche des champignons.', 'Il trotte sans faire de bruit.'] },
      concours:  { name: 'Concours', frame: '#8fb3f5', frame2: '#5577cc', bg: '#eef3ff', manes: ['#3b2541', '#6b4a5a', '#ffffff', '#c9844c'], acc: 'saddle',
                   atk: ['Saut d\'obstacle', 'Dressage', 'Tour d\'honneur', 'Sans faute'], txt: ['Il a gagné plein de flots.', 'Elle saute très haut.', 'Il salue toujours le jury.'] },
      carrousel: { name: 'Carrousel', frame: '#ffa8cf', frame2: '#e07aa8', bg: '#fff0f7', manes: ['#ff8fb1', '#c49bf0', '#7ec8f5', '#ffe066'], acc: 'bow',
                   atk: ['Tourbillon sucré', 'Danse en rond', 'Pluie de bonbons', 'Musique magique'], txt: ['Il tourne, tourne, tourne…', 'Elle sent la barbe à papa.', 'Il adore la fête foraine.'] },
      nuit:      { name: 'Nuit étoilée', frame: '#9b8fe0', frame2: '#6a5cb8', bg: '#eeebff', manes: ['#3b2a7a', '#6a5cb8', '#c49bf0', '#ffe066'], acc: 'blanket',
                   atk: ['Vœu d\'étoile', 'Rêve doux', 'Lumière de lune', 'Berceuse'], txt: ['Il compte les étoiles avant de dormir.', 'Elle fait de jolis rêves.', 'Il brille un peu dans le noir.'] },
      arcenciel: { name: 'Arc-en-ciel', frame: '#d0a8f5', frame2: '#9c6fd0', bg: '#f8f0ff', manes: ['rainbow'], acc: 'bow',
                   atk: ['Arc magique', 'Paillettes', 'Sourire arc-en-ciel', 'Pluie de couleurs'], txt: ['Il laisse des couleurs partout où il passe.', 'Elle adore les paillettes.', 'Il apparaît après la pluie.'] }
    },
    NAMES: {
      prairie: ['Noisette', 'Pâquerette', 'Biscotte', 'Trèfle', 'Pomme', 'Coquelicot', 'Muguet', 'Brioche', 'Câline', 'Bouton-d\'Or', 'Marguerite', 'Printemps'],
      plage: ['Coquillage', 'Vaguette', 'Écume', 'Corail', 'Mouette', 'Galet', 'Lagune', 'Perle', 'Embrun', 'Marina', 'Océane', 'Tropique'],
      neige: ['Flocon', 'Givrette', 'Igloo', 'Chamallow', 'Moufle', 'Bonnet', 'Frimousse', 'Polaire', 'Banquise', 'Cristal', 'Neigeotte', 'Blizzard'],
      foret: ['Noisetin', 'Mousse', 'Fougère', 'Champi', 'Myrtille', 'Châtaigne', 'Écureuil', 'Pomme-de-Pin', 'Lierre', 'Sylve', 'Chêne', 'Clairière'],
      concours: ['Galopin', 'Rosette', 'Obstacle', 'Médaille', 'Cavalcade', 'Dressage', 'Victoire', 'Podium', 'Champion', 'Trophée', 'Sans-Faute', 'Grand-Prix'],
      carrousel: ['Guimauve', 'Praline', 'Bonbon', 'Sucette', 'Nougat', 'Berlingot', 'Barbapapa', 'Macaron', 'Calisson', 'Sucre-d\'Orge', 'Caramelle', 'Fête-Foraine'],
      nuit: ['Lune', 'Doudou', 'Câlinou', 'Minuit', 'Berceuse', 'Rêverie', 'Étoile', 'Comète', 'Aurore', 'Orion', 'Nébuleuse', 'Galaxie'],
      arcenciel: ['Paillette', 'Pastel', 'Iris', 'Bulle', 'Confetti', 'Chantilly', 'Prisme', 'Kaléido', 'Licorette', 'Féerie', 'Merveille', 'Arc-en-Rêve']
    },
    LEGENDS: [['Pégase d\'Or', 'concours'], ['Licorne Étoilée', 'nuit'], ['Reine des Poneys', 'prairie'], ['Galop Céleste', 'arcenciel']]
  };
  const COATS = [
    ['#e8a66b', '#c9844c', '#fff1e0'], ['#c98a5c', '#a46a40', '#f6dcc4'], ['#f2d6a8', '#d9b880', '#fff6e6'], ['#ffffff', '#e6dce8', '#fff0f5'],
    ['#d9d0dc', '#b8acc0', '#f6f0f8'], ['#8a5a4a', '#6b4038', '#e8c8b8'], ['#5a4450', '#3f2e38', '#c8b0bc'], ['#f5c9a0', '#e0a878', '#fff3e6'],
    ['#ffd1e3', '#f0a8c4', '#fff4f8'], ['#cfeaff', '#a0cff0', '#f4fbff'], ['#e8e0f8', '#c4b4e8', '#faf6ff'], ['#c8e8c0', '#9ccc90', '#f2fbf0']
  ];
  const BOWS = ['#ff8fb1', '#7ec8f5', '#c49bf0', '#ffe066', '#8fe0a0'];

  function ponyArt(card, rng) {
    const r = rng('pony-' + card.name);
    const E = pony.EL[card.el];
    const pick = a => a[Math.floor(r() * a.length)];
    const [coat, coatDark, muzzle] = pick(card.el === 'neige' || card.el === 'carrousel' || card.el === 'arcenciel' ? COATS.slice(3) : COATS);
    const mane = pick(E.manes);
    const o = { coat, coatDark, muzzle, hoof: '#7a5a5a', mane: mane === 'rainbow' ? '#ff8fb1' : mane, mane2: mane === 'rainbow' ? '#7ec8f5' : pick(E.manes.filter(m => m !== 'rainbow')) || mane, rainbow: mane === 'rainbow' };
    const rank = { c: 0, pc: 1, r: 2, ur: 3, or: 4 }[card.rar];
    o.blaze = r() < .5 ? pick(['star', 'stripe']) : null;
    o.socks = r() < .4;
    o.spots = r() < .2;
    const acc = E.acc;
    if (rank >= 1 || r() < .3) {
      if (acc === 'flowers') o.flowers = true;
      if (acc === 'glasses') { if (r() < .6) o.glasses = true; else o.bow = pick(BOWS); }
      if (acc === 'scarf') o.scarf = pick(BOWS);
      if (acc === 'saddle') o.saddle = pick(['#3d7be5', '#e5533d', '#5faa3c', '#9b59d0']);
      if (acc === 'bow') o.bow = pick(BOWS);
      if (acc === 'blanket') o.blanket = pick(['#6a5cb8', '#3b2a7a', '#9b8fe0']);
    }
    if (rank >= 2) { if (!o.bow && acc !== 'flowers') o.bow = pick(BOWS); if (acc === 'saddle' || r() < .3) o.rosette = pick(['#ff8fb1', '#ffe066', '#7ec8f5']); }
    if (rank >= 3) { if (r() < .5) o.horn = true; else o.wings = true; o.sparkles = true; }
    if (rank >= 4) {
      o.gold = true; o.coatDark = '#c8921c'; o.muzzle = '#fff6d0'; o.sparkles = true;
      if (card.name.startsWith('Pégase')) o.wings = true;
      if (card.name.startsWith('Licorne')) { o.horn = true; o.blanket = '#6a5cb8'; }
      if (card.name.startsWith('Reine')) { o.crown = true; o.flowers = false; o.bow = null; }
      if (card.name.startsWith('Galop')) { o.wings = true; o.horn = true; o.rainbow = true; }
      if (!o.crown && !o.horn) o.crown = true;
    }
    return ponySVG(o, false);
  }

  /* ---------- apply ---------- */
  const Theme = {
    id, t: STR[id], OL,
    list: [
      { id: 'pixel', name: 'Monde des blocs', desc: 'Pixel art, blocs et créatures' },
      { id: 'poney', name: 'Centre équestre', desc: 'Kawaii, poneys et chevaux' }
    ],
    pony, ponySVG,
    ponyArt,
    set(newId) { Store.data.settings.theme = newId; Store.save(true); location.reload(); },
    previewSVG(tid) { return tid === 'poney' ? ponySVG(MASCOT, true) : null; }
  };
  window.Theme = Theme;

  try { window.AfterSchoolNative && AfterSchoolNative.setBackground(id === 'poney' ? '#ffd6ea' : '#5fb4ee'); } catch (e) {}
  if (id === 'poney') {
    document.body.classList.add('theme-poney');
    const origSvg = Pixel.svg;
    Pixel.svg = (name, cls = '') => ICONS[name] ? ICONS[name](cls) : origSvg(name, cls);
    Pixel.texture = pastelTexture;
    SFX.soft = true;
  } else {
    document.body.classList.add('theme-pixel');
  }
})();
