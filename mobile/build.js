/* Agora Studio (application mobile) : node mobile/build.js
   Dérivée de l'application Agora du dépôt (dossier ../src) SANS les leçons : on garde le Studio,
   les objections, la recherche express, les orateurs, préparer, preuves (sans leçons ni ruses).
   Les sources sont dans mobile/src (copie des sources de l'application Agora, sans les leçons) ; ce script les lit et applique des retouches en mémoire.
   Stockage isolé (préfixe am_), cache isolé (amob-), base isolée : aucun mélange avec l'application à la racine. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SRC = path.join(__dirname, 'src');
const R = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const RL = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const W = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
const must = (s, a, b) => { if (!s.includes(a)) throw new Error('retouche introuvable : ' + a.slice(0, 60)); return s.split(a).join(b); };

const parts = ['analysis.js', 'data-orators.js', 'data-eristic.js', 'data-exercises.js', 'data-quiz.js', 'data-themes.js', 'data-objections.js', 'app.js'];
const shim = "window.AO_DATA = window.AO_DATA || {}; window.AO_DATA.lessons = []; window.AO_DATA.modules = [];";
let js = [R(parts[0]), shim].concat(parts.slice(1).map(R)).join('\n;\n');
js = js.replace('/*@@LEVELS@@*/', () => R('levels.js')).replace('/*@@PREP@@*/', () => R('prep.js')).replace('/*@@ERIST@@*/', () => R('erist.js'))
  .replace('/*@@EXPRESS@@*/', () => R('express.js')).replace('/*@@OBJ@@*/', () => R('objections.js')).replace('/*@@PWA@@*/', () => R('pwa.js') + '\n' + RL('sync.js'));
if (/\/\*@@/.test(js)) throw new Error('marqueur non remplacé');

/* --- retouches « sans leçons » --- */
/* plus d'onglet Cours/Ruses : l'appli sert uniquement à s'entraîner */
js = js.replace(/  \['course', 'Cours', '[^\n]*\n/, '');
js = js.replace(/,\n  \{ id: 'eri', t: 'Éristicien'[^\n]*/, '');
if (/'Ruses'|'Cours', '</.test(js)) throw new Error('onglet cours encore présent');
js = must(js, "go: ['course', 'c5']", "go: ['studio']");
js = must(js, "function vCourse() {", "function vCourse() { if (view.sub === 'erist-quiz') return vEristQuiz(); return vErist(); }\nfunction vCourseDesactive() {");
/* la carte « Cours x / y » de l'accueil n'a plus de sens */
js = js.replace(/  h \+= '<div class="card"><div class="row" style="justify-content:space-between"><h3>Cours<\/h3>[^\n]*\n/, '');
js = js.split('<button class="btn small ghost" data-act="course-back">← Cours</button>').join('');
/* stockage isolé de l'application à la racine (même domaine) */
js = js.replace(/(['"])ao_/g, '$1am_').replace(/'agora_db'/g, "'agora_m_db'");
if (/['"]ao_/.test(js)) throw new Error('clé de stockage non isolée');

/* --- compte Agora : liaison du téléphone et synchronisation de l'avancement (mobile/sync.js) --- */
js = must(js, "settings: vSettings }[view.tab]", "settings: vSettings, sync: vSync }[view.tab]");
js = must(js, "S.sessions.unshift(rec); S.sessions = S.sessions.slice(0, 200);", "S.sessions.unshift(rec); S.sessions = S.sessions.slice(0, 200); syQueue(rec);");
js = must(js, "<h1>Bonjour, Stephen</h1>", "<h1>Bonjour' + syHello() + '</h1>");
js = must(js, "  h += exResultHtml(s);\n", "  h += exResultHtml(s);\n  h += syResultHtml(s);\n");
js = must(js, "function homeBanners() {\n  var h = '';", "function homeBanners() {\n  var h = syBanner() + atlCard();");
js = must(js, "function pwaAct(act, v, el, ev) {\n", "function pwaAct(act, v, el, ev) {\n  if (syAct(act, v, el)) return true;\n");
js = must(js, "function pwaBoot() {\n  applyTheme(themePref());", "function pwaBoot() {\n  applyTheme(themePref());\n  syBoot();");
js = must(js, "  h += '<div class=\"card stack\"><h3>Apparence</h3>", "  h += sySettingsHtml();\n  h += '<div class=\"card stack\"><h3>Apparence</h3>");
js = must(js, "Tout est gardé sur ton appareil, rien n’est envoyé sur internet. Dernière sauvegarde", "Tout est gardé sur ton appareil. ' + syPriv() + ' Dernière sauvegarde");
js = must(js, "Usage personnel : pas de compte, pas de paiement, aucune clé, aucun suivi.", "Pas de paiement, aucune clé, aucune publicité. Un compte Agora ne sert qu’à synchroniser ton avancement avec la plateforme.");
js = must(js, "Sans texte, seule la voix est analysée.", "Astuce : le micro du clavier permet de dicter. Sans texte, seule la voix est analysée.");

let css = R('styles.css') + '\n' + R('pwa.css') + '\n' + RL('sync.css');
const mark = R('../icons/mark.svg').trim();
const assets = fs.readdirSync(path.join(__dirname, 'fonts')).filter(f => f.endsWith('.woff2')).map(f => 'fonts/' + f)
  .concat(['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/mark.svg']);
const theme = R('theme-boot.js').replace(/(['"])ao_/g, '$1am_');
let html = R('index.template.html');
html = must(html, '<title>Agora · L’art oratoire</title>', '<title>Agora Studio · by Stephen</title>');
html = must(html, 'content="Agora, l’art oratoire, by Stephen. Ton coach de prise de parole."', 'content="Agora Studio, by Stephen. S’entraîner à parler, vite et partout."');
html = must(html, 'name="apple-mobile-web-app-title" content="Agora"', 'name="apple-mobile-web-app-title" content="Agora Studio"');
html = must(html, "connect-src 'self' data: blob:", "connect-src 'self' data: blob: https://script.google.com https://script.googleusercontent.com");
html = html.replace(/(['"])ao_/g, '$1am_');
let man = JSON.parse(R('manifest.template.json'));
man.name = 'Agora Studio · by Stephen'; man.short_name = 'Agora Studio'; man.description = 'S’entraîner à parler, vite et partout. Agora, by Stephen.'; man.id = './mobile/'; 
man.id = './';
let sw = R('sw.template.js');
sw = must(sw, "const CACHE = 'agora-@@HASH@@'", "const CACHE = 'amob-@@HASH@@'");
sw = must(sw, "k.startsWith('agora-')", "k.startsWith('amob-')");
sw = must(sw, '/* Agora — service worker', '/* Agora Studio — service worker');
const h = crypto.createHash('sha256');
[js, css, theme, html, JSON.stringify(man)].forEach(s => h.update(s));
assets.forEach(a => h.update(fs.readFileSync(path.join(__dirname, a))));
const hash = h.digest('hex').slice(0, 10);
W('app.js', "window.AGORA_BUILD='" + hash + "';\n" + js);
W('style.css', css);
W('theme-boot.js', theme);
W('index.html', html.replace('@@MARK@@', mark).replace(/@@HASH@@/g, hash));
W('manifest.webmanifest', JSON.stringify(man, null, 2));
const files = ['./', 'index.html', 'app.js', 'style.css', 'theme-boot.js', 'manifest.webmanifest'].concat(assets);
W('sw.js', sw.replace('@@HASH@@', hash).replace('@@FILES@@', JSON.stringify(files, null, 1)));
console.log('mobile build', hash, 'app.js', Math.round(fs.statSync(path.join(__dirname, 'app.js')).size / 1024) + ' Ko');
