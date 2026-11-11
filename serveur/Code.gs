/* Agora Plateforme · serveur des comptes (Google Apps Script) — by Stephen
   À coller dans Extensions > Apps Script du Google Sheet de la plateforme.
   Il gère : les comptes (ordinateur), la liaison du téléphone, et les séances
   (transcriptions comprises) envoyées par l'application mobile. */

var APP_URL = 'https://andersonsoahita-hash.github.io/Agora-Plateforme/plateforme/'; // adresse de la plateforme
var FEUILLES = {
  comptes: ['Date', 'Nom', 'Prénoms', 'Email', 'Téléphone', 'Âge', 'Rôle', 'Pays', 'Situation', 'Projet', 'Statut', 'Code d’activation', 'Expire le', 'Dernière connexion', 'Ordinateur', 'Téléphone (appli)', 'Mot de passe (empreinte)', 'Session', 'Session appli'],
  journal: ['Date', 'Action'],
  admins: ['Date', 'Nom', 'Email', 'Droits', 'Clé (empreinte)', 'Statut', 'Dernière activité', 'Créé par'],
  compta: ['Mis à jour', 'Id', 'Type', 'Date', 'Libellé', 'Email', 'Niveau', 'Montant (Ar)', 'Payé le', 'Mode', 'Catégorie', 'Par', 'Test'],
  progres: ['Mis à jour', 'Email', 'Leçon', 'Niveau', 'Date', 'Score', 'Sur', 'Appareil'],
  tests: ['Date', 'Email', 'Niveau', 'Score', 'Moyenne (s)', 'Onglets quittés', 'Temps écoulés', 'Statut', 'Certificat'],
  certificats: ['Numéro', 'Délivré le', 'Email', 'Nom', 'Niveau', 'Type', 'Score', 'Statut', 'Par'],
  formateurs: ['Mis à jour', 'Email', 'Niveau', 'Statut', 'Demandé le', 'Décidé par'],
  activites: ['Id', 'Créé le', 'Type', 'Auteur', 'Nom', 'Titre ou sujet', 'Mode', 'Format', 'Camp A', 'Camp B', 'Date', 'Heure', 'Lieu ou lien', 'Places', 'Statut'],
  inscrits: ['Id activité', 'Email', 'Nom', 'Date'],
  seances: ['Reçu le', 'Email', 'Id', 'Date', 'Sujet', 'Type', 'Durée (s)', 'Mots', 'Mots/min', 'Tics', 'Logos', 'Ethos', 'Pathos', 'Source', 'Transcription', 'Détail (JSON)']
};
var CLEF = { 'Comptes': 'comptes', 'Journal': 'journal', 'Séances': 'seances', 'Admins': 'admins', 'Progrès': 'progres', 'Compta': 'compta', 'Tests': 'tests', 'Certificats': 'certificats', 'Formateurs': 'formateurs', 'Activités': 'activites', 'Inscrits': 'inscrits' };
var NPRO = 8, MAXPRO = 60, NCPT = 13;
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
  var nc = nom === 'Comptes' ? NCOL : (nom === 'Séances' ? NSEA : (nom === 'Admins' ? NADM : (nom === 'Progrès' ? NPRO : (nom === 'Compta' ? NCPT : (FEUILLES[cle] && /^(Tests|Certificats|Formateurs|Activités|Inscrits)$/.test(nom) ? FEUILLES[cle].length : 0)))));
  if (nc) {
    if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
    sh.getRange(1, 1, 1, nc).setValues([FEUILLES[cle]]);
  }
  return sh;
}
function installer() { // à lancer une fois (et après chaque mise à jour du code)
  ['Comptes', 'Journal', 'Séances', 'Admins', 'Progrès', 'Compta'].forEach(feuille_);
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feuille 1'); if (s && s.getLastRow() === 0) s.setName('Notes');
  var p = PropertiesService.getScriptProperties(), nouvelle = !p.getProperty('CLE_ADMIN') && !p.getProperty('CLE_INIT');
  p.setProperty('CLE_INIT', '1');
  if (nouvelle) envoyerCle(); // la clé (à usage unique) arrive directement dans ta boîte mail
}
var MAX_APP = 2, CLE_VIE = 24 * 3600 * 1000; // 2 appareils par administrateur ; une clé vit 24 h et ne sert qu'une fois
function nouvelleCle_(cle) { var p = PropertiesService.getScriptProperties(); p.setProperty('CLE_ADMIN', cle); p.setProperty('CLE_ADMIN_TS', String(Date.now())); }
function mailCle_(cle) {
  MailApp.sendEmail({ to: EMAIL_ADMIN, subject: 'Ta clé administrateur Agora (usage unique)',
    body: 'Bonjour Stephen,\n\nVoici ta clé administrateur Agora :\n\n      ' + cle + '\n\n1. Ouvre la console : ' + CONSOLE_URL + '\n2. Colle cette clé quand elle te la demande.\n\nCette clé ne marche qu’UNE fois et pendant 24 h : elle active l’appareil sur lequel tu la colles (ensuite tu n’as plus rien à coller). Tu peux activer ' + MAX_APP + ' appareils au maximum. Pour en ajouter un autre, retire un appareil dans la console (« Mes appareils »), puis demande une nouvelle clé : dans le Sheet, menu Agora > Nouvelle clé admin.\n\nNe la partage avec personne.' });
  try { SpreadsheetApp.getActive().toast('Clé envoyée à ' + EMAIL_ADMIN); } catch (e) {}
}
function envoyerCle() { var cle = cleAdmin_(); nouvelleCle_(cle); mailCle_(cle); } // une NOUVELLE clé à usage unique, par e-mail
function choisirCle() { // tu choisis ta propre clé (8 caractères minimum), toujours à usage unique
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Choisis ta clé admin', 'Au moins 8 caractères. Elle ne servira qu’une fois (24 h) et sera envoyée à ' + EMAIL_ADMIN + '.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var cle = String(r.getResponseText() || '').trim();
  if (cle.length < 8) { ui.alert('Il faut au moins 8 caractères.'); return; }
  nouvelleCle_(cle); mailCle_(cle);
}
function deconnecterAdmins() { // urgence (téléphone perdu…) : tous les appareils admin sont déconnectés
  appEcrire_([]); journal_('Tous les appareils administrateur ont été déconnectés');
  try { SpreadsheetApp.getUi().alert('Tous les appareils administrateur sont déconnectés. Demande une nouvelle clé (menu Agora > Nouvelle clé admin).'); } catch (e) {}
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
    .addSeparator().addItem('Nouvelle clé admin (usage unique, par e-mail)', 'envoyerCle').addItem('Choisir ma clé admin', 'choisirCle').addItem('Afficher la clé admin en cours', 'montrerCle').addItem('Déconnecter tous les appareils admin', 'deconnecterAdmins').addToUi();
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
function montrerCle() { var c = PropertiesService.getScriptProperties().getProperty('CLE_ADMIN'); SpreadsheetApp.getUi().alert(c ? 'Clé admin en cours (usage unique, 24 h) :\n' + c : 'Aucune clé en cours : elle a déjà servi. Menu Agora > Nouvelle clé admin.'); }

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
    return { id: String(r[1]), type: String(r[2]), date: String(r[3]), lib: String(r[4]), em: String(r[5]).toLowerCase(), lv: Number(r[6]) || 0, mt: Number(r[7]) || 0, paye: String(r[8]), mode: String(r[9]), cat: String(r[10]), par: String(r[11]), test: String(r[12]) === 'oui' };
  });
}
/* ---- tests, certificats, parcours formateur : tout est tenu par le serveur ---- */
var SEUIL = 90; // note minimale (en %) pour réussir un test ; modifiable dans les propriétés du script (SEUIL)
function seuil_() { var s = Number(PropertiesService.getScriptProperties().getProperty('SEUIL')); return s > 0 && s <= 100 ? s : SEUIL; }
function lignes_(nom, nc) { var sh = feuille_(nom), n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, nc).getValues(); }
function certs_(email) { // certificats valides d'un élève (ou de tous si email vide)
  return lignes_('Certificats', 9).map(function (r, i) { return { l: i + 2, no: String(r[0]), date: String(r[1]), em: String(r[2]).toLowerCase(), nom: String(r[3]), niveau: Number(r[4]), type: String(r[5]), score: Number(r[6]) || 0, st: String(r[7]), par: String(r[8]) }; })
    .filter(function (c) { return !email || c.em === email; });
}
function aCert_(email, niveau, type) { return certs_(email).some(function (c) { return c.niveau === niveau && c.type === type && c.st === 'valide'; }); }
function emettre_(email, nom, niveau, type, score, par) {
  var tous = certs_(''), no, pris = {}; tous.forEach(function (c) { pris[c.no] = 1; });
  do { no = 'AG-' + iso_('').slice(0, 7).replace('-', '') + '-' + alea_(5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); } while (pris[no]);
  feuille_('Certificats').appendRow([no, iso_(''), email, nom, niveau, type, score, 'valide', par || 'automatique']);
  journal_('Certificat ' + no + ' : ' + email + ' · niveau ' + niveau + (type === 'formateur' ? ' (formateur)' : '') + ' ↳ ' + (par || 'automatique'));
  return no;
}
function nomDe_(u) { return String(u.v[C.pre] || '') + ' ' + String(u.v[C.nom] || ''); }
function formateurs_(email) {
  return lignes_('Formateurs', 6).map(function (r, i) { return { l: i + 2, em: String(r[1]).toLowerCase(), niveau: Number(r[2]), st: String(r[3]), dem: String(r[4]), par: String(r[5]) }; })
    .filter(function (x) { return !email || x.em === email; });
}
function iso_(x) { return /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')) ? String(x) : Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'); }
function ecrireCompta_(b, par) {
  var sh = feuille_('Compta'), n = sh.getLastRow(), type = b.type === 'depense' ? 'depense' : 'facture', ligne = null, id = cut_(b.id, 40).replace(/[^\w.-]/g, '');
  var d = n > 1 ? sh.getRange(2, 1, n - 1, NCPT).getValues() : [], pos = 0, maxNo = 0, pref = (b.test ? 'T-' : 'F-') + Utilities.formatDate(new Date(), 'Europe/Paris', 'yyMM') + '-';
  for (var i = 0; i < d.length; i++) {
    if (id && String(d[i][1]) === id) pos = i + 2;
    var m = /^[FT]-\d{4}-(\d{4})$/.exec(String(d[i][1])); if (m && String(d[i][1]).indexOf(pref) === 0) maxNo = Math.max(maxNo, Number(m[1]));
  }
  var mt = Math.max(0, Math.round(Number(b.mt) || 0)); if (!mt) return { erreur: 'Montant invalide.' };
  if (type === 'depense' && !String(b.lib || '').trim()) return { erreur: 'Indique un libellé.' };
  if (type === 'facture' && !/^\S+@\S+\.\S+$/.test(String(b.em || ''))) return { erreur: 'Choisis un élève.' };
  if (!pos) id = type === 'facture' ? pref + ('000' + (maxNo + 1)).slice(-4) : 'D' + Date.now();
  var paye = type === 'facture' && b.paye ? iso_(b.paye) : '';
  ligne = [new Date(), id, type, iso_(b.date), cut_(b.lib, 200), String(b.em || '').toLowerCase(), num_(b.lv) || '', mt, paye, cut_(b.mode, 30), cut_(b.cat, 40), par, b.test ? 'oui' : ''];
  if (pos) sh.getRange(pos, 1, 1, NCPT).setValues([ligne]); else sh.appendRow(ligne);
  return { ok: true, id: id };
}
function effacerCompta_(id) {
  var sh = feuille_('Compta'), n = sh.getLastRow(); if (n < 2) return 0;
  var d = sh.getRange(2, 2, n - 1, 1).getValues();
  for (var i = d.length - 1; i >= 0; i--) if (String(d[i][0]) === id) { sh.deleteRow(i + 2); return 1; }
  return 0;
}
function effacerTestCompta_() {
  var sh = feuille_('Compta'), n = sh.getLastRow(), k = 0; if (n < 2) return 0;
  var d = sh.getRange(2, 13, n - 1, 1).getValues();
  for (var i = d.length - 1; i >= 0; i--) if (String(d[i][0]) === 'oui') { sh.deleteRow(i + 2); k++; }
  return k;
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
    var mv = mailValidation_(v[C.pre], code); MailApp.sendEmail({ to: v[C.mail], subject: 'Ton code d’accès Agora', body: mv.texte, htmlBody: mv.html });
    journal_('Code d’activation envoyé à ' + v[C.mail]);
    if (estTest_(v)) { // compte test : rien à payer, mais une vraie facture (marquée test, effaçable) pour voir le rendu
      var dejaF = lireCompta_().some(function (l) { return l.em === String(v[C.mail]).toLowerCase() && l.test; });
      if (!dejaF) { var pt = tarifs_(), hoy = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'); ecrireCompta_({ type: 'facture', test: true, em: v[C.mail], lv: 1, mt: (pt.prix && pt.prix[1]) || 30000, lib: 'Niveau 1 · compte test (Développeur Anderson)', date: hoy, paye: hoy, mode: 'Développeur Anderson' }, 'système'); journal_('Facture test créée pour ' + v[C.mail]); }
    }
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
function cleProprio_(cle) { // la clé du propriétaire : une seule fois, 24 h
  var p = PropertiesService.getScriptProperties(), k = p.getProperty('CLE_ADMIN'); if (!k || cle !== k) return false;
  var ts = Number(p.getProperty('CLE_ADMIN_TS') || 0); return !ts || Date.now() - ts < CLE_VIE;
}
function appLire_() { try { var a = JSON.parse(PropertiesService.getScriptProperties().getProperty('APP_ADM') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function appEcrire_(a) { PropertiesService.getScriptProperties().setProperty('APP_ADM', JSON.stringify(a)); }
function hashCle_(cle) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'cle-admin|' + cle + '|agora-plateforme')
    .map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}
function cleAdmin_() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return 'AG-' + alea_(4, a) + '-' + alea_(4, a) + '-' + alea_(4, a); }
/* qui est derrière ce jeton d'appareil ? le propriétaire ou un administrateur de l'onglet Admins.
   La clé qu'on colle une fois (usage unique) n'ouvre rien d'autre que « activerAppareil » : tout le reste passe par le jeton de l'appareil. */
function qui_(b) {
  var t = String(b.cle || '').trim(); if (t.length < 20) return null;
  var h = hashCle_(t), L = appLire_(), ap = null;
  for (var i = 0; i < L.length; i++) if (L[i].h === h) { ap = L[i]; break; }
  if (!ap) return null;
  var w, ta = null;
  if (ap.qui === 'owner') w = { owner: true, nom: 'Stephen', email: EMAIL_ADMIN, droits: Object.keys(DROITS) };
  else {
    ta = trouverAdmin_(ap.qui); if (!ta || ta.v[AD.st] !== 'actif') return null;
    w = { owner: false, nom: String(ta.v[AD.nom]), email: String(ta.v[AD.mail]), droits: String(ta.v[AD.dr]).split(',').filter(function (x) { return DROITS[x]; }) };
  }
  if (!ap.last || Date.now() - ap.last > 300000) { ap.last = Date.now(); appEcrire_(L); if (ta) ta.sh.getRange(ta.r, AD.last + 1).setValue(new Date()); }
  w.app = ap.id; return w;
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
    body: 'Bonjour ' + nom + ',\n\n' + (nouveau ? 'Stephen t’a donné accès à la console de gestion Agora.' : 'Voici une nouvelle clé pour la console de gestion Agora.') + '\n\n1. Ouvre la console :\n' + CONSOLE_URL + '\n\n2. Colle ta clé personnelle quand elle te la demande :\n\n      ' + cle + '\n\nCe que tu peux faire :\n' + (droits.length ? droits.map(function (d) { return ' - ' + DROITS[d]; }).join('\n') : ' - rien pour l’instant (Stephen doit encore te donner des droits)') + '\n\nCette clé ne marche qu’UNE fois et pendant 24 h : elle active l’appareil sur lequel tu la colles (ensuite tu n’as plus rien à coller). Tu peux activer ' + MAX_APP + ' appareils au maximum ; pour en ajouter un autre, retire-en un dans « Mes appareils » puis demande une nouvelle clé à Stephen.\n\nNe partage pas cette clé : elle est liée à toi, et tout ce que tu fais est noté dans le journal.\n\nStephen' });
}
/* lieu : « Madagascar — Ariary (Ar) · Antananarivo · Analakely » (le début garde la devise ; ville et quartier servent à repérer les membres proches) */
function lieu_(b) { var p = cut_(b.pays, 40), r = cut_(b.res, 30), v = cut_(b.ville, 60), q = cut_(b.quartier, 60); return p + (r && p.indexOf(r) !== 0 && p.indexOf('Madagascar') !== 0 ? ' · ' + r : '') + (v ? ' · ' + v : '') + (q ? ' · ' + q : ''); }
/* ---------- carte des membres : comptages seulement, jamais de position individuelle ---------- */
function sansAccent_(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function nomVille_(x) { return String(x || '').replace(/\s*\(.*$/, '').replace(/\s+/g, ' ').trim(); }
function lieuLire_(v) { // « Madagascar — Ariary (Ar) · Antananarivo · Analakely » ou « Europe et autres — Euro (€) · France · Paris · 11e arrondissement »
  var p = String(v[C.pays] || '').split(' · ').map(function (x) { return x.trim(); }), mg = /^Madagascar/i.test(p[0] || '');
  if (mg) return { pays: 'Madagascar', ville: nomVille_(p[1]), quartier: p[2] || '' };
  if (p.length >= 3) return { pays: p[1], ville: nomVille_(p[2]), quartier: p[3] || '' };
  return { pays: '', ville: '', quartier: '' };
}
function carte_(moi, complet) {
  var sh = feuille_('Comptes'), n = sh.getLastRow(), d = n > 1 ? sh.getRange(2, 1, n - 1, NCOL).getValues() : [];
  var P = {}, V = {}, Qm = {}, total = 0, K = 3;
  var mv = moi ? sansAccent_(moi.ville) : '', mp = moi ? moi.pays : '';
  d.forEach(function (v) {
    if (etat_(v) !== 'validé' || estTest_(v)) return;
    var l = lieuLire_(v); total++;
    var pays = l.pays || 'Pays non précisé'; P[pays] = (P[pays] || 0) + 1;
    if (!l.ville) return;
    var kv = pays + '|' + sansAccent_(l.ville); V[kv] = V[kv] || { pays: pays, ville: l.ville, n: 0 }; V[kv].n++;
    if (moi && pays === mp && sansAccent_(l.ville) === mv && l.quartier) { var kq = sansAccent_(l.quartier); Qm[kq] = Qm[kq] || { quartier: l.quartier, n: 0 }; Qm[kq].n++; }
  });
  var villes = Object.keys(V).map(function (k) { return V[k]; }).filter(function (x) { return complet || x.n >= K; }).sort(function (a, b) { return b.n - a.n; });
  var r = { total: total, pays: Object.keys(P).map(function (k) { return { pays: k, n: P[k] }; }).sort(function (a, b) { return b.n - a.n; }), villes: villes, seuil: K };
  if (moi) {
    var nv = V[mp + '|' + mv] ? V[mp + '|' + mv].n : 0;
    r.moi = { pays: mp, ville: moi.ville, quartier: moi.quartier, nVille: nv, quartiers: Object.keys(Qm).map(function (k) { return Qm[k]; }).filter(function (x) { return x.n >= K; }).sort(function (a, b) { return b.n - a.n; }) };
    var kq2 = sansAccent_(moi.quartier); r.moi.nQuartier = moi.quartier && Qm[kq2] && Qm[kq2].n >= K ? Qm[kq2].n : null;
  }
  return r;
}
var MOBILE_URL = 'https://andersonsoahita-hash.github.io/Agora-Plateforme/mobile/'; // application Agora Studio (téléphone)
function htmlEsc_(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* e-mail de validation : les deux liens, le code, et le guide d'installation pour chaque appareil (à faire AVANT de créer le compte) */
function mailValidation_(prenom, code) {
  var G = [
    ['Mac', 'Safari : dans la barre du haut, menu « Fichier » → « Ajouter au Dock… » (ou « Ajouter aux favoris »). Chrome : menu ⋮ → « Diffuser, enregistrer et partager » → « Installer Agora ».'],
    ['Windows', 'Chrome ou Edge : clique sur l’icône « Installer » (écran avec une flèche) à droite de la barre d’adresse, ou menu ⋮ → « Enregistrer et partager » → « Installer ». Puis clic droit sur l’icône de la barre des tâches → « Épingler ». Autre navigateur : épingle l’onglet ou ajoute la page aux favoris.'],
    ['iPhone / iPad', 'Ouvre le lien de l’application dans Safari (pas depuis Mail ni WhatsApp : copie-le dans Safari). Touche « Partager » (le carré avec une flèche) → « Sur l’écran d’accueil » → « Ajouter ».'],
    ['Android', 'Ouvre le lien de l’application dans Chrome (copie-le depuis cet e-mail si besoin). Menu ⋮ → « Installer l’application » (ou « Ajouter à l’écran d’accueil »).']
  ];
  var texte = 'Bonjour ' + prenom + ',\n\nTa demande est validée. Voici tes deux liens :\n\n'
    + '• La plateforme (sur ordinateur) : ' + APP_URL + '\n'
    + '• L’application Agora Studio (sur téléphone) : ' + MOBILE_URL + '\n\n'
    + 'Ton code d’activation (il ne marche qu’une fois) :\n\n      ' + code + '\n\n'
    + 'ÉTAPE 1 · Installe d’abord (2 minutes)\n' + G.map(function (g) { return '— ' + g[0] + ' : ' + g[1]; }).join('\n') + '\n\n'
    + 'ÉTAPE 2 · Crée ton compte depuis la version installée (ainsi ton appareil se souvient d’Agora)\nSur la plateforme : « Se connecter » → « J’ai un code d’activation ». Entre ton e-mail et le code ci-dessus, puis crée ton mot de passe.\n\n'
    + 'ÉTAPE 3 · Relie ton téléphone\nDans ton espace sur ordinateur : « Activer mon application ». Un code s’affiche : saisis-le dans l’application.\n\n'
    + 'Un seul ordinateur par compte et un seul téléphone. Ne partage pas ton code.\n\nStephen · Agora, l’art oratoire';
  var bt = 'display:inline-block;padding:12px 18px;border-radius:999px;font-weight:700;text-decoration:none;margin:4px 6px 4px 0;';
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1b2033;max-width:560px;line-height:1.55">'
    + '<p>Bonjour ' + htmlEsc_(prenom) + ',</p><p><b>Ta demande est validée.</b> Voici tes deux liens :</p>'
    + '<p><a href="' + APP_URL + '" style="' + bt + 'background:#9E2B16;color:#ffffff">Ouvrir la plateforme (ordinateur)</a>'
    + '<a href="' + MOBILE_URL + '" style="' + bt + 'background:#1b2033;color:#ffffff">Ouvrir l’application (téléphone)</a></p>'
    + '<p>Ton code d’activation (il ne marche qu’une fois) :</p><p style="font-size:26px;letter-spacing:4px;font-weight:700;background:#f2f4fa;border-radius:12px;padding:12px 16px;display:inline-block">' + htmlEsc_(code) + '</p>'
    + '<h3 style="margin:22px 0 6px">Étape 1 · Installe d’abord (2 minutes)</h3>'
    + G.map(function (g) { return '<p style="margin:6px 0"><b>' + g[0] + '</b> : ' + htmlEsc_(g[1]) + '</p>'; }).join('')
    + '<h3 style="margin:22px 0 6px">Étape 2 · Crée ton compte depuis la version installée</h3><p>Ainsi ton appareil se souvient d’Agora. Sur la plateforme : « Se connecter » → « J’ai un code d’activation ». Entre ton e-mail et le code ci-dessus, puis crée ton mot de passe.</p>'
    + '<h3 style="margin:22px 0 6px">Étape 3 · Relie ton téléphone</h3><p>Dans ton espace sur ordinateur : « Activer mon application ». Un code s’affiche : saisis-le dans l’application.</p>'
    + '<p style="color:#5b6173;font-size:13px">Un seul ordinateur par compte et un seul téléphone. Ne partage pas ton code.</p><p>Stephen · Agora, l’art oratoire</p></div>';
  return { texte: texte, html: html };
}
function estTest_(v) { return /D[ée]veloppeur Anderson/i.test(String(v[C.proj] || '')); } // compte test : a choisi « Développeur Anderson » comme mode de paiement
function profil_(v) { return { prenoms: v[C.pre], nom: v[C.nom], role: v[C.role], test: estTest_(v) }; }
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
      feuille_('Comptes').appendRow([new Date(), b.nom, b.prenoms, em, b.tel || '', b.age || '', role, lieu_(b), b.situation || '', String(b.projet || '').slice(0, 500), 'en attente', '', '', '', '', '', '', '', '']);
      journal_('Nouvelle demande (' + role + ')' + (/D[ée]veloppeur Anderson/i.test(String(b.projet || '')) ? ' [compte test]' : '') + ' : ' + em + (b.cgu ? ' · conditions acceptées (version ' + cut_(b.cgu, 10) + ')' : ''));
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

    if (a === 'carte') { // comptages agrégés : membres validés seulement (ou administrateur : détail complet)
      var qc2 = b.cle ? qui_(b) : null;
      if (qc2) return rep_({ ok: true, etat: 'validé', carte: carte_(null, true), complet: true });
      var ac = auth_(b, b.canal === 'm' ? 'm' : 'p'); if (!ac.u) return rep_({ ok: true, etat: ac.etat });
      return rep_({ ok: true, etat: 'validé', carte: carte_(lieuLire_(ac.u.v), false) });
    }
    if (a === 'lieuSet') { // le membre précise ou corrige sa ville et son quartier (ajout libre possible)
      var al = auth_(b, b.canal === 'm' ? 'm' : 'p'); if (!al.u) return rep_({ ok: true, etat: al.etat });
      var vv = cut_(b.ville, 60).trim(), qq = cut_(b.quartier, 60).trim(); if (vv.length < 2) return rep_({ ok: false, erreur: 'Indique ta ville.' });
      var lo = lieuLire_(al.u.v), p0 = String(al.u.v[C.pays] || '').split(' · ')[0] || '', mg2 = /^Madagascar/i.test(p0), paysN = mg2 ? 'Madagascar' : (b.res ? cut_(b.res, 30) : lo.pays);
      set_(al.u, C.pays, lieu_({ pays: p0, res: paysN, ville: vv, quartier: qq }));
      return rep_({ ok: true, etat: 'validé', carte: carte_(lieuLire_(trouver_(C.mail, al.em).v), false) });
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
    if (a === 'lecons') { // léger : les leçons terminées sur la plateforme (le téléphone l'interroge toutes les 15 s)
      var al = auth_(b, b.canal === 'm' ? 'm' : 'p'); if (!al.u) return rep_({ ok: true, etat: al.etat });
      return rep_({ ok: true, etat: 'validé', lecons: lireProgres_(al.em).map(function (x) { return { id: x.id, d: x.d }; }) });
    }
    if (a === 'avancement') { // lu par la plateforme (canal p) et par le téléphone (canal m)
      var cn = b.canal === 'm' ? 'm' : 'p', av = auth_(b, cn); if (!av.u) return rep_({ ok: true, etat: av.etat });
      var ls = lireSeances_(av.em, 40, 8000), r5 = profil_(av.u.v);
      r5.ok = true; r5.etat = 'validé'; r5.seances = ls; r5.bilan = bilan_(ls); r5.mobile = !!av.u.v[C.mob] && !!av.u.v[C.mtok];
      return rep_(r5);
    }

    if (a === 'activerAppareil') { // la clé à usage unique devient un jeton propre à CET appareil
      var cch = CacheService.getScriptCache(), nf = Number(cch.get('adfail') || 0);
      if (nf >= 8) return rep_({ ok: false, erreur: 'Trop d’essais. Réessaie dans 15 minutes.' });
      var cl = String(b.cle || '').trim(), qk = null, tk2 = null;
      if (cl && cleProprio_(cl)) qk = 'owner';
      else if (cl) {
        var sh2 = feuille_('Admins'), n2 = sh2.getLastRow(), h2 = hashCle_(cl), d2 = n2 > 1 ? sh2.getRange(2, 1, n2 - 1, NADM).getValues() : [];
        for (var i2 = 0; i2 < d2.length; i2++) {
          var pc = String(d2[i2][AD.cle]).split(':');
          if (pc[0] === h2 && d2[i2][AD.st] === 'actif') { if (!pc[1] || Date.now() - Number(pc[1]) < CLE_VIE) { qk = String(d2[i2][AD.mail]).toLowerCase(); tk2 = { sh: sh2, r: i2 + 2 }; } break; }
        }
      }
      if (!qk) { cch.put('adfail', String(nf + 1), 900); return rep_({ ok: false, erreur: 'Clé invalide, déjà utilisée ou expirée. Demande-en une nouvelle.' }); }
      if (tk2) tk2.sh.getRange(tk2.r, AD.last + 1).setValue(new Date());
      if (qk === 'owner') PropertiesService.getScriptProperties().setProperty('CLE_ADMIN', ''); else tk2.sh.getRange(tk2.r, AD.cle + 1).setValue(''); // la clé est grillée dans tous les cas
      var L2 = appLire_(), mes = L2.filter(function (x) { return x.qui === qk; });
      if (mes.length >= MAX_APP) { journal_('Activation refusée (appareils au maximum) : ' + (qk === 'owner' ? 'Stephen' : qk)); return rep_({ ok: false, erreur: 'Nombre maximal d’appareils atteint (' + MAX_APP + '). Retire un appareil (console > Mes appareils, ou menu Agora > Déconnecter tous les appareils admin), puis demande une nouvelle clé.' }); }
      var jt = 'AGT-' + jeton_(), apn = { id: alea_(6, 'abcdefghjkmnpqrstuvwxyz23456789'), h: hashCle_(jt), qui: qk, nom: cut_(b.nom, 40) || 'Appareil', date: Date.now(), last: Date.now() };
      L2.push(apn); appEcrire_(L2); journal_('Appareil admin activé : ' + (qk === 'owner' ? 'Stephen' : qk) + ' (' + apn.nom + ')');
      var qn = qui_({ cle: jt });
      return rep_({ ok: true, jeton: jt, nom: qn.nom, email: qn.email, owner: qn.owner, droits: qn.droits, tous: DROITS });
    }
    if (a === 'appareilsListe' || a === 'appareilRetirer') {
      var qv = qui_(b); if (!qv) return rep_({ ok: false, erreur: 'Clé invalide' });
      var Lv = appLire_(), mienne = function (x) { return qv.owner || x.qui === String(qv.email).toLowerCase(); };
      if (a === 'appareilRetirer') {
        var cible = Lv.filter(function (x) { return x.id === String(b.id) && mienne(x); })[0]; if (!cible) return rep_({ ok: false, erreur: 'Appareil introuvable.' });
        appEcrire_(Lv.filter(function (x) { return x !== cible; })); journal_('Appareil admin retiré : ' + (cible.qui === 'owner' ? 'Stephen' : cible.qui) + ' (' + cible.nom + ')');
        return rep_({ ok: true });
      }
      return rep_({ ok: true, max: MAX_APP, appareils: Lv.filter(mienne).map(function (x) { return { id: x.id, nom: x.nom, qui: x.qui === 'owner' ? 'Stephen' : x.qui, date: x.date, last: x.last, moi: x.id === qv.app }; }) });
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
        feuille_('Admins').appendRow([new Date(), nomA, em, dr.join(','), hashCle_(ck) + ':' + Date.now(), 'actif', '', qa.nom]);
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
      if (a === 'adminCle') { var nc2 = cleAdmin_(); ta.sh.getRange(ta.r, AD.cle + 1).setValue(hashCle_(nc2) + ':' + Date.now()); ta.sh.getRange(ta.r, AD.st + 1).setValue('actif'); mailAdmin_(String(ta.v[AD.nom]), em, nc2, String(ta.v[AD.dr]).split(',').filter(function (y) { return DROITS[y]; }), false); journal_('Nouvelle clé envoyée à l’administrateur : ' + em); return rep_({ ok: true }); }
      if (a === 'adminSupprimer') { ta.sh.deleteRow(ta.r); appEcrire_(appLire_().filter(function (x) { return x.qui !== em; })); journal_('Administrateur supprimé : ' + em); return rep_({ ok: true }); }
      return rep_({ ok: false, erreur: 'Action inconnue' });
    }

    if (a === 'liste') {
      var ql = qui_(b); if (!ql) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(ql, 'voir')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les comptes.' });
      var sh = feuille_('Comptes'), n = sh.getLastRow(), d = n > 1 ? sh.getRange(2, 1, n - 1, NCOL).getValues() : [], ag = agregat_();
      var sj = feuille_('Journal'), nj = sj.getLastRow(), dj = nj > 1 ? sj.getRange(Math.max(2, nj - 39), 1, Math.min(40, nj - 1), 2).getValues() : [];
      return rep_({ ok: true, journal: dj,
        comptes: d.map(function (x) { var g = ag[String(x[C.mail]).toLowerCase()] || { n: 0, der: '' }; return { nom: x[C.nom] + ' ' + x[C.pre], email: x[C.mail], tel: x[C.tel], age: x[C.age], role: x[C.role], pays: x[C.pays], situation: x[C.sit], projet: x[C.proj], test: estTest_(x), demande: x[C.date], statut: etat_(x), derniere: x[C.last], expire: x[C.exp], pc: !!x[C.pc], mob: !!x[C.mob], active: !!x[C.pw], code: !!x[C.code], seances: g.n, derniereSeance: g.der }; }) });
    }
    /* ---- défis et rencontres : partagés entre tous les comptes ---- */
    if (a === 'actCreer' || a === 'actListe' || a === 'actRejoindre' || a === 'actRetirer') {
      var ac = auth_(b, 'p'); if (!ac.u) return rep_({ ok: true, etat: ac.etat });
      var aNom = function (n) { var t = String(n || '').trim().split(/\s+/); return t[0] + (t[1] ? ' ' + t[1].charAt(0) + '.' : ''); };
      var aTout = function () { return lignes_('Activités', 15).map(function (r, i) { return { l: i + 2, id: String(r[0]), cree: String(r[1]), type: String(r[2]), auteur: String(r[3]).toLowerCase(), nom: String(r[4]), titre: String(r[5]), mode: String(r[6]), fmt: String(r[7]), a: String(r[8]), b: String(r[9]), date: String(r[10]), heure: String(r[11]), lieu: String(r[12]), max: Number(r[13]) || 0, st: String(r[14]) }; }).filter(function (x) { return x.st === 'ouvert'; }); };
      var aIns = function () { return lignes_('Inscrits', 4).map(function (r, i) { return { l: i + 2, id: String(r[0]), em: String(r[1]).toLowerCase(), nom: String(r[2]) }; }); };
      if (a === 'actCreer') {
        var ty = b.type === 'rencontre' ? 'rencontre' : 'defi', tt = String(b.titre || '').trim().slice(0, 160);
        if (!tt) return rep_({ ok: false, erreur: 'Indique un titre.' });
        var mx = Math.max(0, Math.min(500, Math.round(num_(b.max) || 0))), idn;
        var pris = {}; aTout().forEach(function (x) { pris[x.id] = 1; });
        do { idn = (ty === 'defi' ? 'D' : 'R') + alea_(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); } while (pris[idn]);
        var cl = function (k, n) { return String(b[k] || '').trim().slice(0, n || 80); };
        var md = /^(duo|ville|pays|meme|groupe)$/.test(b.mode) ? b.mode : 'duo';
        feuille_('Activités').appendRow([idn, iso_(''), ty, ac.em, nomDe_(ac.u).trim(), tt, ty === 'defi' ? md : '', b.fmt === 'reel' ? 'reel' : 'visio', cl('a'), cl('b'), cl('date', 10), cl('heure', 5), cl('lieu', 160), mx, 'ouvert']);
        feuille_('Inscrits').appendRow([idn, ac.em, nomDe_(ac.u).trim(), iso_('')]);
        journal_((ty === 'defi' ? 'Défi ' : 'Rencontre ') + idn + ' : ' + ac.em + ' · ' + tt);
        return rep_({ ok: true, id: idn });
      }
      if (a === 'actRejoindre' || a === 'actRetirer') {
        var cible = aTout().filter(function (x) { return x.id === String(b.id); })[0]; if (!cible) return rep_({ ok: false, erreur: 'Introuvable.' });
        if (a === 'actRetirer') { if (cible.auteur !== ac.em) return rep_({ ok: false, erreur: 'Seul l’auteur peut retirer.' }); feuille_('Activités').getRange(cible.l, 15).setValue('retiré'); journal_('Retiré ' + cible.id + ' : ' + ac.em); return rep_({ ok: true }); }
        var ins = aIns().filter(function (x) { return x.id === cible.id; }), moi = ins.filter(function (x) { return x.em === ac.em; })[0];
        if (moi) { if (cible.auteur === ac.em) return rep_({ ok: false, erreur: 'Tu es l’auteur : retire plutôt l’annonce.' }); feuille_('Inscrits').deleteRow(moi.l); }
        else { if (cible.max && ins.length >= cible.max) return rep_({ ok: false, erreur: 'C’est complet.' }); feuille_('Inscrits').appendRow([cible.id, ac.em, nomDe_(ac.u).trim(), iso_('')]); }
        return rep_({ ok: true, inscrit: !moi });
      }
      var tIns = aIns(), cpt = {}, mien = {}, noms = {}; tIns.forEach(function (x) { cpt[x.id] = (cpt[x.id] || 0) + 1; if (x.em === ac.em) mien[x.id] = 1; (noms[x.id] = noms[x.id] || []).push(aNom(x.nom)); });
      return rep_({ ok: true, moi: ac.em, activites: aTout().reverse().slice(0, 100).map(function (x) { return { id: x.id, type: x.type, titre: x.titre, mode: x.mode, fmt: x.fmt, a: x.a, b: x.b, date: x.date, heure: x.heure, lieu: x.lieu, max: x.max, par: aNom(x.nom), mien: x.auteur === ac.em, n: cpt[x.id] || 0, inscrit: !!mien[x.id], noms: (noms[x.id] || []).slice(0, 12) }; }) });
    }
    if (a === 'actTout' || a === 'actSupprimer') { // console
      var qa = qui_(b); if (!qa) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qa, a === 'actTout' ? 'voir' : 'valider')) return rep_({ ok: false, erreur: 'Droit insuffisant.' });
      var shA = feuille_('Activités'), dA = lignes_('Activités', 15), cI = {}; lignes_('Inscrits', 4).forEach(function (r) { cI[String(r[0])] = (cI[String(r[0])] || 0) + 1; });
      if (a === 'actSupprimer') { for (var ia = 0; ia < dA.length; ia++) if (String(dA[ia][0]) === String(b.id)) { shA.getRange(ia + 2, 15).setValue('retiré'); journal_('Retiré par l’équipe ' + b.id); return rep_({ ok: true }); } return rep_({ ok: false, erreur: 'Introuvable.' }); }
      return rep_({ ok: true, activites: dA.map(function (r) { return { id: String(r[0]), cree: String(r[1]), type: String(r[2]), auteur: String(r[3]), nom: String(r[4]), titre: String(r[5]), mode: String(r[6]), date: String(r[10]), lieu: String(r[12]), max: Number(r[13]) || 0, st: String(r[14]), n: cI[String(r[0])] || 0 }; }).reverse() });
    }
    if (a === 'testEnvoi') { // l'élève envoie son test : le serveur décide et, si c'est réussi, émet le certificat
      var at = auth_(b, 'p'); if (!at.u) return rep_({ ok: true, etat: at.etat });
      var nv = Math.round(num_(b.niveau) || 0); if (!(nv >= 1 && nv <= 5)) return rep_({ ok: false, erreur: 'Niveau inconnu.' });
      if (nv > 1 && !aCert_(at.em, nv - 1, 'eleve')) return rep_({ ok: false, erreur: 'Il faut d’abord le certificat du niveau ' + (nv - 1) + '.' });
      var dj0 = certs_(at.em).filter(function (c) { return c.niveau === nv && c.type === 'eleve' && c.st === 'valide'; })[0];
      if (dj0) return rep_({ ok: true, etat: 'validé', statut: 'réussi', deja: true, no: dj0.no, date: dj0.date, score: dj0.score });
      var sc = Math.max(0, Math.min(100, Math.round(num_(b.score) || 0))), ong = Math.max(0, Math.round(num_(b.tabs) || 0)), dl = Math.max(0, Math.round(num_(b.to) || 0)), moy = Math.round((num_(b.avg) || 0) * 10) / 10;
      var stt = sc < seuil_() ? 'échec' : (ong >= 3 ? 'à vérifier' : 'réussi'), no0 = '';
      if (stt === 'réussi') no0 = emettre_(at.em, nomDe_(at.u).trim(), nv, 'eleve', sc, 'automatique');
      feuille_('Tests').appendRow([new Date(), at.em, nv, sc, moy, ong, dl, stt, no0]);
      journal_('Test niveau ' + nv + ' : ' + at.em + ' · ' + sc + ' % · ' + stt);
      return rep_({ ok: true, etat: 'validé', statut: stt, score: sc, seuil: seuil_(), no: no0, date: iso_('') });
    }
    if (a === 'parcours') { // ce que le serveur sait de moi : certificats, derniers tests, parcours formateur
      var ap2 = auth_(b, 'p'); if (!ap2.u) return rep_({ ok: true, etat: ap2.etat });
      var dern = {}; lignes_('Tests', 9).forEach(function (r) { if (String(r[1]).toLowerCase() === ap2.em) dern[Number(r[2])] = { niveau: Number(r[2]), score: Number(r[3]), date: jour_(r[0]), statut: String(r[7]), no: String(r[8]) }; });
      var fm = {}; formateurs_(ap2.em).forEach(function (x) { fm[x.niveau] = x.st; });
      return rep_({ ok: true, etat: 'validé', seuil: seuil_(), tests: Object.keys(dern).map(function (k) { return dern[k]; }), certificats: certs_(ap2.em).filter(function (c) { return c.st === 'valide'; }).map(function (c) { return { no: c.no, date: c.date, niveau: c.niveau, type: c.type, score: c.score }; }), formateur: fm });
    }
    if (a === 'formateurDemande') { // test de formateur du niveau N : il faut les certificats élève N et N+1
      var af = auth_(b, 'p'); if (!af.u) return rep_({ ok: true, etat: af.etat });
      var nf = Math.round(num_(b.niveau) || 0); if (!(nf >= 1 && nf <= 4)) return rep_({ ok: false, erreur: 'Le test de formateur existe pour les niveaux 1 à 4.' });
      if (!aCert_(af.em, nf, 'eleve')) return rep_({ ok: false, erreur: 'Il te faut le certificat du niveau ' + nf + '.' });
      if (!aCert_(af.em, nf + 1, 'eleve')) return rep_({ ok: false, erreur: 'Il te faut aussi le certificat du niveau ' + (nf + 1) + ' pour passer le test de formateur du niveau ' + nf + '.' });
      var ex = formateurs_(af.em).filter(function (x) { return x.niveau === nf; })[0], shf = feuille_('Formateurs');
      if (ex && ex.st === 'ok') return rep_({ ok: true, etat: 'validé', statut: 'ok' });
      if (ex && ex.st === 'demandé') return rep_({ ok: true, etat: 'validé', statut: 'demandé' });
      if (ex) shf.getRange(ex.l, 1, 1, 6).setValues([[new Date(), af.em, nf, 'demandé', iso_(''), '']]); else shf.appendRow([new Date(), af.em, nf, 'demandé', iso_(''), '']);
      journal_('Test de formateur demandé : ' + af.em + ' · niveau ' + nf);
      return rep_({ ok: true, etat: 'validé', statut: 'demandé' });
    }
    if (a === 'certVerif') { // public : vérifier un numéro de certificat (prénom et initiale seulement)
      var cv = certs_('').filter(function (c) { return c.no === String(b.no || '').trim().toUpperCase(); })[0];
      if (!cv) return rep_({ ok: true, valide: false });
      var pn = cv.nom.split(' '); return rep_({ ok: true, valide: cv.st === 'valide', niveau: cv.niveau, type: cv.type, date: cv.date, nom: pn[0] + (pn[1] ? ' ' + pn[1].charAt(0) + '.' : '') });
    }
    if (a === 'testsListe' || a === 'certListe' || a === 'formateurListe' || a === 'eleves') { // console : lectures
      var qc = qui_(b); if (!qc) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qc, 'voir')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de voir les comptes.' });
      if (a === 'testsListe') return rep_({ ok: true, seuil: seuil_(), tests: lignes_('Tests', 9).map(function (r) { return { date: jour_(r[0]), em: String(r[1]).toLowerCase(), niveau: Number(r[2]), score: Number(r[3]), moy: Number(r[4]), onglets: Number(r[5]), delais: Number(r[6]), st: String(r[7]), no: String(r[8]) }; }).reverse() });
      if (a === 'certListe') return rep_({ ok: true, certificats: certs_('').map(function (c) { return { no: c.no, date: c.date, em: c.em, nom: c.nom, niveau: c.niveau, type: c.type, score: c.score, st: c.st, par: c.par }; }).reverse() });
      if (a === 'formateurListe') return rep_({ ok: true, demandes: formateurs_('').map(function (x) { return { em: x.em, niveau: x.niveau, st: x.st, dem: x.dem, par: x.par }; }).reverse() });
      var shE = feuille_('Comptes'), nE = shE.getLastRow(), dE = nE > 1 ? shE.getRange(2, 1, nE - 1, NCOL).getValues() : [], agE = agregat_(), prE = {}, ceE = {}, foE = {};
      lireProgres_('').forEach(function (p) { prE[p.em] = (prE[p.em] || 0) + 1; });
      certs_('').forEach(function (c) { if (c.st === 'valide') (ceE[c.em] = ceE[c.em] || []).push(c.type === 'formateur' ? 'F' + c.niveau : String(c.niveau)); });
      return rep_({ ok: true, eleves: dE.filter(function (v) { return String(v[C.role] || '').toLowerCase().indexOf('formateur') < 0 || true; }).map(function (v) {
        var e = String(v[C.mail]).toLowerCase(), l = lieuLire_(v), g = agE[e] || { n: 0, der: '' };
        return { nom: String(v[C.pre]) + ' ' + String(v[C.nom]), email: e, role: String(v[C.role] || ''), etat: etat_(v), pays: l.pays, ville: l.ville, quartier: l.quartier, test: estTest_(v), lecons: prE[e] || 0, seances: g.n, der: g.der, certs: ceE[e] || [] }; }) });
    }
    if (a === 'certRevoquer' || a === 'certEmettre' || a === 'formateurDecide') { // console : décisions (droit « valider »)
      var qd = qui_(b); if (!qd) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qd, 'valider')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de valider.' });
      var ed = String(b.email || '').trim().toLowerCase(), ud = ed ? trouver_(C.mail, ed) : null;
      if (a === 'certRevoquer') {
        var cr = certs_('').filter(function (c) { return c.no === String(b.no || ''); })[0]; if (!cr) return rep_({ ok: false, erreur: 'Certificat introuvable.' });
        feuille_('Certificats').getRange(cr.l, 8).setValue('révoqué'); journal_('Certificat révoqué : ' + cr.no + ' ↳ fait par ' + qd.nom); return rep_({ ok: true });
      }
      if (!ud) return rep_({ ok: false, erreur: 'Compte introuvable.' });
      var nd = Math.round(num_(b.niveau) || 0); if (!(nd >= 1 && nd <= 5)) return rep_({ ok: false, erreur: 'Niveau inconnu.' });
      if (a === 'certEmettre') { // pour un test « à vérifier » ou un cas à régler à la main
        if (aCert_(ed, nd, 'eleve')) return rep_({ ok: false, erreur: 'Cet élève a déjà ce certificat.' });
        if (nd > 1 && !aCert_(ed, nd - 1, 'eleve')) return rep_({ ok: false, erreur: 'Il lui faut d’abord le certificat du niveau ' + (nd - 1) + '.' });
        var nn = emettre_(ed, nomDe_(ud).trim(), nd, 'eleve', Math.round(num_(b.score) || 0), qd.nom);
        var shT = feuille_('Tests'), dT = lignes_('Tests', 9); for (var k = dT.length - 1; k >= 0; k--) if (String(dT[k][1]).toLowerCase() === ed && Number(dT[k][2]) === nd && String(dT[k][7]) === 'à vérifier') { shT.getRange(k + 2, 8, 1, 2).setValues([['validé', nn]]); break; }
        return rep_({ ok: true, no: nn });
      }
      var dm = formateurs_(ed).filter(function (x) { return x.niveau === nd; })[0]; if (!dm || dm.st !== 'demandé') return rep_({ ok: false, erreur: 'Aucune demande en attente.' });
      var dec = b.decision === 'ok' ? 'ok' : 'refus';
      if (dec === 'ok' && !(aCert_(ed, nd, 'eleve') && aCert_(ed, nd + 1, 'eleve'))) return rep_({ ok: false, erreur: 'Les certificats des niveaux ' + nd + ' et ' + (nd + 1) + ' ne sont plus tous valides.' });
      feuille_('Formateurs').getRange(dm.l, 1, 1, 6).setValues([[new Date(), ed, nd, dec, dm.dem, qd.nom]]);
      var nof = dec === 'ok' ? emettre_(ed, nomDe_(ud).trim(), nd, 'formateur', 0, qd.nom) : '';
      journal_('Test de formateur ' + dec + ' : ' + ed + ' · niveau ' + nd + ' ↳ fait par ' + qd.nom);
      return rep_({ ok: true, no: nof });
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
    if (a === 'comptaSet' || a === 'comptaDel' || a === 'tarifsSet' || a === 'comptaEffacerTest') {
      var qf = qui_(b); if (!qf) return rep_({ ok: false, erreur: 'Clé invalide' });
      if (!peut_(qf, 'finances')) return rep_({ ok: false, erreur: 'Tu n’as pas le droit de modifier les finances.' });
      if (a === 'comptaEffacerTest') { if (!qf.owner) return rep_({ ok: false, erreur: 'Réservé au propriétaire.' }); var kt = effacerTestCompta_(); journal_('Compta : ' + kt + ' ligne(s) de test effacée(s) ↳ fait par ' + qf.nom); return rep_({ ok: true, effaces: kt }); }
      if (a === 'comptaDel') { var kd = effacerCompta_(String(b.id || '')); journal_('Compta : ligne effacée ' + b.id + ' ↳ fait par ' + qf.nom); return rep_({ ok: true, effaces: kd }); }
      if (a === 'tarifsSet') {
        var pr = (Array.isArray(b.prix) ? b.prix : []).slice(0, 6).map(function (x) { return Math.max(0, Math.round(Number(x) || 0)); }); while (pr.length < 6) pr.push(0); pr[0] = 0;
        PropertiesService.getScriptProperties().setProperty('TARIFS', JSON.stringify({ prix: pr, pay: cut_(b.pay, 400) }));
        journal_('Tarifs modifiés ↳ fait par ' + qf.nom); return rep_({ ok: true, tarifs: tarifs_() });
      }
      if (b.test && !qf.owner) return rep_({ ok: false, erreur: 'Le mode test est réservé au propriétaire.' });
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
