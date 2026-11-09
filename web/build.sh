#!/usr/bin/env bash
# Construit la version web (iPad / iPhone / navigateur) dans web/_site à partir des fichiers de l'appli Android.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf _site
cp -r ../app/src/main/assets _site
rm -rf _site/tts _site/asr
T=_site/vendor/tesseract
mkdir -p $T/core $T/lang
cp node_modules/tesseract.js/dist/tesseract.min.js node_modules/tesseract.js/dist/worker.min.js $T/
cp node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js $T/core/
cp node_modules/tesseract.js-core/tesseract-core-lstm.wasm node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm $T/core/ 2>/dev/null || true
cp node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz $T/lang/
# service worker : version = commit, et liste des fichiers de l'appli à garder hors connexion (sauf Tesseract, chargé à la demande)
VER=${GITHUB_SHA:-$(date +%s)}
LIST=$(cd _site && find . -type f ! -path './vendor/tesseract/*' ! -name sw.js | sed 's#^\./##' | sort | awk '{printf "%s\"%s\"", (NR>1?",":""), $0}')
sed -i "s#const VERSION = 'dev';#const VERSION = '${VER:0:12}';#; s#const PRECACHE = \[\];#const PRECACHE = [${LIST}];#" _site/sw.js
# illustrations des cartes (générées par .github/workflows/card-art.yml) : servies par le site, pas dans l'APK
mkdir -p _site/art
for t in pixel poney; do [ -d ../art/$t ] && cp -r ../art/$t _site/art/ || true; done
python3 - <<'PY'
import json, os, time
idx = {'v': int(time.time())}
for t in ('pixel', 'poney'):
    d = os.path.join('_site/art', t)
    idx[t] = sorted(f[:-5] for f in os.listdir(d) if f.endswith('.webp')) if os.path.isdir(d) else []
json.dump(idx, open('_site/art/index.json', 'w'))
print('illustrations :', {t: len(idx[t]) for t in ('pixel', 'poney')})
PY
# mise à jour automatique de l'appli Android : contenu de l'appli zippé + version
mkdir -p _site/ota
( cd ../app/src/main/assets && rm -f ../../../../web/_site/ota/bundle.zip && zip -qr -X ../../../../web/_site/ota/bundle.zip . -x 'tts/*' 'asr/*' )
BUILD=$(git -C .. log -1 --format=%ct 2>/dev/null || date +%s)
API=$(grep -o 'AS_REQUIRED_NATIVE_API = [0-9]*' ../app/src/main/assets/js/update.js | grep -o '[0-9]*$')
SHA=$(sha256sum _site/ota/bundle.zip | cut -d' ' -f1)
printf '{"build": %s, "nativeApi": %s, "zip": "ota/bundle.zip", "sha256": "%s", "size": %s}\n' "$BUILD" "$API" "$SHA" "$(stat -c %s _site/ota/bundle.zip)" > _site/ota/version.json
cat _site/ota/version.json
touch _site/.nojekyll
du -sh _site
