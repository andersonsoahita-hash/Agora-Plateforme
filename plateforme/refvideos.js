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
window.AGREF_play=function(x){
  var m=String(x.u||'').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);if(!m)return '';
  var t=String(x.u).match(/[?&#](?:t|start)=([0-9hms]+)/),s=0;
  if(t){var q=t[1],h=q.match(/(\d+)h/),mi=q.match(/(\d+)m/),se=q.match(/(\d+)s/);s=(h||mi||se)?((h?+h[1]*3600:0)+(mi?+mi[1]*60:0)+(se?+se[1]:0)):(+q||0)}
  return 'https://www.youtube-nocookie.com/embed/'+m[1]+'?rel=0&modestbranding=1&playsinline=1&autoplay=1&start='+s+(x.d?'&end='+(s+(+x.d)):'');
};
