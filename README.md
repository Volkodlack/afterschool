# After School

Application Android (tablette) pour les devoirs : listes de mots de la semaine avec mini-jeux d'orthographe, révision aléatoire, et fluence de lecture (photo de la fiche, aide à la lecture, chrono et enregistrement de la voix).

## Installer
Chaque push sur `main` compile l'APK via GitHub Actions et la publie dans les **Releases** du dépôt. Télécharger `AfterSchool-x.y.z.apk` sur la tablette et l'installer (autoriser les sources inconnues).

## Structure
- `app/src/main/java/.../MainActivity.java` — WebView + synthèse vocale Android + appareil photo + lecture du texte (ML Kit, hors ligne) + micro.
- `app/src/main/assets/` — l'application (HTML/CSS/JS) : `games.js` (mini-jeux), `fluence.js` (lecture), `parent.js` (espace parent), `world.js` (Mon Monde).
