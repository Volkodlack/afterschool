/* After School — correction par l'IA du texte lu sur une photo (fiche de lecture, poésie, liste de mots).
   La reconnaissance de texte se trompe souvent : accents, apostrophes, lettres confondues, mots coupés.
   L'IA corrige ces erreurs sans reformuler. Workers AI (offre gratuite), appelé uniquement par l'appli. */
const MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const ORIGINS = [
  'https://afterschool.sinisterkid.win',
  'https://appassets.androidplatform.net',
  'https://volkodlack.github.io',
  'http://127.0.0.1:8765', 'http://localhost:8765'
];
const KIND = {
  texte: "un texte de lecture (des phrases, des paragraphes)",
  phrases: "une liste de phrases (une par ligne)",
  poesie: "une poésie (un vers par ligne, une ligne vide entre les strophes)",
  mots: "une liste de mots ou de sons à lire (un élément par ligne ou séparés par des espaces)",
  sons: "une liste de sons ou de syllabes (un élément par ligne ou séparés par des espaces)"
};
const SYSTEM = (kind) => `Tu corriges le texte d'une fiche d'école primaire française, obtenu par reconnaissance optique (OCR) d'une photo. C'est ${KIND[kind] || KIND.texte}.
Corrige UNIQUEMENT les erreurs de lecture de la photo :
- accents manquants ou faux (a/à, ou/où, la/là, e/é/è/ê, c/ç…), selon le sens de la phrase ;
- apostrophes manquantes ou en trop (lenfant → l'enfant, dune → d'une, quil → qu'il) ;
- lettres confondues (l/I/1/|, O/0, rn/m, cl/d, ii/ü…), majuscules en début de phrase, espaces en trop ou manquants ;
- mots coupés par un tiret en fin de ligne (mar- che → marche) ; lignes coupées au milieu d'une phrase dans un texte (recolle-les) ;
- parasites évidents : numéros de page, traits, puces, symboles isolés, morceaux de consigne illisibles.
Ne reformule JAMAIS, ne remplace pas un mot correct par un synonyme, n'ajoute rien, ne résume pas, ne traduis pas. Garde l'orthographe et la ponctuation voulues par l'auteur, les tirets de dialogue, les guillemets et les retours à la ligne utiles (vers, listes, paragraphes).
Réponds uniquement avec le texte corrigé, sans guillemets autour, sans commentaire.`;

function cors(origin) {
  const ok = ORIGINS.includes(origin);
  return { 'Access-Control-Allow-Origin': ok ? origin : ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, h) });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'afterschool-ia' }, 200, h);
    if (req.method !== 'POST' || url.pathname !== '/fix') return json({ error: 'not found' }, 404, h);
    if (!ORIGINS.includes(origin)) return json({ error: 'origin' }, 403, h);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    if (env.LIMIT) { const { success } = await env.LIMIT.limit({ key: ip }); if (!success) return json({ error: 'rate' }, 429, h); }
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'json' }, 400, h); }
    const text = String(body.text || '').slice(0, 6000).trim();
    const kind = KIND[body.kind] ? body.kind : 'texte';
    if (!text) return json({ text: '' }, 200, h);
    try {
      const r = await env.AI.run(MODEL, {
        messages: [{ role: 'system', content: SYSTEM(kind) }, { role: 'user', content: text }],
        temperature: 0, max_tokens: Math.min(4000, Math.ceil(text.length / 2) + 200)
      });
      let out = String((r && (r.response ?? r.result?.response)) || '').trim();
      out = out.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^« ?| ?»$/g, '').trim();
      return json({ text: out, model: MODEL }, 200, h);
    } catch (e) {
      const m = String(e && e.message || e);
      return json({ error: /neuron|quota|allocation/i.test(m) ? 'quota' : 'ai', detail: m.slice(0, 200) }, 502, h);
    }
  }
};
