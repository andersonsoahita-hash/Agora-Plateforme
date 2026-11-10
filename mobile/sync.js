/* ---------- compte Agora : liaison avec la plateforme et synchronisation des séances — by Stephen ----------
   Ce fichier est inséré par build.js à l'intérieur de l'application (il voit S, D, st, view, render, toast…).
   Rien n'est envoyé tant que le téléphone n'est pas lié. L'audio ne quitte jamais le téléphone :
   seuls partent la date, le sujet, la durée, les résultats et le TEXTE transcrit de chaque séance. */
var SRV = 'https://script.google.com/macros/s/AKfycbwFkSJld9L17j4QCa8dH3wxFkfUDSXY6k9r3I5e0ZqARdDjRZP0LT0dRLIACaofe5qT/exec';
var ERRG = 'Une erreur est survenue. Veuillez vous reconnecter. Si le problème persiste, prévenez votre administrateur.';
var sy = { lk: null, q: [], sending: false, last: 0, data: null, loading: false, gate: null, busy: false, confirm: false, err: '', offline: false };

(function syLoad() {
  try { sy.lk = JSON.parse(lsGet('ao_lk') || 'null'); } catch (e) { sy.lk = null; }
  try { sy.q = JSON.parse(lsGet('ao_q') || '[]'); if (!Array.isArray(sy.q)) sy.q = []; } catch (e) { sy.q = []; }
})();
function sySave() { lsSet('ao_lk', JSON.stringify(sy.lk || null)); lsSet('ao_q', JSON.stringify(sy.q.slice(-100))); }
function syDev() {
  var d = lsGet('ao_dev');
  if (!d) { d = 't' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); lsSet('ao_dev', d); }
  return d;
}
function syLinked() { return !!(sy.lk && sy.lk.t && sy.lk.e); }
function syCall(o) {
  var ctl = window.AbortController ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, 25000) : null;
  return fetch(SRV, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(o), signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (tm) clearTimeout(tm); return r.json(); }, function (e) { if (tm) clearTimeout(tm); throw e; });
}
function syAuth(o) { o.email = sy.lk.e; o.jeton = sy.lk.t; o.appareil = syDev(); o.canal = 'm'; return o; }
function syHello() { return syLinked() && sy.lk.p ? ', ' + esc(String(sy.lk.p).split(/\s+/)[0]) : ''; }
function syFull() { return syLinked() ? esc(((sy.lk.p || '') + ' ' + (sy.lk.n || '')).trim() || sy.lk.e) : ''; }
function syAgo(ts) {
  if (!ts) return 'jamais';
  var s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? 'à l’instant' : s < 3600 ? 'il y a ' + Math.round(s / 60) + ' min' : s < 86400 ? 'il y a ' + Math.round(s / 3600) + ' h' : fmtDay(ts);
}
function syNum(x) { return x == null || x === '' || isNaN(+x) ? null : +x; }

/* ce qui part pour une séance (jamais l'audio) */
function syPayload(r) {
  var t = r.txt || {}, a = r.sig || {}, p = r.pil || {}, ty = byId(D.exerciseTypes, r.type);
  return { id: r.id, date: r.date, sujet: r.sujet || '', type: r.type || '', typeNom: ty ? ty.nom : (r.type || ''), dur: syNum(r.dur),
    mots: syNum(t.words), wpm: syNum(t.wpm), tics: t.fillers ? syNum(t.fillers.total) : null,
    logos: syNum(p.logos), ethos: syNum(p.ethos), pathos: syNum(p.pathos),
    transcript: String(r.transcript || '').slice(0, 30000),
    detail: { tics100: t.fillers ? t.fillers.per100 : null, connecteurs: t.connectors ? t.connectors.total : null, preuves: t.evidence ? t.evidence.total : null, plan: !!t.planAnnounced, questions: t.questions != null ? t.questions : null,
      voix: a && a.ok !== false && a.pitch ? { hauteurSd: a.pitch.sdSemitones, debit: a.rhythm && a.rhythm.syllPerSec, pauses: a.pauses && a.pauses.count, parole: a.speechSec } : null } };
}
function syQueue(r) {
  if (!syLinked() || !r || !r.id) return;
  sy.q = sy.q.filter(function (x) { return x.id !== r.id; }); sy.q.push(syPayload(r)); sySave(); syFlush(); syPaint();
}
function syPending(id) { for (var i = 0; i < sy.q.length; i++) if (sy.q[i].id === id) return true; return false; }

/* envoi (reprend tout seul si le réseau revient) */
function syFlush() {
  if (!syLinked() || sy.sending || !sy.q.length || navigator.onLine === false) return Promise.resolve();
  sy.sending = true;
  var batch = sy.q.slice(0, 8), ids = batch.map(function (x) { return x.id; });
  return syCall(syAuth({ action: 'seance', seances: batch })).then(function (r) {
    sy.sending = false;
    if (r && r.ok && r.etat === 'validé') {
      sy.q = sy.q.filter(function (x) { return ids.indexOf(x.id) < 0; }); sy.last = Date.now(); sy.err = ''; sy.offline = false; sySave();
      if (sy.q.length) syFlush(); else syAvanc(true);
    } else if (r && r.etat) syState(r.etat);
    else sy.err = (r && r.erreur) || ERRG;
    syPaint();
  }).catch(function () { sy.sending = false; sy.offline = true; syPaint(); });
}

/* l'état du compte : blocage, suppression, téléphone libéré… */
function syCheck() {
  if (!syLinked() || document.visibilityState === 'hidden' || navigator.onLine === false) return;
  syCall(syAuth({ action: 'etat' })).then(function (r) {
    if (!r || !r.ok) return;
    if (r.etat === 'validé') { if (r.prenoms && sy.lk.p !== r.prenoms) { sy.lk.p = r.prenoms; sy.lk.n = r.nom || sy.lk.n; sySave(); if (view.tab === 'home') render(); } syState('validé'); syFlush(); }
    else syState(r.etat);
  }).catch(function () {});
}
function syState(etat) {
  if (etat === 'validé') { if (sy.gate) { sy.gate = null; syGateDraw(); toast('Accès rétabli'); render(); } return; }
  var g = (etat === 'bloqué' || etat === 'expiré' || etat === 'en attente') ? 'wait' : 'relink';
  if (g === 'relink' && syLinked()) { sy.lk.t = ''; sySave(); } /* on garde les données de l'appli, seule la clé tombe */
  sy.gate = g; syGateDraw();
}
function syGateDraw() {
  var d = byIdEl('syGate');
  if (!sy.gate) { if (d && d.parentNode) d.parentNode.removeChild(d); return; }
  if (!d) { d = document.createElement('div'); d.id = 'syGate'; d.className = 'lock'; d.setAttribute('role', 'alertdialog'); document.body.appendChild(d); }
  var key = sy.gate; if (d.getAttribute('data-g') === key) return; d.setAttribute('data-g', key);
  var h = '<div class="lockbox"><h2>Une erreur est survenue</h2><p>Veuillez vous reconnecter. Si le problème persiste, prévenez votre administrateur.</p>';
  if (key === 'relink') {
    h += '<p class="small muted">Sur la plateforme : Mon compte, puis « Activer mon application ». Un code s’affiche : saisis-le ici.</p><div class="stack" style="text-align:left"><input type="text" id="syGateCode" class="sy-code" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" aria-label="Code de liaison"><button class="btn" id="syGateGo" type="button">Me reconnecter</button><p class="callout" id="syGateErr" hidden></p></div>';
  } else h += '<p class="small muted">Nouvelle tentative automatique, tu n’as rien à faire.</p>';
  h += '<p class="small muted">Tes données restent sur ton téléphone.</p></div>';
  d.innerHTML = h;
  var go = byIdEl('syGateGo');
  if (go) go.onclick = function () { syLink(byIdEl('syGateCode').value, false, go, byIdEl('syGateErr')); };
}

/* liaison par code (donné sur la plateforme) */
function syLink(code, backfill, btn, errEl) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function fail(t) { if (errEl) { errEl.hidden = false; errEl.textContent = t; } if (btn) btn.disabled = false; sy.busy = false; }
  if (code.length < 8) { fail('Saisis le code à 8 caractères affiché sur la plateforme.'); return; }
  if (sy.busy) return; sy.busy = true; if (btn) btn.disabled = true; if (errEl) errEl.hidden = true;
  syCall({ action: 'lier', code: code, appareil: syDev() }).then(function (r) {
    sy.busy = false;
    if (!r || !r.ok || !r.jeton) { fail((r && r.erreur) || ERRG); return; }
    sy.lk = { e: r.email, p: r.prenoms || '', n: r.nom || '', r: r.role || '', t: r.jeton }; sy.gate = null; syGateDraw();
    if (backfill) S.sessions.slice(0, 30).forEach(function (x) { sy.q = sy.q.filter(function (y) { return y.id !== x.id; }); sy.q.push(syPayload(x)); });
    sySave(); toast('Compte relié', true); syFlush(); syAvanc(true); render();
  }).catch(function () { fail('Connexion impossible. Vérifie ton réseau et réessaie.'); });
}

/* avancement lu sur le serveur (le même que sur la plateforme) */
function syAvanc(silent) {
  if (!syLinked() || sy.loading || navigator.onLine === false) return;
  sy.loading = true;
  syCall(syAuth({ action: 'avancement' })).then(function (r) {
    sy.loading = false;
    if (r && r.ok && r.etat === 'validé') { sy.data = r; sy.err = ''; sy.last = sy.last || Date.now(); if (view.tab === 'sync') syRedraw(); }
    else if (r && r.etat) syState(r.etat);
    else if (!silent) sy.err = (r && r.erreur) || ERRG;
    if (view.tab === 'sync') syRedraw();
  }).catch(function () { sy.loading = false; });
}
function syRedraw() { var a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return; if (view.tab === 'sync') render(); }

/* petits morceaux d'écran qui se mettent à jour sur place */
function syStatus() {
  return sy.q.length ? sy.q.length + ' séance' + (sy.q.length > 1 ? 's' : '') + ' à envoyer' + (sy.offline || navigator.onLine === false ? ' (hors ligne, ça partira tout seul)' : '') : 'Tout est synchronisé · ' + syAgo(sy.last);
}
function syPaint() {
  var b = byIdEl('syBan'); if (b) b.textContent = syStatus();
  var r = byIdEl('syRes'); if (r && r.getAttribute('data-id')) r.innerHTML = syResLine(r.getAttribute('data-id'));
  var s = byIdEl('syStat'); if (s) s.textContent = syStatus();
}
function syResLine(id) { return syPending(id) ? 'Envoi vers ton avancement… (ça partira tout seul dès que le réseau revient)' : 'Séance ajoutée à ton avancement, visible aussi sur la plateforme.'; }
function syResultHtml(s) { return syLinked() ? '<div class="callout info small" id="syRes" data-id="' + esc(s.id) + '">' + syResLine(s.id) + '</div>' : ''; }
function syBanner() {
  if (syLinked()) return '<button class="card tap banner" data-act="sync-open"><div class="eyebrow">Compte relié · ' + syFull() + '</div><h3>Mon avancement</h3><p class="muted small" id="syBan" style="margin:4px 0 0">' + esc(syStatus()) + '</p></button>';
  if (lsGet('ao_sy_hide') === '1') return '';
  return '<div class="card banner"><b>Relier mon compte Agora</b><p class="muted small" style="margin:4px 0 8px">Tes séances, avec le texte de ce que tu as dit, apparaissent dans ton avancement sur la plateforme.</p><div class="row"><button class="btn small" data-act="sync-open">Relier</button><button class="btn small ghost" data-act="sync-hide">Plus tard</button></div></div>';
}
function sySettingsHtml() {
  return '<div class="card stack"><h3>Compte Agora</h3>' + (syLinked()
    ? '<p class="small" style="margin:0">Relié à <b>' + syFull() + '</b>. ' + esc(syStatus()) + '</p><button class="btn small" style="align-self:flex-start" data-act="sync-open">Ouvrir mon compte et mon avancement</button>'
    : '<p class="muted small" style="margin:0">Relie ce téléphone à ton compte de la plateforme pour retrouver tes séances (avec leur transcription) dans ton avancement.</p><button class="btn small" style="align-self:flex-start" data-act="sync-open">Relier mon compte</button>') + '</div>';
}
function syPriv() { return syLinked() ? 'Ton compte Agora est relié : pour chaque séance, la date, le sujet, tes résultats et le texte transcrit sont envoyés à ton avancement. L’audio ne quitte pas ton téléphone.' : 'Rien n’est envoyé sur internet tant que tu ne relies pas ton compte Agora.'; }

/* écran « Mon compte » */
function ssc(x) { return x == null || x === '' ? '–' : x; }
function vSync() {
  var h = '<div class="top"><div><div class="eyebrow">Agora · by Stephen</div><h1>Mon compte</h1></div><button class="btn small ghost" data-act="sync-back">Fermer</button></div><div class="stack">';
  if (!syLinked()) {
    h += '<div class="card stack"><h3>Relier ce téléphone à ton compte</h3><p class="small" style="margin:0">1. Sur la plateforme, ouvre <b>Mon compte</b> puis appuie sur <b>Activer mon application</b>.<br>2. Un code de 8 caractères s’affiche (valable 10 minutes).<br>3. Saisis-le ici.</p>';
    h += '<input type="text" id="syCode" class="sy-code" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" aria-label="Code de liaison">';
    h += '<label class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:10px"><input type="checkbox" id="syBack" checked style="margin-top:4px"><span class="small">Envoyer aussi mes séances déjà faites' + (S.sessions.length ? ' (' + Math.min(30, S.sessions.length) + ')' : '') + '</span></label>';
    h += '<button class="btn" id="syGo" type="button" data-act="sync-link">Relier mon compte</button><p class="callout" id="syErr" hidden></p></div>';
    h += '<div class="card"><h3>Ce qui est envoyé</h3><p class="muted small" style="margin:0">Pour chaque séance : la date, le sujet, la durée, tes résultats et le <b>texte transcrit</b>. Ton audio reste sur ton téléphone. Ces informations sont visibles par toi et par l’équipe Agora qui t’accompagne. Un seul téléphone par compte.</p></div>';
    return h + '</div>';
  }
  var d = sy.data, bi = d && d.bilan;
  h += '<div class="card stack"><div><div class="eyebrow">Compte relié</div><h3>' + syFull() + '</h3><p class="muted small" style="margin:2px 0 0;overflow-wrap:anywhere">' + esc(sy.lk.e) + '</p></div>';
  h += '<p class="small" style="margin:0" id="syStat">' + esc(syStatus()) + '</p>' + (sy.err ? '<p class="callout">' + esc(ERRG) + '</p>' : '');
  h += '<div class="row"><button class="btn small" data-act="sync-flush">Envoyer maintenant</button><button class="btn small ghost" data-act="sync-refresh">Actualiser</button></div></div>';
  h += '<div class="card stack"><h3>Transcription automatique</h3><label class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:10px"><input type="checkbox" data-act="sr-toggle"' + (S.set && S.set.sr ? ' checked' : '') + (SR_API ? '' : ' disabled') + ' style="margin-top:4px"><span class="small"><b>Transcrire ma voix pendant l’enregistrement</b><br><span class="muted">Le texte part ensuite dans ton avancement, sur le téléphone et sur la plateforme. ' + (SR_API ? 'Elle utilise le service de reconnaissance vocale de ton navigateur, qui envoie le son à ses propres serveurs.' : 'Non disponible sur ce navigateur : utilise le micro du clavier dans la zone « Transcription » du Studio.') + '</span></span></label><p class="muted small" style="margin:0">Sur iPhone, dans l’appli installée, elle peut ne pas fonctionner : appuie alors sur le micro du clavier, dans la zone « Transcription » du Studio.</p></div>';
  h += '<div class="card stack"><h3>Mon avancement</h3>';
  if (!d) h += '<p class="muted small" style="margin:0">' + (sy.loading ? 'Chargement…' : 'Pas encore chargé. Appuie sur Actualiser.') + '</p>';
  else {
    h += '<div class="row" style="justify-content:space-around"><div class="pil"><b>' + bi.total + '</b><span class="small muted">séance' + (bi.total > 1 ? 's' : '') + '</span></div><div class="pil"><b>' + bi.jours + '</b><span class="small muted">jour' + (bi.jours > 1 ? 's' : '') + ' actif' + (bi.jours > 1 ? 's' : '') + '</span></div><div class="pil"><b>' + bi.mots + '</b><span class="small muted">mots dits</span></div></div>';
    h += d.seances.length ? d.seances.map(function (s) {
      return '<details class="sy-s"><summary><b>' + esc(s.sujet || 'Séance') + '</b><span class="small muted">' + esc(s.date) + ' · ' + esc(s.type || '') + (s.dur ? ' · ' + esc(durLabel(+s.dur)) : '') + (s.mots ? ' · ' + s.mots + ' mots' : '') + ' · Logos/Ethos/Pathos ' + ssc(s.logos) + '/' + ssc(s.ethos) + '/' + ssc(s.pathos) + '</span></summary>' + (s.transcript ? '<p class="sy-tx">' + esc(s.transcript) + '</p>' : '<p class="muted small" style="margin:8px 0 0">Pas de transcription pour cette séance.</p>') + '</details>';
    }).join('') : '<p class="muted small" style="margin:0">Aucune séance pour l’instant. Fais un exercice dans le Studio : il apparaîtra ici.</p>';
  }
  h += '</div>';
  h += '<div class="card stack"><h3>Ce téléphone</h3><p class="muted small" style="margin:0">Un seul téléphone par compte. Pour en changer, demande à ton administrateur de libérer celui-ci.</p><button class="btn small ghost" style="align-self:flex-start" data-act="sync-unlink">' + (sy.confirm ? 'Confirmer : quitter ce compte ici' : 'Quitter ce compte sur ce téléphone') + '</button></div>';
  return h + '</div>';
}

/* actions */
function syAct(act, v, el) {
  switch (act) {
    case 'sync-open': sy.confirm = false; go('sync'); syAvanc(false); return true;
    case 'sync-back': view = { tab: 'home', sub: null }; render(); window.scrollTo(0, 0); return true;
    case 'sync-hide': lsSet('ao_sy_hide', '1'); render(); return true;
    case 'sync-link': var c = byIdEl('syCode'), bk = byIdEl('syBack'); syLink(c ? c.value : '', !!(bk && bk.checked), el, byIdEl('syErr')); return true;
    case 'sync-flush': syFlush().then(function () { syAvanc(false); }); toast('Envoi en cours…'); return true;
    case 'sync-refresh': sy.err = ''; syCheck(); syFlush(); syAvanc(false); return true;
    case 'sync-unlink':
      if (!sy.confirm) { sy.confirm = true; render(); return true; }
      sy.confirm = false; sy.lk = null; sy.data = null; sy.gate = null; sySave(); syGateDraw(); toast('Compte quitté sur ce téléphone'); render(); return true;
  }
  return false;
}

/* démarrage : vérifie l'accès régulièrement, renvoie ce qui attend */
function syBoot() {
  function loop() { if (syLinked() || sy.gate === 'wait') syCheck(); setTimeout(loop, sy.gate === 'wait' ? 8000 : 15000); }
  setTimeout(loop, 1200);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { syCheck(); syFlush(); } });
  window.addEventListener('online', function () { sy.offline = false; syCheck(); syFlush(); syAvanc(true); syPaint(); });
  window.addEventListener('offline', function () { sy.offline = true; syPaint(); });
  setInterval(syPaint, 30000);
  if (syLinked()) { syFlush(); syAvanc(true); }
}
