/* Agora Plateforme · serveur des comptes (Google Apps Script) — by Stephen
   À coller dans Extensions > Apps Script du Google Sheet de la plateforme.
   Il gère : les comptes (ordinateur), la liaison du téléphone, et les séances
   (transcriptions comprises) envoyées par l'application mobile. */

var APP_URL = 'https://andersonsoahita-hash.github.io/Agora-Plateforme/plateforme/'; // adresse de la plateforme
var FEUILLES = {
  comptes: ['Date', 'Nom', 'Prénoms', 'Email', 'Téléphone', 'Âge', 'Rôle', 'Pays', 'Situation', 'Projet', 'Statut', 'Code d’activation', 'Expire le', 'Dernière connexion', 'Ordinateur', 'Téléphone (appli)', 'Mot de passe (empreinte)', 'Session', 'Session appli'],
  journal: ['Date', 'Action'],
  admins: ['Date', 'Nom', 'Email', 'Droits', 'Clé (empreinte)', 'Statut', 'Dernière activité', 'Créé par'],
  compta: ['Mis à jour', 'Id', 'Type', 'Date', 'Libellé', 'Email', 'Niveau', 'Montant (Ar)', 'Payé le', 'Mode', 'Catégorie', 'Par'],
  progres: ['Mis à jour', 'Email', 'Leçon', 'Niveau', 'Date', 'Score', 'Sur', 'Appareil'],
  seances: ['Reçu le', 'Email', 'Id', 'Date', 'Sujet', 'Type', 'Durée (s)', 'Mots', 'Mots/min', 'Tics', 'Logos', 'Ethos', 'Pathos', 'Source', 'Transcription', 'Détail (JSON)']
};
var CLEF = { 'Comptes': 'comptes', 'Journal': 'journal', 'Séances': 'seances', 'Admins': 'admins', 'Progrès': 'progres', 'Compta': 'compta' };
var NPRO = 8, MAXPRO = 60, NCPT = 12;
var C = { date: 0, nom: 1, pre: 2, mail: 3, tel: 4, age: 5, role: 6, pays: 7, sit: 8, proj: 9, st: 10, code: 11, exp: 12, last: 13, pc: 14, mob: 15, pw: 16, tok: 17, mtok: 18 };
var NCOL = 19;
var Q = { rec: 0, mail: 1, id: 2, date: 3, sujet: 4, type: 5, dur: 6, mots: 7, wpm: 8, tics: 9, lo: 10, et: 11, pa: 12, src: 13, txt: 14, det: 15 };
var NSEA = 16;
var AD = { date: 0, nom: 1, mail: 2, dr: 3, cle: 4, st: 5, last: 6, par: 7 }, NADM = 8;
/* ce qu'un administrateur peut avoir le droit de faire (le propriétaire a tout) */
var DROITS = { voir: 'Voir les comptes et le journal', valider: 'Valider, renvoyer un code, débloquer, fixer la fin d’accès', bloquer: 'Bloquer un compte', appareils: 'Libérer l’ordinateur ou le téléphone', seances: 'Voir les séances et les transcriptions', supprimer: 'Supprimer un compte et l’effacer définitivement' , finances: 'Paiements, dépenses, trésorerie et bilan'};
var OPDROIT = { /* progrès : voir 'voir', effacer 'supprimer' */ valider: 'valider', debloquer: 'valider', expire: 'valider', bloquer: 'bloquer', appareil: 'appareils', mobile: 'appareils', supprimer: 'supprimer', effacer: 'supprimer' };
var CONSOLE_URL = 'https://andersonsoahita-hash.github.io/Agora-Plateforme/admin/';
var EMAIL_ADMIN = 'stephenandersonsoahita@gmail.com'; // l'adresse qui reçoit la clé admin
var DUREE_CODE = 600; // le code de liaison du téléphone vaut 10 minutes

function feuille_(nom) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(nom), cle = CLEF[nom];
  if (!sh) { sh = ss.insertSheet(nom); sh.appendRow(FEUILLES[cle]); sh.setFrozenRows(1); if (nom === 'Séances') sh.getRange(1, 4, sh.getMaxRows(), 1).setNumberFormat('@'); }
  var nc = nom === 'Comptes' ? NCOL : (nom === 'Séances' ? NSEA : (nom === 'Admins' ? NADM : (nom === 'Progrès' ? NPRO : (nom === 'Compta' ? NCPT : 0))));
  if (nc) {
    if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
    sh.getRange(1, 1, 1, nc).setValues([FEUILLES[cle]]);
  }
  return sh;
}
function installer() { // à lancer une fois (et après chaque mise à jour du code)
  ['Comptes', 'Journal', 'Séances', 'Admins', 'Progrès', 'Compta'].forEach(feuille_);
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feuille 1'); if (s && s.getLastRow() === 0) s.setName('Notes');
  var nouvelle = !PropertiesService.getScriptProperties().getProperty('CLE_ADMIN');
  if (nouvelle) PropertiesService.getScriptProperties().setProperty('CLE_ADMIN', Utilities.getUuid());
  if (nouvelle) envoyerCle(); // la clé arrive directement dans ta boîte mail
}
function envoyerCle() { // t'envoie ta clé admin par e-mail
  var cle = PropertiesService.getScriptProperties().getProperty('CLE_ADMIN');
  if (!cle) { installer(); return; }
  MailApp.sendEmail({ to: EMAIL_ADMIN, subject: 'Ta clé administrateur Agora',
    body: 'Bonjour Stephen,\n\nVoici ta clé administrateur Agora :\n\n      ' + cle + '\n\n1. Ouvre la console : https://andersonsoahita-hash.github.io/Agora-Plateforme/admin/\n2. Colle cette clé quand elle te la demande. Elle reste ensuite dans ce navigateur.\n\nNe la partage avec personne : elle permet de valider, bloquer et effacer des comptes.\nPour la changer : dans le Sheet, menu Agora > Choisir ma clé admin.' });
  try { SpreadsheetApp.getActive().toast('Clé envoyée à ' + EMAIL_ADMIN); } catch (e) {}
}
function choisirCle() { // tu choisis ta propre clé (8 caractères minimum)
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Choisis ta clé admin', 'Au moins 8 caractères. Elle sera aussi envoyée à ' + EMAIL_ADMIN + '.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var cle = String(r.getResponseText() || '').trim();
  if (cle.length < 8) { ui.alert('Il faut au moins 8 caractères.'); return; }
  PropertiesService.getScriptProperties().setProperty('CLE_ADMIN', cle); envoyerCle();
}
function journal_(a) { feuille_('Journal').appendRow([new Date(), a]); }
function alea_(n, alphabet) { var s = ''; for (var i = 0; i < n; i++) s += alphabet.charAt(Math.floor(Math.random() * alphabet.length)); return s; }
function code_() { return alea_(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); }
function jeton_() { return Utilities.getUuid().replace(/-/g, ''); }
function hash_(mdp, email) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email + '|' + mdp + '|agora-plateforme')
    .map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}

/* ---------- menu dans le Sheet ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Agora')
    .addItem('Valider / renvoyer un code (ligne sélectionnée)', 'valider')
    .addItem('Bloquer la ligne sélectionnée', 'bloquer')
    .addItem('Débloquer la ligne sélectionnée', 'debloquer')
    .addItem('Supprimer le compte de la ligne sélectionnée', 'supprimer')
    .addSeparator().addItem('M’envoyer ma clé admin par e-mail', 'envoyerCle').addItem('Choisir ma clé admin', 'choisirCle').addItem('Afficher ma clé admin', 'montrerCle').addToUi();
}
function emailLigne_() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== 'Comptes') throw new Error('Va dans l’onglet Comptes et sélectionne une ligne.');
  var r = sh.getActiveRange().getRow(); if (r < 2) throw new Error('Sélectionne une ligne de compte.');
  return String(sh.getRange(r, C.mail + 1).getValue());
}
function valider() { var r = agir_('valider', emailLigne_()); SpreadsheetApp.getActive().toast(r.ok ? 'Code envoyé par e-mail' : r.erreur); }
function bloquer() { agir_('bloquer', emailLigne_()); }
function debloquer() { agir_('debloquer', emailLigne_()); }
function supprimer() { agir_('supprimer', emailLigne_()); }
function montrerCle() { SpreadsheetApp.getUi().alert('Clé admin (pour la console de gestion) :\n' + PropertiesService.getScriptProperties().getProperty('CLE_ADMIN')); }

/* ---------- outils ---------- */
function rep_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function trouver_(champ, valeur) {
  var sh = feuille_('Comptes'), n = sh.getLastRow(); if (n < 2 || !valeur) return null;
  var d = sh.getRange(2, 1, n - 1, NCOL).getValues();
  for (var i = 0; i < d.length; i++) if (String(d[i][champ]).toLowerCase() === String(valeur).toLowerCase()) return { sh: sh, r: i + 2, v: d[i] };
  return null;
}
function etat_(v) {
  var st = String(v[C.st]);
  if (st === 'validé' && v[C.exp] && new Date(v[C.exp]) < new Date(new Date().toDateString())) return 'expiré';
  return st;
}
function set_(t, col, val) { t.sh.getRange(t.r, col + 1).setValue(val); }
function cut_(x, n) { return String(x == null ? '' : x).slice(0, n); }
function num_(x) { var n = Number(x); return x === null || x === '' || x === undefined || isNaN(n) ? '' : Math.round(n * 100) / 100; }
function jour_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).slice(0, 10);
}

/* Vérifie qu'une session est bonne. canal 'p' = plateforme (ordinateur), 'm' = application mobile. */
function auth_(b, canal) {
  var em = String(b.email || '').trim().toLowerCase(), u = trouver_(C.mail, em);
  if (!u) return { etat: 'inconnu' };
  var et = etat_(u.v); if (et !== 'validé') return { etat: et, u: null };
  var tc = canal === 'm' ? C.mtok : C.tok, dc = canal === 'm' ? C.mob : C.pc;
  if (!u.v[tc] || u.v[tc] !== b.jeton || (u.v[dc] && u.v[dc] !== b.appareil)) return { etat: 'session' };
  return { etat: 'validé', u: u, em: em };
}

/* ---------- séances (voix transcrite) ---------- */
function ecrireSeances_(email, liste, source) {
  var sh = feuille_('Séances'), n = sh.getLastRow(), existe = {}, nb = 0;
  if (n > 1) {
    var d = sh.getRange(2, 1, n - 1, 3).getValues();
    for (var i = 0; i < d.length; i++) if (String(d[i][Q.mail]).toLowerCase() === email) existe[String(d[i][Q.id])] = i + 2;
  }
  (liste || []).slice(0, 20).forEach(function (s) {
    if (!s) return;
    var id = cut_(s.id, 40).replace(/[^\w.-]/g, ''); if (!id) return;
    var det = {}; try { det = s.detail && typeof s.detail === 'object' ? s.detail : {}; } catch (e) {}
    det.type = cut_(s.type, 40);
    var ligne = [new Date(), email, id, cut_(s.date, 10), cut_(s.sujet, 300), cut_(s.typeNom || s.type, 80), num_(s.dur), num_(s.mots), num_(s.wpm), num_(s.tics), num_(s.logos), num_(s.ethos), num_(s.pathos), cut_(source, 20), cut_(s.transcript, 30000), cut_(JSON.stringify(det), 3000)];
    if (existe[id]) sh.getRange(existe[id], 1, 1, NSEA).setValues([ligne]); else { sh.appendRow(ligne); existe[id] = sh.getLastRow(); }
    nb++;
  });
  return nb;
}
function lireSeances_(email, max, tronc) { // email vide = toutes ; plus récentes d'abord
  var sh = feuille_('Séances'), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  var d = sh.getRange(2, 1, n - 1, NSEA).getValues();
  for (var i = d.length - 1; i >= 0; i--) {
    var x = d[i]; if (email && String(x[Q.mail]).toLowerCase() !== email) continue;
    var det = {}; try { det = JSON.parse(x[Q.det] || '{}'); } catch (e) {}
    out.push({ id: String(x[Q.id]), email: x[Q.mail], recu: x[Q.rec], date: jour_(x[Q.date]), sujet: x[Q.sujet], type: x[Q.type], typeId: det.type || '', dur: x[Q.dur], mots: x[Q.mots], wpm: x[Q.wpm], tics: x[Q.tics], logos: x[Q.lo], ethos: x[Q.et], pathos: x[Q.pa], source: x[Q.src], transcript: String(x[Q.txt] || '').slice(0, tronc || 8000), detail: det });
  }
  out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return out.slice(0, max || 40);
}
function bilan_(liste) {
  var jours = {}, mots = 0, der = '';
  liste.forEach(function (s) { if (s.date) { jours[s.date] = 1; if (s.date > der) der = s.date; } mots += Number(s.mots) || 0; });
  return { total: liste.length, jours: Object.keys(jours).length, mots: mots, derniere: der };
}
function agregat_() { // par e-mail : nombre de séances et dernière date (pour la console admin)
  var sh = feuille_('Séances'), n = sh.getLastRow(), m = {};
  if (n < 2) return m;
  var d = sh.getRange(2, 1, n - 1, 4).getValues();
  d.forEach(function (x) { var e = String(x[Q.mail]).toLowerCase(), j = jour_(x[Q.date]); m[e] = m[e] || { n: 0, der: '' }; m[e].n++; if (j > m[e].der) m[e].der = j; });
  return m;
}
function ecrireProgres_(email, liste, appareil) { // une ligne par élève et par leçon (mise à jour si elle existe)
  var sh = feuille_('Progrès'), n = sh.getLastRow(), existe = {}, nb = 0;
  if (n > 1) { var d = sh.getRange(2, 1, n - 1, 3).getValues(); for (var i = 0; i < d.length; i++) if (String(d[i][1]).toLowerCase() === email) existe[String(d[i][2])] = i + 2; }
  (liste || []).slice(0, MAXPRO).forEach(function (p) {
    if (!p) return; var id = cut_(p.id, 40).replace(/[^\w.-]/g, ''); if (!id) return;
    var l = [new Date(), email, id, num_(p.lv), cut_(p.d, 10), num_(p.s), num_(p.n), cut_(appareil, 20)];
    if (existe[id]) sh.getRange(existe[id], 1, 1, NPRO).setValues([l]); else { sh.appendRow(l); existe[id] = sh.getLastRow(); }
    nb++;
  });
  return nb;
}
function lireProgres_(email) {
  var sh = feuille_('Progrès'), n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, NPRO).getValues().filter(function (r) { return !email || String(r[1]).toLowerCase() === email; })
    .map(function (r) { return { em: String(r[1]).toLowerCase(), id: String(r[2]), lv: Number(r[3]) || 0, d: String(r[4]), s: Number(r[5]) || 0, n: Number(r[6]) || 0, app: String(r[7]) }; });
}
/* ---- comptabilité : factures et dépenses, une seule feuille « Compta » ---- */
function tarifs_() {
  var p = PropertiesService.getScriptProperties().getProperty('TARIFS'), d = null;
  try { d = JSON.parse(p); } catch (e) {}
  if (!d || !Array.isArray(d.prix)) d = { prix: [0, 30000, 45000, 60000, 75000, 90000], pay: '' };
  return d;
}
function lireCompta_() {
  var sh = feuille_('Compta'), n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, NCPT).getValues().map(function (r) {
    return { id: String(r[1]), type: String(r[2]), date: String(r[3]), lib: String(r[4]), em: String(r[5]).toLowerCase(), lv: Number(r[6]) || 0, mt: Number(r[7]) || 0, paye: String(r[8]), mode: String(r[9]), cat: String(r[10]), par: String(r[11]) };
  });
}
function iso_(x) { return /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')) ? String(x) : Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'); }
function ecrireCompta_(b, par) {
  var sh = feuille_('Compta'), n = sh.getLastRow(), type = b.type === 'depense' ? 'depense' : 'facture', ligne = null, id = cut_(b.id, 40).replace(/[^\w.-]/g, '');
  var d = n > 1 ? sh.getRange(2, 1, n - 1, NCPT).getValues() : [], pos = 0, maxNo = 0, pref = 'F-' + Utilities.formatDate(new Date(), 'Europe/Paris', 'yyMM') + '-';
  for (var i = 0; i < d.length; i++) {
    if (id && String(d[i][1]) === id) pos = i + 2;
    var m = /^F-\d{4}-(\d{4})$/.exec(String(d[i][1])); if (m && String(d[i][1]).indexOf(pref) === 0) maxNo = Math.max(maxNo, Number(m[1]));
  }
  var mt = Math.max(0, Math.round(Number(b.mt) || 0)); if (!mt) return { erreur: 'Montant invalide.' };
  if (type === 'depense' && !String(b.lib || '').trim()) return { erreur: 'Indique un libellé.' };
  if (type === 'facture' && !/^\S+@\S+\.\S+$/.test(String(b.em || ''))) return { erreur: 'Choisis un élève.' };
  if (!pos) id = type === 'facture' ? pref + ('000' + (maxNo + 1)).slice(-4) : 'D' + Date.now();
  var paye = type === 'facture' && b.paye ? iso_(b.paye) : '';
  ligne = [new Date(), id, type, iso_(b.date), cut_(b.lib, 200), String(b.em || '').toLowerCase(), num_(b.lv) || '', mt, paye, cut_(b.mode, 30), cut_(b.cat, 40), par];
  if (pos) sh.getRange(pos, 1, 1, NCPT).setValues([ligne]); else sh.appendRow(ligne);
  return { ok: true, id: id };
}
function effacerCompta_(id) {
  var sh = feuille_('Compta'), n = sh.getLastRow(); if (n < 2) return 0;
  var d = sh.getRange(2, 2, n - 1, 1).getValues();
  for (var i = d.length - 1; i >= 0; i--) if (String(d[i][0]) === id) { sh.deleteRow(i + 2); return 1; }
  return 0;
}
function effacerProgres_(email, lecon) { // lecon vide = tout le compte
  var sh = feuille_('Progrès'), n = sh.getLastRow(), k = 0; if (n < 2) return 0;
  var d = sh.getRange(2, 1, n - 1, 3).getValues();
  for (var i = d.length - 1; i >= 0; i--) if (String(d[i][1]).toLowerCase() === email && (!lecon || String(d[i][2]) === lecon)) { sh.deleteRow(i + 2); k++; }
  return k;
}
function effacerSeances_(email) {
  var sh = feuille_('Séances'), n = sh.getLastRow(); if (n < 2) return;
  var d = sh.getRange(2, 1, n - 1, 2).getValues();
  for (var i = d.length - 1; i >= 0; i--) if (String(d[i][Q.mail]).toLowerCase() === email) sh.deleteRow(i + 2);
}

/* ---------- actions admin ---------- */
function agir_(op, email, date) {
  var t = trouver_(C.mail, email); if (!t) return { ok: false, erreur: 'Compte introuvable' };
  var v = t.v;
  if (op === 'valider') { // (re)donne un code à usage unique et remet le compte à zéro
    var code = code_();
    set_(t, C.st, 'validé'); set_(t, C.code, code); set_(t, C.pc, ''); set_(t, C.mob, ''); set_(t, C.pw, ''); set_(t, C.tok, ''); set_(t, C.mtok, '');
    MailApp.sendEmail({ to: v[C.mail], subject: 'Ton code d’accès Agora',
      body: 'Bonjour ' + v[C.pre] + ',\n\nTa demande est validée.\n\n1. Ouvre la plateforme sur ton ordinateur (ajoute-la au Dock ou aux favoris avant de créer ton compte) :\n' + APP_URL + '\n2. Clique sur « Se connecter », puis « J’ai un code d’activation ». Entre ton e-mail et ce code :\n\n      ' + code + '\n\n3. Crée ton mot de passe. Il te servira à te reconnecter.\n\nUn seul ordinateur par compte, et un seul téléphone pour l’application (tu le relieras ensuite depuis ton espace, avec « Activer mon application »). Ce code ne marche qu’une seule fois : ne le partage pas.\n\nStephen' });
    journal_('Code d’activation envoyé à ' + v[C.mail]);
  } else if (op === 'bloquer') { set_(t, C.st, 'bloqué'); journal_('Bloqué : ' + v[C.mail]); }
  else if (op === 'debloquer') { set_(t, C.st, 'validé'); journal_('Débloqué : ' + v[C.mail]); }
  else if (op === 'supprimer') { set_(t, C.st, 'supprimé'); [C.code, C.pc, C.mob, C.pw, C.tok, C.mtok].forEach(function (c) { set_(t, c, ''); }); journal_('Supprimé : ' + v[C.mail]); }
  else if (op === 'appareil') { set_(t, C.pc, ''); set_(t, C.tok, ''); journal_('Ordinateur réinitialisé : ' + v[C.mail]); }
  else if (op === 'mobile') { set_(t, C.mob, ''); set_(t, C.mtok, ''); journal_('Téléphone réinitialisé : ' + v[C.mail]); }
  else if (op === 'expire') { set_(t, C.exp, date || ''); journal_('Fin d’accès ' + (date || 'retirée') + ' : ' + v[C.mail]); }
  else if (op === 'effacer') { effacerSeances_(String(v[C.mail]).toLowerCase()); effacerProgres_(String(v[C.mail]).toLowerCase(), ''); t.sh.deleteRow(t.r); journal_('Compte effacé définitivement : ' + v[C.mail]); }
  else return { ok: false, erreur: 'Action inconnue' };
  return { ok: true };
}

/* ---------- API ---------- */
function admin_(b) { return b.cle === PropertiesService.getScriptProperties().getProperty('CLE_ADMIN'); }
function hashCle_(cle) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'cle-admin|' + cle + '|agora-plateforme')
    .map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}
function cleAdmin_() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return 'AG-' + alea_(4, a) + '-' + alea_(4, a) + '-' + alea_(4, a); }
/* qui est derrière la clé ? le propriétaire (clé du Sheet) ou un administrateur de l'onglet Admins */
function qui_(b) {
  var cle = String(b.cle || '').trim(); if (!cle) return null;
  if (admin_({ cle: cle })) return { owner: true, nom: 'Stephen', email: EMAIL_ADMIN, droits: Object.keys(DROITS) };
  var sh = feuille_('Admins'), n = sh.getLastRow(); if (n < 2) return null;
  var h = hashCle_(cle), d = sh.getRange(2, 1, n - 1, NADM).getValues();
  for (var i = 0; i < d.length; i++) {
    if (d[i][AD.cle] === h && d[i][AD.st] === 'actif') {
      if (!d[i][AD.last] || new Date() - new Date(d[i][AD.last]) > 300000) sh.getRange(i + 2, AD.last + 1).setValue(new Date());
      return { owner: false, nom: String(d[i][AD.nom]), email: String(d[i][AD.mail]), droits: String(d[i][AD.dr]).split(',').filter(function (x) { return DROITS[x]; }) };
    }
  }
  return null;
}
function peut_(q, d) { return !!q && (q.owner || q.droits.indexOf(d) >= 0); }
function droitsPropres_(l) { return (Array.isArray(l) ? l : String(l || '').split(',')).filter(function (x) { return DROITS[x]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }); }
function trouverAdmin_(email) {
  var sh = feuille_('Admins'), n = sh.getLastRow(); if (n < 2 || !email) return null;
  var d = sh.getRange(2, 1, n - 1, NADM).getValues();
  for (var i = 0; i < d.length; i++) if (String(d[i][AD.mail]).toLowerCase() === email) return { sh: sh, r: i + 2, v: d[i] };
  return null;
}
function mailAdmin_(nom, email, cle, droits, nouveau) {
  MailApp.sendEmail({ to: email, subject: nouveau ? 'Ton accès à la console Agora' : 'Ta nouvelle clé pour la console Agora',
    body: 'Bonjour ' + nom + ',\n\n' + (nouveau ? 'Stephen t’a donné accès à la console de gestion Agora.' : 'Voici ta nouvelle clé pour la console de gestion Agora. L’ancienne ne marche plus.') + '\n\n1. Ouvre la console :\n' + CONSOLE_URL + '\n\n2. Colle ta clé personnelle quand elle te la demande :\n\n      ' + cle + '\n\nCe que tu peux faire :\n' + (droits.length ? droits.map(function (d) { return ' - ' + DROITS[d]; }).join('\n') : ' - rien pour l’instant (Stephen doit encore te donner des droits)') + '\n\nNe partage pas cette clé : elle est liée à toi, et tout ce que tu fais est noté dans le journal.\n\nStephen' });
}
function profil_(v) { return { prenoms: v[C.pre], nom: v[C.nom], role: v[C.role] }; }
function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var b = JSON.parse(e.postData.contents || '{}'), a = b.action;
    var em = String(b.email || '').trim().toLowerCase();

    if (a === 'demande') {
      if (!/^\S+@\S+\.\S+$/.test(em) || !b.nom || !b.prenoms) return rep_({ ok: false, erreur: 'Champs manquants' });
      var ex = trouver_(C.mail, em);
      if (ex && etat_(ex.v) !== 'supprimé') return rep_({ ok: true, etat: etat_(ex.v) });
      if (ex) { effacerSeances_(em); effacerProgres_(em, ''); ex.sh.deleteRow(ex.r); }
      var role = String(b.role || '').toLowerCase().indexOf('form') === 0 ? 'formateur' : 'élève';
      feuille_('Comptes').appendRow([new Date(), b.nom, b.prenoms, em, b.tel || '', b.age || '', role, b.pays || '', b.situation || '', String(b.projet || '').slice(0, 500), 'en attente', '', '', '', '', '', '', '', '']);
      journal_('Nouvelle demande (' + role + ') : ' + em);
      return rep_({ ok: true, etat: 'en attente' });
    }

    if (a === 'activer') { // code à usage unique + création du mot de passe (ordinateur)
      var t = trouver_(C.mail, em);
      if (!t || etat_(t.v) !== 'validé') return rep_({ ok: false, erreur: 'Compte non validé.' });
      if (!t.v[C.code] || String(t.v[C.code]).toUpperCase() !== String(b.code || '').trim().toUpperCase()) return rep_({ ok: false, erreur: 'Code invalide ou déjà utilisé.' });
      if (String(b.mdp || '').length < 6) return rep_({ ok: false, erreur: 'Mot de passe : 6 caractères minimum.' });
      var jt = jeton_();
      set_(t, C.code, ''); set_(t, C.pc, b.appareil || ''); set_(t, C.pw, hash_(b.mdp, em)); set_(t, C.tok, jt); set_(t, C.last, new Date());
      journal_('Compte activé : ' + em);
      var r1 = profil_(t.v); r1.ok = true; r1.etat = 'validé'; r1.jeton = jt; return rep_(r1);
    }

    if (a === 'connexion') {
      var c = trouver_(C.mail, em);
      if (!c || !c.v[C.pw] || c.v[C.pw] !== hash_(String(b.mdp || ''), em)) return rep_({ ok: false, erreur: 'E-mail ou mot de passe incorrect.' });
      var s = etat_(c.v); if (s !== 'validé') return rep_({ ok: true, etat: s });
      if (c.v[C.pc] && c.v[C.pc] !== b.appareil) return rep_({ ok: true, etat: 'autre appareil' });
      var j2 = jeton_();
      set_(c, C.pc, b.appareil || ''); set_(c, C.tok, j2); set_(c, C.last, new Date());
      var r2 = profil_(c.v); r2.ok = true; r2.etat = 'validé'; r2.jeton = j2; return rep_(r2);
    }

    if (a === 'etat') { // vérification régulière : plateforme (canal p, par défaut) ou téléphone (canal m)
      var mob = b.canal === 'm', u = trouver_(C.mail, em);
      if (!u) return rep_({ ok: true, etat: 'inconnu' });
      var et = etat_(u.v);
      if (et === 'validé') {
        var tc = mob ? C.mtok : C.tok, dc = mob ? C.mob : C.pc;
        if (!u.v[tc] || u.v[tc] !== b.jeton || (u.v[dc] && u.v[dc] !== b.appareil)) return rep_({ ok: true, etat: 'session' });
        set_(u, C.last, new Date());
      }
      var r3 = profil_(u.v); r3.ok = true; r3.etat = et; return rep_(r3);
    }

    /* --- liaison compte <-> téléphone --- */
    if (a === 'liaison') { // depuis la plateforme : donne un code court, valable 10 minutes
      var au = auth_(b, 'p'); if (!au.u) return rep_({ ok: true, etat: au.etat });
      var cache = CacheService.getScriptCache(), ancien = cache.get('lkem_' + au.em);
      if (ancien) cache.remove('lk_' + ancien);
      var cd = code_(); cache.put('lk_' + cd, au.em, DUREE_CODE); cache.put('lkem_' + au.em, cd, DUREE_CODE);
      return rep_({ ok: true, etat: 'validé', code: cd, secondes: DUREE_CODE, mobile: !!au.u.v[C.mob] });
    }
    if (a === 'lier') { // depuis le téléphone : le code remplace l'e-mail et le mot de passe
      var ca = CacheService.getScriptCache(), nbEchecs = Number(ca.get('lkf') || 0);
      if (nbEchecs >= 30) return rep_({ ok: false, erreur: 'Trop d’essais. Réessaie dans quelques minutes.' });
      var cod = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), mail = cod ? ca.get('lk_' + cod) : null;
      if (!mail) { ca.put('lkf', nbEchecs + 1, 600); return rep_({ ok: false, erreur: 'Code invalide ou expiré. Redemande un code sur la plateforme.' }); }
      var lt = trouver_(C.mail, mail);
      if (!lt || etat_(lt.v) !== 'validé') return rep_({ ok: false, erreur: 'Ce compte n’est pas actif.' });
      if (lt.v[C.mob] && lt.v[C.mob] !== b.appareil) return rep_({ ok: false, erreur: 'Un autre téléphone est déjà lié à ce compte. Demande à ton administrateur de le libérer.' });
      var jm = jeton_();
      set_(lt, C.mob, b.appareil || ''); set_(lt, C.mtok, jm);
      ca.remove('lk_' + cod); ca.remove('lkem_' + mail);
      journal_('Téléphone lié : ' + mail);
      var r4 = profil_(lt.v); r4.ok = true; r4.etat = 'validé'; r4.email = mail; r4.jeton = jm; return rep_(r4);
    }

    /* --- séances et avancement --- */
    if (a === 'seance') { // le téléphone envoie ses séances (transcription comprise)
      var am = auth_(b, 'm'); if (!am.u) return rep_({ ok: true, etat: am.etat });
      var nb = ecrireSeances_(am.em, b.seances, 'téléphone');
      return rep_({ ok: true, etat: 'validé', recu: nb });
    }
    if (a === 'avancement') { // lu par la plateforme (canal p) et par le téléphone (canal m)
      var cn = b.canal === 'm' ? 'm' : 'p', av = auth_(b, cn); if (!av.u) return rep_({ ok: true, etat: av.etat });
      var ls = lireSeances_(av.em, 40, 8000), r5 = profil_(av.u.v);
      r5.ok = true; r5.etat = 'validé'; r5.seances = ls; r5.bilan = bilan_(ls); r5.mobile = !!av.u.v[C.mob] && !!av.u.v[C.mtok];
      return rep_(r5);
    }

    if (a === 'moi') { // la console demande qui je suis et ce que j'ai le droit de faire
      var qm = qui_(b); if (!qm) return rep_({ ok: false, erreur: 'Clé invalide' });
      return rep_({ ok: true, nom: qm.nom, email: qm.email, owner: qm.owner, droits: qm.droits, tous: DROITS });
    }
    if (a === 'admins' || a.indexOf('admin') === 0 && a !== 'admin') { // gestion des administrateurs : propriétaire seulement
      var qa = qui_(b); if (!qa) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!qa.owner) return rep_({ ok: false, erreur: 'Réservé au propriétaire.' });
      var ta = trouverAdmin_(em), dr = droitsPropres_(b.droits);
      if (a === 'adminAjouter') {
        if (!/^\S+@\S+\.\S+$/.test(em) || !String(b.nom || '').trim()) return rep_({ ok: false, erreur: 'Indique un nom et un e-mail valides.' });
        if (ta && ta.v[AD.st] === 'actif') return rep_({ ok: false, erreur: 'Cet administrateur existe déjà.' });
        var ck = cleAdmin_(), nomA = cut_(b.nom, 80).trim();
        if (ta) { ta.sh.deleteRow(ta.r); }
        feuille_('Admins').appendRow([new Date(), nomA, em, dr.join(','), hashCle_(ck), 'actif', '', qa.nom]);
        mailAdmin_(nomA, em, ck, dr, true); journal_('Administrateur ajouté : ' + em + ' (droits : ' + (dr.join(', ') || 'aucun') + ')');
        return rep_({ ok: true });
      }
      if (a === 'adminListe') {
        var sa = feuille_('Admins'), na = sa.getLastRow(), da = na > 1 ? sa.getRange(2, 1, na - 1, NADM).getValues() : [];
        return rep_({ ok: true, tous: DROITS, admins: da.map(function (x) { return { nom: x[AD.nom], email: x[AD.mail], droits: String(x[AD.dr]).split(',').filter(function (y) { return DROITS[y]; }), statut: x[AD.st], derniere: x[AD.last], date: x[AD.date], par: x[AD.par] }; }) });
      }
      if (!ta) return rep_({ ok: false, erreur: 'Administrateur introuvable.' });
      if (a === 'adminDroits') { ta.sh.getRange(ta.r, AD.dr + 1).setValue(dr.join(',')); journal_('Droits modifiés : ' + em + ' (' + (dr.join(', ') || 'aucun') + ')'); return rep_({ ok: true }); }
      if (a === 'adminStatut') { var nv = b.statut === 'actif' ? 'actif' : 'révoqué'; ta.sh.getRange(ta.r, AD.st + 1).setValue(nv); journal_('Administrateur ' + (nv === 'actif' ? 'réactivé' : 'révoqué') + ' : ' + em); return rep_({ ok: true }); }
      if (a === 'adminCle') { var nc2 = cleAdmin_(); ta.sh.getRange(ta.r, AD.cle + 1).setValue(hashCle_(nc2)); ta.sh.getRange(ta.r, AD.st + 1).setValue('actif'); mailAdmin_(String(ta.v[AD.nom]), em, nc2, String(ta.v[AD.dr]).split(',').filter(function (y) { return DROITS[y]; }), false); journal_('Nouvelle clé envoyée à l’administrateur : ' + em); return rep_({ ok: true }); }
      if (a === 'adminSupprimer') { ta.sh.deleteRow(ta.r); journal_('Administrateur supprimé : ' + em); return rep_({ ok: true }); }
      return rep_({ ok: false, erreur: 'Action inconnue' });
    }

    if (a === 'liste') {
      var ql = qui_(b); if (!ql) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(ql, 'voir')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les comptes.' });
      var sh = feuille_('Comptes'), n = sh.getLastRow(), d = n > 1 ? sh.getRange(2, 1, n - 1, NCOL).getValues() : [], ag = agregat_();
      var sj = feuille_('Journal'), nj = sj.getLastRow(), dj = nj > 1 ? sj.getRange(Math.max(2, nj - 39), 1, Math.min(40, nj - 1), 2).getValues() : [];
      return rep_({ ok: true, journal: dj,
        comptes: d.map(function (x) { var g = ag[String(x[C.mail]).toLowerCase()] || { n: 0, der: '' }; return { nom: x[C.nom] + ' ' + x[C.pre], email: x[C.mail], tel: x[C.tel], age: x[C.age], role: x[C.role], pays: x[C.pays], situation: x[C.sit], projet: x[C.proj], demande: x[C.date], statut: etat_(x), derniere: x[C.last], expire: x[C.exp], pc: !!x[C.pc], mob: !!x[C.mob], active: !!x[C.pw], code: !!x[C.code], seances: g.n, derniereSeance: g.der }; }) });
    }
    if (a === 'progres') { // plateforme (p) ou téléphone (m) : leçons terminées
      var cp = b.canal === 'm' ? 'm' : 'p', ap = auth_(b, cp); if (!ap.u) return rep_({ ok: true, etat: ap.etat });
      return rep_({ ok: true, etat: 'validé', recu: ecrireProgres_(ap.em, b.lecons, cp === 'm' ? 'téléphone' : 'ordinateur') });
    }
    if (a === 'progressions') { // console : qui a fait quelle leçon
      var qp = qui_(b); if (!qp) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qp, 'voir')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les comptes.' });
      return rep_({ ok: true, lecons: lireProgres_('') });
    }
    if (a === 'progresEffacer') {
      var qe = qui_(b); if (!qe) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qe, 'supprimer')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de supprimer.' });
      var ke = effacerProgres_(em, String(b.lecon || '')); journal_('Progrès effacé (' + ke + ') : ' + em + (b.lecon ? ' · ' + b.lecon : '') + ' ↳ fait par ' + qe.nom);
      return rep_({ ok: true, effaces: ke });
    }

    if (a === 'compta') {
      var qc = qui_(b); if (!qc) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qc, 'finances')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les finances.' });
      return rep_({ ok: true, lignes: lireCompta_(), tarifs: tarifs_() });
    }
    if (a === 'comptaSet' || a === 'comptaDel' || a === 'tarifsSet') {
      var qf = qui_(b); if (!qf) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qf, 'finances')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de modifier les finances.' });
      if (a === 'comptaDel') { var kd = effacerCompta_(String(b.id || '')); journal_('Compta : ligne effacée ' + b.id + ' ↳ fait par ' + qf.nom); return rep_({ ok: true, effaces: kd }); }
      if (a === 'tarifsSet') {
        var pr = (Array.isArray(b.prix) ? b.prix : []).slice(0, 6).map(function (x) { return Math.max(0, Math.round(Number(x) || 0)); }); while (pr.length < 6) pr.push(0); pr[0] = 0;
        PropertiesService.getScriptProperties().setProperty('TARIFS', JSON.stringify({ prix: pr, pay: cut_(b.pay, 400) }));
        journal_('Tarifs modifiés ↳ fait par ' + qf.nom); return rep_({ ok: true, tarifs: tarifs_() });
      }
      var rc = ecrireCompta_(b, qf.nom); if (!rc.ok) return rep_({ ok: false, erreur: rc.erreur });
      journal_('Compta : ' + (b.type === 'depense' ? 'dépense' : 'facture') + ' ' + rc.id + ' ↳ fait par ' + qf.nom); return rep_({ ok: true, id: rc.id });
    }

    if (a === 'seances') { // console admin : séances d'un compte (ou les plus récentes de tous)
      var qs = qui_(b); if (!qs) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qs, 'seances')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les séances.' });
      return rep_({ ok: true, seances: lireSeances_(em, em ? 60 : 100, 8000) });
    }

    if (a === 'admin') {
      var qo = qui_(b); if (!qo) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!OPDROIT[b.op] || !peut_(qo, OPDROIT[b.op])) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de faire ça.' });
      var ro = agir_(b.op, em, b.date);
      if (ro.ok && !qo.owner) journal_('   ↳ fait par ' + qo.nom + ' (' + b.op + ')');
      return rep_(ro);
    }
    return rep_({ ok: false, erreur: 'Action inconnue' });
  } catch (err) { return rep_({ ok: false, erreur: String(err) }); }
  finally { lock.releaseLock(); }
}
function doGet() { return rep_({ ok: true, service: 'Agora Plateforme' }); }
