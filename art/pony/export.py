"""Exporte le poney fait main (pony.js) en app/src/main/assets/models/pets/poney.glb.
Usage : python3 export.py <dossier contenant node_modules/three>   (npm i three@0.170.0)"""
import base64, functools, http.server, os, shutil, sys, tempfile, threading
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'app', 'src', 'main', 'assets', 'models', 'pets', 'poney.glb')
nm = os.path.join(os.path.abspath(sys.argv[1]), 'node_modules')
tmp = tempfile.mkdtemp()
os.symlink(nm, os.path.join(tmp, 'node_modules'))
shutil.copy(os.path.join(HERE, 'pony.js'), tmp)
open(os.path.join(tmp, 'index.html'), 'w').write('''<!doctype html><script type="importmap">{"imports":{"three":"./node_modules/three/build/three.module.js","three/addons/":"./node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildPony } from './pony.js';
const { scene, clips } = buildPony(THREE, { mergeGeometries });
new GLTFExporter().parse(scene, buf => {
  const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  window.out = btoa(s);
}, e => { window.err = String(e); }, { binary: true, animations: clips });
</script>''')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=tmp))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=shutil.which('google-chrome') or None)
    pg = b.new_page(); pg.on('console', lambda m: print(m.text)); pg.on('pageerror', lambda e: print('ERR', e))
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html')
    pg.wait_for_function('window.out || window.err', timeout=60000)
    if pg.evaluate('window.err'): sys.exit(pg.evaluate('window.err'))
    data = base64.b64decode(pg.evaluate('window.out')); b.close()
open(OUT, 'wb').write(data); print('poney.glb', len(data) // 1024, 'Ko')
