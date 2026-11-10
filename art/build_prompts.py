#!/usr/bin/env python3
"""Construit art/prompts.json : une illustration par carte (2 mondes × 200 cartes de booster + 144 cartes de quête).
Les cartes viennent de art/cards.json (extrait de l'appli). Chaque carte a des traits stables (même graine),
et chaque famille de cartes partage un même style pour que tout le jeu soit cohérent."""
import json, hashlib, os

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'cards.json')))

def seed(*parts):
    return int(hashlib.sha256('|'.join(map(str, parts)).encode()).hexdigest()[:8], 16)

def pick(lst, *parts):
    return lst[seed(*parts) % len(lst)]

NO_TEXT = 'no text, no letters, no numbers, no watermark, no border, no frame, no card layout'
PIXEL_STYLE = ('3D voxel art diorama made of tiny cubes, three-quarter view, soft global illumination, tilt-shift depth of field, '
               'vibrant saturated colors, cute and charming, highly detailed, trading card game illustration, ' + NO_TEXT)
PONY_STYLE = ('soft 3D render in the style of a modern animated movie, kawaii, pastel colors, glossy, adorable, gentle cinematic lighting, '
              'highly detailed, trading card game illustration, ' + NO_TEXT)

RARITY = {
    'c': 'simple calm pose',
    'pc': 'happy pose, a few sparkles',
    'r': 'dynamic pose, magical particles, rim light',
    'ur': 'epic heroic pose, glowing aura, dramatic lighting, holographic sparkles',
    'or': 'legendary golden version, golden ornaments and a small crown, radiant golden light rays, majestic and rare',
}

# ---------------- Monde des blocs ----------------
PX_EL = {
    'feu': ('fire creature with a flame tail and glowing ember fur, red and orange', 'volcanic landscape with flowing lava and embers'),
    'eau': ('water creature with fins, a bubble crest and shiny blue skin', 'lake shore with waterfalls and water lilies'),
    'plante': ('plant creature with leaves, vines and a flower bud on its head, green', 'lush forest clearing with mushrooms and flowers'),
    'foudre': ('electric creature with lightning-shaped ears, bright yellow, crackling sparks', 'stormy mountain top with lightning in the sky'),
    'roche': ('rock creature with stone armor plates and small crystals, brown and grey', 'glowing crystal cave'),
    'air': ('wind creature with fluffy cloud fur and feather wings, white and light cyan', 'floating sky islands above the clouds'),
    'ombre': ('shadow creature with glowing purple eyes, mysterious night spirit, dark violet', 'moonlit misty forest with fireflies'),
    'glace': ('ice creature with frosty crystal spikes, pale blue and white', 'snowy glacier with ice crystals'),
}
PX_BODY = ['round chubby', 'small fluffy', 'long-tailed', 'tiny dragon-like', 'bunny-eared', 'horned', 'little winged', 'turtle-shelled',
           'fox-like', 'owl-like', 'cat-like', 'lizard-like']
PX_EYES = ['big sparkly eyes', 'curious round eyes', 'cheerful smile', 'brave little face']
PX_VEH = {
    'car': 'cute little car', 'van': 'camper van', 'taxi': 'yellow taxi', 'bus': 'bus', 'jeep': 'off-road jeep', 'sport': 'sports convertible',
    'limo': 'long limousine', 'excavator': 'excavator', 'bulldozer': 'bulldozer', 'dump': 'dump truck', 'tractor': 'farm tractor',
    'mixer': 'cement mixer truck', 'roller': 'road roller', 'crane': 'construction crane', 'steam': 'steam locomotive', 'train': 'train',
    'tram': 'tramway', 'highspeed': 'high speed bullet train', 'boat': 'little fishing boat', 'sail': 'sailboat', 'speedboat': 'speedboat',
    'sub': 'submarine', 'liner': 'ocean liner', 'plane': 'propeller plane', 'heli': 'helicopter', 'balloon': 'hot air balloon',
    'blimp': 'airship blimp', 'jet': 'jet airplane', 'rocket': 'space rocket', 'ufo': 'flying saucer', 'satellite': 'satellite',
    'rover': 'space rover', 'kart': 'go-kart', 'moto': 'motorbike', 'racecar': 'formula race car', 'monster': 'monster truck',
    'ambulance': 'ambulance', 'police': 'police car', 'fire': 'fire truck with ladder', 'tow': 'tow truck', 'tank': 'tanker truck',
}
PX_VEH_SCENE = {
    'route': 'countryside road with trees', 'chantier': 'busy construction site', 'rail': 'railway crossing a stone bridge',
    'mer': 'sea harbor with waves', 'ciel': 'blue sky with fluffy clouds', 'espace': 'outer space with planets and stars',
    'course': 'race track with flags', 'secours': 'city street with flashing lights',
}
COLORS = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'yellow', 'pink', 'white', 'black']

# ---------------- Centre équestre ----------------
PO_EL = {
    'prairie': 'flower meadow with daisies and butterflies', 'plage': 'sunny beach with gentle waves and seashells',
    'neige': 'snowy winter landscape, wearing a cozy knitted scarf', 'foret': 'enchanted forest with mushrooms and sunbeams',
    'concours': 'show jumping arena with colorful poles, wearing a saddle and a prize rosette',
    'carrousel': 'carnival carousel with twinkling lights and ribbons', 'nuit': 'starry night sky with a crescent moon',
    'arcenciel': 'rainbow and fluffy pastel clouds',
}
PO_COAT = ['chestnut brown', 'white', 'cream', 'palomino golden', 'dapple grey', 'black', 'spotted pinto', 'pale pink', 'lavender', 'sky blue',
           'caramel', 'chocolate']
PO_MANE = ['pink mane', 'blond mane', 'rainbow mane', 'purple mane', 'white mane', 'blue mane', 'mint mane', 'peach mane']
PO_GEAR = {
    'bucket': 'wooden water bucket', 'hay': 'hay bale', 'wheelbarrow': 'wheelbarrow full of straw', 'fork': 'pitchfork', 'lantern': 'stable lantern',
    'brush': 'grooming brush', 'comb': 'mane comb', 'hoofpick': 'hoof pick', 'sponge': 'soapy sponge with bubbles', 'apple': 'shiny red apple',
    'carrot': 'carrots bundle', 'sugar': 'sugar cubes', 'cookie': 'horse cookies', 'candy': 'candy treats', 'cupcake': 'carrot cupcake',
    'saddle': 'leather saddle', 'halter': 'pastel halter', 'blanket': 'horse blanket', 'stirrup': 'stirrup', 'horseshoe': 'lucky horseshoe',
    'helmet': 'riding helmet', 'boot': 'riding boots', 'glove': 'riding gloves', 'rosette': 'prize rosette ribbon', 'medal': 'gold medal',
    'trophy': 'golden trophy cup', 'jump': 'show jumping obstacle', 'bow': 'satin ribbon bow', 'crown': 'jeweled tiara', 'heart': 'heart charm',
    'star': 'magic star', 'wand': 'magic wand', 'rainbow': 'rainbow charm',
}
PO_GEAR_SCENE = {
    'ecurie': 'cozy wooden stable', 'pansage': 'grooming area of a stable', 'friandises': 'kitchen table in a stable', 'sellerie': 'tack room',
    'cavalier': 'riding school', 'concours': 'show jumping arena', 'deco': 'pastel dressing room', 'magie': 'magical sparkling sky',
}

# ---------------- Quêtes ----------------
PLACES = {
    'Prairie du Départ': 'a sunny starting meadow', 'Ruisseau Clair': 'a clear stream', 'Forêt des Chênes': 'an old oak forest',
    'Colline aux Vents': 'a windy hill', 'Verger d\'Automne': 'an autumn orchard with apples', 'Grottes de Cristal': 'crystal caves',
    'Marais Brumeux': 'a misty swamp', 'Forge du Village': 'a village forge', 'Mine Profonde': 'a deep mine with rails and lanterns',
    'Tour des Orages': 'a tall tower in a thunderstorm', 'Lac Gelé': 'a frozen lake', 'Volcan Grondant': 'a rumbling volcano',
    'Village Enneigé': 'a snowy village', 'Forêt des Lumières': 'a forest decorated with festive lights', 'Nuit Étoilée': 'a starry night hill',
    'Pics Glacés': 'icy mountain peaks', 'Désert Doré': 'golden desert dunes', 'Oasis Cachée': 'a hidden oasis with palm trees',
    'Temple Perdu': 'a lost jungle temple', 'Jungle Épaisse': 'a thick jungle', 'Cascade Géante': 'a giant waterfall',
    'Îles Volantes': 'floating islands in the sky', 'Château des Brumes': 'a misty castle', 'Champ de Fleurs': 'a field of flowers',
    'Ruche Dorée': 'a golden beehive among flowers', 'Rivière aux Saumons': 'a river with jumping salmon', 'Canyon Rouge': 'a red canyon',
    'Plage aux Coquillages': 'a beach with seashells', 'Phare du Bout du Monde': 'a lighthouse at the end of the world',
    'Récif de Corail': 'a coral reef by the sea', 'Ruines Antiques': 'ancient ruins', 'Montagne Sacrée': 'a sacred mountain',
    'Cité des Nuages': 'a city in the clouds', 'Labyrinthe Végétal': 'a hedge maze', 'Fête des Lanternes': 'a lantern festival',
    'Palais de l\'Été': 'a summer palace',
    'Pré de la Rentrée': 'a green meadow on the first school day', 'Écurie des Lilas': 'a stable covered in lilacs',
    'Sentier des Mûres': 'a blackberry forest path', 'Manège du Village': 'a village riding ring', 'Verger aux Pommes': 'an apple orchard',
    'Bois des Écureuils': 'a woodland full of squirrels', 'Lac aux Cygnes': 'a lake with swans', 'Fête des Citrouilles': 'a pumpkin festival',
    'Colline Brumeuse': 'a misty hill', 'Concours d\'Automne': 'an autumn horse show', 'Forêt Dorée': 'a golden autumn forest',
    'Première Neige': 'the first snowfall', 'Chalet des Sapins': 'a chalet among fir trees', 'Marché de Noël': 'a Christmas market',
    'Nuit des Étoiles': 'a night full of stars', 'Montagne Blanche': 'a white snowy mountain', 'Château de Glace': 'an ice castle',
    'Carnaval des Rubans': 'a ribbon carnival', 'Arc-en-ciel d\'Hiver': 'a winter rainbow', 'Grand Concours': 'a grand horse show',
    'Pré des Jonquilles': 'a daffodil meadow', 'Ruisseau Chantant': 'a singing brook', 'Ferme aux Agneaux': 'a farm with little lambs',
    'Jardin des Papillons': 'a butterfly garden', 'Cerisiers en Fleurs': 'cherry blossom trees', 'Plage de Printemps': 'a spring beach',
    'Phare Rose': 'a pink lighthouse', 'Île aux Mouettes': 'an island with seagulls', 'Prairie Arc-en-ciel': 'a rainbow meadow',
    'Cascade Fleurie': 'a flowery waterfall', 'Château des Licornes': 'a unicorn castle', 'Grand Prix d\'Été': 'a summer grand prix horse race',
    'Nuit d\'Été': 'a summer night with fireflies', 'Fête Foraine': 'a funfair', 'Vacances à la Mer': 'a seaside holiday',
}
SEASONS = ['late summer', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'summer', 'summer']
TIMES = ['at sunrise with soft pink light', 'in bright daylight', 'at sunset with an orange and purple sky', 'at night under a starry sky with a magical golden glow']
STAGE_PX = ['a small baby', 'a young adventurous', 'a bigger confident', 'a majestic legendary golden']
STAGE_PO = ['a tiny foal', 'a young', 'a proud show', 'a majestic legendary golden']

def month_of(week):
    return min(9, int((week - 1) / 3.75))

out = []
for theme, data in D.items():
    px = theme == 'pixel'
    style = PIXEL_STYLE if px else PONY_STYLE
    for c in data['cards']:
        rar = RARITY[c['rar']]
        if c['set'] == 1 and px:
            look, scene = PX_EL[c['el']]
            subj = f"a {pick(PX_BODY, theme, c['name'], 'b')} {look}, {pick(PX_EYES, theme, c['name'], 'e')}"
            prompt = f"{subj}, standing in a {scene}, {rar}, {style}"
        elif c['set'] == 2 and px:
            veh = PX_VEH.get(c['k'], 'vehicle')
            prompt = f"a cute {pick(COLORS, theme, c['name'])} {veh} with a friendly face on the front, on a {PX_VEH_SCENE[c['el']]}, {rar}, {style}"
        elif c['set'] == 1:
            pony = f"a {pick(PO_COAT, theme, c['name'], 'c')} pony with a {pick(PO_MANE, theme, c['name'], 'm')}"
            extra = ' with a small unicorn horn and tiny wings' if c['rar'] == 'ur' else ''
            prompt = f"{pony}{extra}, in a {PO_EL[c['el']]}, {rar}, {style}"
        else:
            obj = PO_GEAR.get(c['k'], 'horse riding accessory')
            prompt = (f"a cute kawaii {obj} collectible item with a tiny happy pony beside it, in a {PO_GEAR_SCENE.get(c['el'], 'stable')}, {rar}, {style}")
        out.append({'id': f"{theme}/c{c['num']}", 'seed': seed(theme, 'card', c['num']) % 2147483647, 'prompt': prompt})
    for q in data['quests']:
        season = SEASONS[month_of(q['ch'])]
        place = PLACES.get(q['place'], q['place'])
        time = TIMES[q['step']]
        if px:
            look, _ = PX_EL.get(q['el'], ('creature', ''))
            hero = f"{STAGE_PX[q['step']]} {pick(PX_BODY, theme, q['hero'], 'b')} {look}"
        else:
            hero = f"{STAGE_PO[q['step']]} {pick(PO_COAT, theme, q['hero'], 'c')} pony with a {pick(PO_MANE, theme, q['hero'], 'm')}"
        glow = ', wearing a small golden crown, radiant golden aura, sparkles everywhere' if q['step'] == 3 else ''
        prompt = (f"full art trading card illustration, vertical composition, {hero}{glow}, in the lower center, "
                  f"in {place} in {season} {time}, the landscape fills the whole picture, {style}")
        # même graine pour les 4 étapes d'une quête : le héros garde la même allure
        out.append({'id': f"{theme}/q{q['n']:03d}", 'seed': seed(theme, 'quest', q['ch']) % 2147483647, 'prompt': prompt})

# décors derrière le compagnon (écran d'accueil) : paysage vide, sol au premier plan, centre dégagé
EMPTY = 'wide empty landscape, no characters, no animals, no creatures, no horses, no people, nothing in the center foreground, eye-level camera, '
BG = {
    'pixel': ('3D voxel art landscape made of tiny cubes, soft global illumination, tilt-shift depth of field, vibrant colors, cute, highly detailed, '
              'a flat open grassy clearing in the lower center foreground, blocky oak and birch trees with flowers on the left and right sides, '
              'distant cubic hills and a small river, ' + NO_TEXT),
    'poney': ('soft 3D render in the style of a modern animated movie, kawaii, pastel colors, gentle cinematic lighting, highly detailed, '
              'an empty riding school paddock, soft sandy ground in the lower center foreground, white wooden fences on the sides, '
              'a cute red wooden stable with flower boxes in the background, rolling green hills, ' + NO_TEXT),
}
BG_TIME = {
    'bg_day': 'bright sunny day, blue sky with fluffy clouds, warm morning sunlight',
    'bg_eve': 'golden sunset, orange and pink sky, long soft shadows, warm evening light',
    'bg_night': 'calm night, deep blue starry sky, big glowing moon, fireflies, soft blue moonlight, small warm lanterns',
}
for theme in ('pixel', 'poney'):
    for k, t in BG_TIME.items():
        out.append({'id': f"{theme}/{k}", 'seed': seed(theme, k) % 2147483647, 'prompt': EMPTY + t + ', ' + BG[theme]})

# widget d'écran d'accueil façon Duolingo : le compagnon de l'enfant dans une scène selon l'heure, son état ou la saison
# (le haut de l'image reste dégagé : l'appli y écrit la série de jours et une petite phrase)
W_SPECIES = {
    'pixel': {
        'chat': 'a cute chubby orange tabby kitten with big green eyes, a cream chest and white paws',
        'renard': 'a cute chubby little orange fox with big eyes, white cheeks and chest, dark paws and a big fluffy white-tipped tail',
        'lapin': 'a cute white bunny with long pink-lined ears and big eyes',
        'slime': 'a cute bouncy green jelly slime blob with big shiny eyes and a happy face',
        'dragon': 'a cute chubby baby purple dragon with big eyes, small cream horns, a yellow belly and little lilac bat wings',
        'mouton': 'a cute chubby little lamb with fluffy white cloud-like wool, a soft cream face and dark brown legs',
    },
    'poney': {
        'poney': 'a chubby chibi pony with a caramel coat, a fluffy pink mane, a white star on the forehead and white socks',
        'licorne': 'a chubby chibi white unicorn with a golden horn and a fluffy rainbow mane',
        'pegase': 'a chubby chibi pale lavender pegasus with small white feathered wings and a fluffy sky blue mane',
        'poulain': 'a chubby chibi foal with a chestnut brown coat, a fluffy dark brown mane, a white blaze and white socks',
        'nuit': 'a chubby chibi dark plum grey pony with a black mane with purple highlights and a white star on the forehead',
        'tachete': 'a chubby chibi cream pony with brown pinto spots and a fluffy white mane',
    },
}
# ordre = priorité de génération (les scènes les plus fréquentes d'abord, pour chaque compagnon)
W_SCENES = [
    ('homework', 'sitting at a small desk with open notebooks and colored pencils, eager excited smile, cozy room, soft teal background'),
    ('done', 'jumping with joy, colorful confetti and stars everywhere, happy celebration, bright cheerful background'),
    ('sleep', 'sleeping peacefully curled up in a cozy little bed with a blanket, moonlight through a window, deep blue night background'),
    ('reminder', 'holding a pencil and a notebook, looking up with big pleading puppy eyes, soft purple background'),
    ('hungry', 'looking sadly at an empty food bowl, tummy rumbling, thought bubble with a red apple, warm yellow background'),
    ('morning', 'stretching and yawning happily, waking up in a cozy bedroom at sunrise, soft pink and golden morning light'),
    ('last_chance', 'worried and nervous, looking at a big alarm clock, a drop of sweat, orange and red sunset sky'),
    ('bored', 'sitting with its chin resting on a ball, sighing, bored half-closed eyes, pastel lilac background'),
    ('dirty', 'covered in mud splashes with little cartoon flies buzzing around, embarrassed, standing in a puddle, muddy green background'),
    ('weekend', 'playing joyfully with a ball in a sunny green meadow with flowers, bright blue sky'),
    ('school', 'looking out of a window with its chin on its paws, waiting patiently, a yellow school bus far away, soft blue daylight'),
    ('proud', 'proudly wearing a shiny gold medal next to a big golden trophy, sparkles, warm golden light'),
    ('streak_lost', 'crying big tears sitting alone under a small grey rain cloud, sad, blue grey background'),
    ('starving', 'lying flat on the floor exhausted from hunger next to an empty plate, dramatic, red orange background'),
    ('very_bored', 'lying upside down on a sofa, completely bored, dramatic, magenta pink background'),
    ('sleep_deep', 'deeply asleep and snoring with a little night cap, under a starry night sky with a big moon, dark navy background'),
    ('christmas', 'wearing a red Santa hat next to a decorated Christmas tree and wrapped presents, snow, warm festive lights'),
    ('halloween', 'wearing a cute little ghost costume next to glowing carved pumpkins, purple and orange evening, cute not scary'),
    ('snow', 'playing in the snow next to a little snowman, wearing a cozy scarf, snowflakes falling, white and light blue winter'),
    ('beach', 'on a sunny beach with sunglasses next to a sand castle, blue sea, summer holidays'),
    ('flowers', 'smelling flowers in a blooming spring garden with butterflies and cherry blossoms, pastel green'),
    ('autumn', 'jumping in a pile of colorful autumn leaves, orange and red trees, golden light'),
]
W_COMPO = 'square composition, the character is centered in the lower two thirds, simple soft background, empty uncluttered space in the top third, '
for theme, specs in W_SPECIES.items():
    style = (PIXEL_STYLE if theme == 'pixel' else PONY_STYLE).replace('trading card game illustration', 'mobile app widget illustration')
    for sp, look in specs.items():
        for scene, txt in W_SCENES:
            out.append({'id': f"{theme}/w_{sp}_{scene}", 'seed': seed(theme, 'widget', sp) % 2147483647,
                        'prompt': f"{W_COMPO}{look}, {txt}, {style}"})

json.dump(out, open(os.path.join(HERE, 'prompts.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), 'prompts')
