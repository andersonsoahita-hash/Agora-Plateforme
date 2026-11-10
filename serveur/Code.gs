/* Agora Plateforme · serveur des comptes (Google Apps Script) — by Stephen
   À coller dans Extensions > Apps Script du Google Sheet de la plateforme. */

var APP_URL = 'https://andersonsoahita-hash.github.io/Agora-Plateforme/plateforme/'; // adresse de la plateforme
var FEUILLES = {
  comptes: ['Date', 'Nom', 'Prénoms', 'Email', 'Téléphone', 'Âge', 'Rôle', 'Pays', 'Situation', 'Projet', 'Statut', 'Code d’activation', 'Expire le', 'Dernière connexion', 'Ordinateur', 'Téléphone (appli)', 'Mot de passe (empreinte)', 'Session'],
  journal: ['Date', 'Action']
};
var C = { date: 0, nom: 1, pre: 2, mail: 3, tel: 4, age: 5, role: 6, pays: 7, sit: 8, proj: 9, st: 10, code: 11, exp: 12, last: 13, pc: 14, mob: 15, pw: 16, tok: 17 };
var NCOL = 18;

function feuille_(nom) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(nom);
  if (!sh) { sh = ss.insertSheet(nom); sh.appendRow(FEUILLES[nom.toLowerCase()]); sh.setFrozenRows(1); }
  if (nom === 'Comptes') sh.getRange(1, 1, 1, NCOL).setValues([FEUILLES.comptes]);
  return sh;
}
function installer() { // à lancer une fois
  ['Comptes', 'Journal'].forEach(feuille_);
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feuille 1'); if (s && s.getLastRow() === 0) s.setName('Notes');
  if (!PropertiesService.getScriptProperties().getProperty('CLE_ADMIN')) PropertiesService.getScriptProperties().setProperty('CLE_ADMIN', Utilities.getUuid());
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
    .addSeparator().addItem('Afficher ma clé admin', 'montrerCle').addToUi();
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
function montrerCle() { SpreadsheetApp.getUi().alert('Clé admin (pour la page des accès) :\n' + PropertiesService.getScriptProperties().getProperty('CLE_ADMIN')); }

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

/* ---------- actions admin ---------- */
function agir_(op, email, date) {
  var t = trouver_(C.mail, email); if (!t) return { ok: false, erreur: 'Compte introuvable' };
  var v = t.v;
  if (op === 'valider') { // (re)donne un code à usage unique et remet le compte à zéro
    var code = code_();
    set_(t, C.st, 'validé'); set_(t, C.code, code); set_(t, C.pc, ''); set_(t, C.mob, ''); set_(t, C.pw, ''); set_(t, C.tok, '');
    MailApp.sendEmail({ to: v[C.mail], subject: 'Ton code d’accès Agora',
      body: 'Bonjour ' + v[C.pre] + ',\n\nTa demande est validée.\n\n1. Ouvre la plateforme sur ton ordinateur (ajoute-la au Dock ou aux favoris avant de créer ton compte) :\n' + APP_URL + '\n2. Clique sur « Se connecter », puis « J’ai un code d’activation ». Entre ton e-mail et ce code :\n\n      ' + code + '\n\n3. Crée ton mot de passe. Il te servira à te reconnecter.\n\nUn seul ordinateur par compte, et un seul téléphone pour l’application. Ce code ne marche qu’une seule fois : ne le partage pas.\n\nStephen' });
    journal_('Code d’activation envoyé à ' + v[C.mail]);
  } else if (op === 'bloquer') { set_(t, C.st, 'bloqué'); journal_('Bloqué : ' + v[C.mail]); }
  else if (op === 'debloquer') { set_(t, C.st, 'validé'); journal_('Débloqué : ' + v[C.mail]); }
  else if (op === 'supprimer') { set_(t, C.st, 'supprimé'); [C.code, C.pc, C.mob, C.pw, C.tok].forEach(function (c) { set_(t, c, ''); }); journal_('Supprimé : ' + v[C.mail]); }
  else if (op === 'appareil') { set_(t, C.pc, ''); set_(t, C.tok, ''); journal_('Ordinateur réinitialisé : ' + v[C.mail]); }
  else if (op === 'mobile') { set_(t, C.mob, ''); journal_('Téléphone réinitialisé : ' + v[C.mail]); }
  else if (op === 'expire') { set_(t, C.exp, date || ''); journal_('Fin d’accès ' + (date || 'retirée') + ' : ' + v[C.mail]); }
  else if (op === 'effacer') { t.sh.deleteRow(t.r); journal_('Compte effacé définitivement : ' + v[C.mail]); }
  else return { ok: false, erreur: 'Action inconnue' };
  return { ok: true };
}

/* ---------- API ---------- */
function admin_(b) { return b.cle === PropertiesService.getScriptProperties().getProperty('CLE_ADMIN'); }
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
      if (ex) ex.sh.deleteRow(ex.r);
      var role = String(b.role || '').toLowerCase().indexOf('form') === 0 ? 'formateur' : 'élève';
      feuille_('Comptes').appendRow([new Date(), b.nom, b.prenoms, em, b.tel || '', b.age || '', role, b.pays || '', b.situation || '', String(b.projet || '').slice(0, 500), 'en attente', '', '', '', '', '', '', '']);
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

    if (a === 'etat') {
      var u = trouver_(C.mail, em);
      if (!u) return rep_({ ok: true, etat: 'inconnu' });
      var et = etat_(u.v);
      if (et === 'validé') {
        if (!u.v[C.tok] || u.v[C.tok] !== b.jeton || (u.v[C.pc] && u.v[C.pc] !== b.appareil)) return rep_({ ok: true, etat: 'session' });
        set_(u, C.last, new Date());
      }
      var r3 = profil_(u.v); r3.ok = true; r3.etat = et; return rep_(r3);
    }

    if (a === 'liste') {
      if (!admin_(b)) return rep_({ ok: false, erreur: 'Clé invalide' });
      var sh = feuille_('Comptes'), n = sh.getLastRow(), d = n > 1 ? sh.getRange(2, 1, n - 1, NCOL).getValues() : [];
      var sj = feuille_('Journal'), nj = sj.getLastRow(), dj = nj > 1 ? sj.getRange(Math.max(2, nj - 39), 1, Math.min(40, nj - 1), 2).getValues() : [];
      return rep_({ ok: true, journal: dj,
        comptes: d.map(function (x) { return { nom: x[C.nom] + ' ' + x[C.pre], email: x[C.mail], tel: x[C.tel], age: x[C.age], role: x[C.role], pays: x[C.pays], situation: x[C.sit], projet: x[C.proj], demande: x[C.date], statut: etat_(x), derniere: x[C.last], expire: x[C.exp], pc: !!x[C.pc], mob: !!x[C.mob], active: !!x[C.pw], code: !!x[C.code] }; }) });
    }

    if (a === 'admin') {
      if (!admin_(b)) return rep_({ ok: false, erreur: 'Clé invalide' });
      return rep_(agir_(b.op, em, b.date));
    }
    return rep_({ ok: false, erreur: 'Action inconnue' });
  } catch (err) { return rep_({ ok: false, erreur: String(err) }); }
  finally { lock.releaseLock(); }
}
function doGet() { return rep_({ ok: true, service: 'Agora Plateforme' }); }
