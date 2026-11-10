#!/usr/bin/env python3
"""Génère les illustrations manquantes avec Cloudflare Workers AI (Flux 1 Schnell, offre gratuite : ~10 000 neurones/jour).
Usage : CF_ACCOUNT_ID=... CF_API_TOKEN=... python3 art/generate.py [--limit 120] [--only pixel/q001,poney/c050] [--redo]
Les images sont enregistrées en WebP dans art/<monde>/<id>.webp. S'arrête proprement quand le quota du jour est épuisé."""
import argparse, base64, io, json, os, sys, time, urllib.request, urllib.error
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = '@cf/black-forest-labs/flux-1-schnell'
STEPS = 6

ap = argparse.ArgumentParser()
ap.add_argument('--limit', type=int, default=120)
ap.add_argument('--only', default='')
ap.add_argument('--redo', action='store_true')
a = ap.parse_args()

acc, tok = os.environ.get('CF_ACCOUNT_ID', '').strip(), os.environ.get('CF_API_TOKEN', '').strip()
if not acc or not tok:
    sys.exit('CF_ACCOUNT_ID / CF_API_TOKEN manquants (secrets GitHub)')
url = f'https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/{MODEL}'

prompts = json.load(open(os.path.join(HERE, 'prompts.json')))
only = [x.strip() for x in a.only.split(',') if x.strip()]
todo = []
for p in prompts:
    if only and not any(p['id'] == o or p['id'].startswith(o) for o in only):
        continue
    path = os.path.join(HERE, p['id'] + '.webp')
    if os.path.exists(path) and not a.redo:
        continue
    todo.append(p)
# ordre : d'abord les décors, les cartes de quête et les dorées, puis le reste (alterné entre les deux mondes)
# puis, une fois toutes les cartes faites, les scènes du widget (scène par scène, pour tous les compagnons)
W_RANK = {}
def rank(p):
    i = p['id']
    if '/w_' in i:
        scene = i.split('/w_', 1)[1].split('_', 1)[1]
        return (2, W_RANK.setdefault(scene, len(W_RANK)), i)
    return (-1 if '/bg_' in i else 0 if '/q' in i else 1, i.split('/')[1], i)
for p in prompts:
    if '/w_' in p['id']: rank(p)
todo.sort(key=rank)
print(f'{len(todo)} illustrations à faire, limite {a.limit}')

done = fails = 0
safe_retry = set()
queue = todo[:a.limit]
while queue:
    p = queue.pop(0)
    prompt = p['prompt']
    if p['id'] in safe_retry:  # faux positif du filtre : formulation plus simple
        prompt = "wholesome children's book illustration, " + prompt.replace(' show', '').replace('proud ', '')
    body = json.dumps({'prompt': prompt[:2048], 'steps': STEPS}).encode()
    req = urllib.request.Request(url, data=body, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.loads(r.read())
        b64 = (res.get('result') or {}).get('image')
        if not b64:
            raise RuntimeError(json.dumps(res)[:300])
        im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
        im.thumbnail((1280, 1280) if '/bg_' in p['id'] else (640, 640))
        out = os.path.join(HERE, p['id'] + '.webp')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, 'WEBP', quality=84 if '/bg_' in p['id'] else 80, method=6)
        done += 1; fails = 0
        print('ok', p['id'], os.path.getsize(out) // 1024, 'Ko', flush=True)
    except urllib.error.HTTPError as e:
        msg = e.read()[:300].decode('utf-8', 'replace')
        print('HTTP', e.code, p['id'], msg, flush=True)
        if e.code in (401, 403):
            sys.exit('Jeton refusé : vérifie le secret CF_API_TOKEN (permission Workers AI)')
        if 'NSFW' in msg:
            # le filtre de Cloudflare se trompe parfois sur un dessin d'enfant : on réessaie autrement juste après
            if p['id'] not in safe_retry: safe_retry.add(p['id']); queue.insert(0, p)
            time.sleep(2); continue
        fails += 1
        if e.code == 429 or 'neurons' in msg.lower() or 'daily' in msg.lower() or fails >= 3:
            print('Quota du jour atteint : on reprend demain.'); break
        time.sleep(5)
    except Exception as e:
        print('erreur', p['id'], e, flush=True)
        fails += 1
        if fails >= 3: break
        time.sleep(5)
print(f'{done} nouvelles illustrations')
