"""Exporte les compagnons faits main (pony.js, critters.js) en app/src/main/assets/models/pets/*.glb :
poney.glb, renard1-3.glb, lapin1-3.glb, mouton1-3.glb.
Usage : python3 export.py <dossier contenant node_modules/three> [noms…]   (npm i three@0.170.0)"""
import base64, functools, http.server, os, shutil, sys, tempfile, threading
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'app', 'src', 'main', 'assets', 'models', 'pets')
ONLY = sys.argv[2:]
nm = os.path.join(os.path.abspath(sys.argv[1]), 'node_modules')
tmp = tempfile.mkdtemp()
os.symlink(nm, os.path.join(tmp, 'node_modules'))
shutil.copy(os.path.join(HERE, 'pony.js'), tmp)
shutil.copy(os.path.join(HERE, 'critters.js'), tmp)
open(os.path.join(tmp, 'index.html'), 'w').write('''<!doctype html><script type="importmap">{"imports":{"three":"./node_modules/three/build/three.module.js","three/addons/":"./node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildPony } from './pony.js';
import { CRITTERS } from './critters.js';
const U = { mergeGeometries };
const jobs = [['poney', () => buildPony(THREE, U)]];
for (const [k, f] of Object.entries(CRITTERS)) for (const st of [1, 2, 3]) jobs.push([k + st, () => f(THREE, U, st)]);
const only = ONLY_LIST;
window.out = {};
for (const [name, make] of jobs) {
  if (only.length && !only.includes(name)) continue;
  const { scene, clips } = make();
  const buf = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
  const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  window.out[name] = btoa(s);
}
window.ok = true;
</script>'''.replace('ONLY_LIST', __import__('json').dumps(ONLY)))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=tmp))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=shutil.which('google-chrome') or None)
    pg = b.new_page(); pg.on('console', lambda m: print(m.text)); pg.on('pageerror', lambda e: print('ERR', e)); pg.add_init_script('window.onerror=(m)=>{window.err=String(m)}')
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html')
    pg.wait_for_function('window.ok || window.err', timeout=120000)
    if pg.evaluate('window.err'): sys.exit(pg.evaluate('window.err'))
    out = pg.evaluate('window.out'); b.close()
for name, data in out.items():
    data = base64.b64decode(data)
    open(os.path.join(OUT, name + '.glb'), 'wb').write(data); print(name + '.glb', len(data) // 1024, 'Ko')
