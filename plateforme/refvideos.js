/* Vidéos d'exemple affichées dans le rapport d'analyse (lues dans l'appli, en ligne seulement).
   Pour en ajouter : colle le lien YouTube (avec le moment de départ, ex. ?t=95 ou &t=1m35s), un titre,
   et la durée voulue en secondes (d). Une même difficulté peut avoir plusieurs exemples.
   Clés = type de moment relevé par l'analyse :
   cachees (mains cachées) · basses (bras ballants) · croises (bras croisés) · regard-bas (tête baissée)
   regard-cote (tête de côté) · balancement · deplacement · contact (main sur le visage/corps) · contradiction
   Exemple : cachees:[{u:'https://youtu.be/XXXXXXXXXXX?t=95',t:'Des mains qui accompagnent le propos',d:30}] */
/* Liens ajoutés sans avoir été regardés : ils démarrent au début de la vidéo. Pour viser le bon geste, ajoute ?t=SECONDES au lien. */
window.AGREF={
  'cachees':[{u:'https://youtu.be/4cXEZq9PbMs',t:'Allan Pease · Montrer ses mains (TEDx)',d:45},{u:'https://youtu.be/mYD7Y9CXeUw',t:'Jill Bolte Taylor · des mains qui accompagnent le récit',d:45}],
  'basses':[{u:'https://youtu.be/4cXEZq9PbMs',t:'Allan Pease · gestes à hauteur de poitrine (TEDx)',d:45}],
  'croises':[{u:'https://youtu.be/e_R60Z7t2ps',t:'Allan Pease · Closed body language',d:45}],
  'regard-bas':[{u:'https://youtu.be/eWynt87PaJ0',t:'Barack Obama · la tête haute (convention 2004)',d:45}],
  'regard-cote':[{u:'https://youtu.be/f6YgiwMr0JU',t:'Ken Robinson · il regarde la salle',d:45}],
  'balancement':[],
  'deplacement':[],
  'contact':[{u:'https://youtu.be/f6YgiwMr0JU',t:'Ken Robinson · posture calme, gestes naturels',d:45}],
  'contradiction':[{u:'https://youtu.be/eIho2S0ZahI',t:'Julian Treasure · voix, rythme et silences',d:45}]
};
window.AGREF_play=function(x){if(x&&/^https:\/\/embed\.ted\.com\//.test(x.u||''))return x.u;
  var m=String(x.u||'').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);if(!m)return '';
  var t=String(x.u).match(/[?&#](?:t|start)=([0-9hms]+)/),s=0;
  if(t){var q=t[1],h=q.match(/(\d+)h/),mi=q.match(/(\d+)m/),se=q.match(/(\d+)s/);s=(h||mi||se)?((h?+h[1]*3600:0)+(mi?+mi[1]*60:0)+(se?+se[1]:0)):(+q||0)}
  return 'https://www.youtube-nocookie.com/embed/'+m[1]+'?rel=0&modestbranding=1&playsinline=1&autoplay=1&start='+s+(x.d?'&end='+(s+(+x.d)):'');
};

/* Vidéos « comment faire » : une par type d'exercice, lues dans l'appli (en ligne). TED : lecteur officiel, sous-titres français. */
window.AGREF_EX={
  argumenter:[{u:'https://embed.ted.com/talks/lang/fr/simon_sinek_how_great_leaders_inspire_action',t:'Simon Sinek · Convaincre en partant du pourquoi (TED)'}],
  recit:[{u:'https://embed.ted.com/talks/lang/fr/andrew_stanton_the_clues_to_a_great_story',t:'Andrew Stanton · Les indices d’une grande histoire (TED)'}],
  fetiche:[{u:'https://embed.ted.com/talks/lang/fr/andrew_stanton_the_clues_to_a_great_story',t:'Andrew Stanton · Les indices d’une grande histoire (TED)'}],
  discours:[{u:'https://embed.ted.com/talks/lang/fr/chris_anderson_teds_secret_to_great_public_speaking',t:'Chris Anderson · Le secret d’une grande prise de parole (TED)'}],
  aveu:[{u:'https://embed.ted.com/talks/lang/fr/brene_brown_the_power_of_vulnerability',t:'Brené Brown · Le pouvoir de la vulnérabilité (TED)'}]
};
window.AGREF_howBtn=function(type){return (window.AGREF_EX&&(AGREF_EX[type]||[]).length)?'<button type="button" class="btn ghost" data-howto="'+type+'" style="margin:8px 0">▶ Voir comment faire cet exercice</button>':''};
(function(){
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-howto]');if(!b)return;e.preventDefault();e.stopPropagation();
    var L=(window.AGREF_EX&&AGREF_EX[b.getAttribute('data-howto')])||[];if(!L.length)return;var n=0,m=document.getElementById('howm');if(m)m.remove();
    m=document.createElement('div');m.id='howm';m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,6,5,.88);display:flex;align-items:center;justify-content:center;padding:16px';document.body.appendChild(m);
    function draw(){var x=L[n];m.innerHTML='<div style="width:min(760px,100%);background:#1b1210;border:1px solid rgba(199,151,70,.4);border-radius:16px;padding:14px;color:#fff;font-family:inherit"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><b>'+esc(x.t)+'</b><button type="button" id="howx" aria-label="Fermer" style="border:1px solid rgba(255,255,255,.3);background:none;color:#fff;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer">✕</button></div>'+(navigator.onLine?'<div style="position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000"><iframe src="'+AGREF_play(x)+'" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>':'<p>Connecte-toi à internet pour voir cette vidéo.</p>')+(L.length>1?'<button type="button" id="hown" style="margin-top:10px;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;border-radius:10px;padding:10px 14px;font:inherit;cursor:pointer">Autre vidéo ('+(n+1)+'/'+L.length+')</button>':'')+'</div>';
      m.querySelector('#howx').onclick=function(){m.remove()};var nb=m.querySelector('#hown');if(nb)nb.onclick=function(){n=(n+1)%L.length;draw()}}
    draw();m.onclick=function(ev){if(ev.target===m)m.remove()}},true);
})();
