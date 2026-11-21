const E=require('./engine.js');let fails=0;
const ok=(c,m)=>{console.log((c?'  OK  ':' FAIL ')+m);if(!c)fails++;};
const AS=9/16,ED=0.036,CX=.5,EY=.165;
function hand(cx,cy,ratio){const pw=ratio*ED/AS/1; // largeur de paume en x normalisé
  const L=Array.from({length:21},()=>({x:cx,y:cy,z:0}));L[5]={x:cx-pw/2,y:cy};L[17]={x:cx+pw/2,y:cy};L[9]={x:cx,y:cy};
  [4,8,12,16,20].forEach((i,k)=>{L[i]={x:cx+(k-2)*pw/8,y:cy-0.004*(k%2)}});L[0]={x:cx,y:cy+0.03};L[2]={x:cx-pw/3,y:cy+.01};
  [6,10,14,18].forEach(i=>{L[i]={x:cx,y:cy-.005}});return L;}
function pose(wl,wr){const L=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));const s=(i,x,y,v)=>L[i]={x:x,y:y,visibility:v==null?.99:v};
 const e=ED/AS;s(0,CX,EY+.01);s(2,CX-e*.25,EY);s(5,CX+e*.25,EY);s(7,CX-e/2,EY+.005);s(8,CX+e/2,EY+.005);s(9,CX-e*.1,EY+ED*.5);s(10,CX+e*.1,EY+ED*.5);
 s(11,CX-.09,.30);s(12,CX+.09,.30);s(23,CX-.06,.62);s(24,CX+.06,.62);s(27,CX-.08,.95);s(28,CX+.08,.95);
 s(15,...wl);s(16,...wr);[17,19,21].forEach(i=>s(i,wl[0],wl[1],wl[2]));[18,20,22].forEach(i=>s(i,wr[0],wr[1],wr[2]));return L;}
const REST=[[.40,.45,.99],[.60,.45,.99]];
// scénario : fn(t) -> {hands:[{x,y,ratio}], wl, wr}
function run(fn,words=[],secs=30,hands=true){const a=E.createAnalyzer({aspect:AS,hiddenAlert:8});words.forEach(w=>a.addWord(w[0],w[1]));
 if(words.length)for(let t=0;t<secs;t+=.5)a.markSpeech(t);
 for(let i=0;i<secs*15;i++){const t=i/15,s=fn(t);const hh=s.hands&&hands?s.hands.map(h=>hand(h.x,h.y,h.ratio)):null;
  a.push({t,pose:pose(s.wl||REST[0],s.wr||REST[1]),hands:hh});}
 return a.finish();}
const touchAt=(a,b,x,y,ratio=.5)=>t=>t>=a&&t<b?{hands:[{x,y,ratio}],wl:[x,y,.99],wr:REST[1]}:{wl:REST[0],wr:REST[1]};
const hairXY=[CX+.01,EY-ED*1.0],faceXY=[CX,EY+ED*.15],mouthXY=[CX,EY+ED*.5];
let r;
console.log('A. main dans les cheveux 3 s, propos sans rapport');
r=run(touchAt(10,13,...hairXY),'on peut dire que ce projet va changer notre quartier'.split(' ').map((w,i)=>[w,8+i*.5]));
ok(r.issues.some(i=>i.kind==='contact'&&i.zone==='cheveux'),'problème « cheveux » détecté');
const ia=r.issues.find(i=>i.zone==='cheveux');ok(ia&&ia.t0>=9.9&&ia.t1<=13.3,'temps ≈ 0:10→0:13 ('+(ia&&ia.t0.toFixed(1))+'→'+(ia&&ia.t1.toFixed(1))+')');
ok(ia&&/Tu disais/.test(ia.ctx),'le contexte cité est affiché');
console.log('B. même geste mais on parle de la couleur des cheveux');
r=run(touchAt(10,13,...hairXY),'ma couleur de cheveux est naturelle'.split(' ').map((w,i)=>[w,9+i*.5]));
ok(!r.issues.some(i=>i.kind==='contact'),'pas compté comme tic');ok(r.neutral.some(n=>n.kind==='contact-compris'),'classé « compris par le contexte »');
console.log('C. main sur le visage, « je me cachais comme ça »');
r=run(touchAt(10,13,...faceXY),'et moi je me cachais le visage comme ça'.split(' ').map((w,i)=>[w,9+i*.5]));
ok(!r.issues.some(i=>i.kind==='contact'),'pas compté');ok(r.neutral.some(n=>n.kind==='contact-compris'),'« caché / visage » reconnu');
console.log('D. main devant le visage (plus près de la caméra)');
r=run(touchAt(10,13,...faceXY,1.6),'voici mon projet'.split(' ').map((w,i)=>[w,9+i*.5]));
ok(!r.issues.some(i=>i.kind==='contact')&&!r.neutral.some(n=>/contact/.test(n.kind)),'aucun contact (la main est devant, pas dessus)');
console.log('E. contact bref 0,5 s');
r=run(touchAt(10,10.5,...hairXY),'bonjour à tous'.split(' ').map((w,i)=>[w,9+i*.5]));
ok(!r.issues.some(i=>i.kind==='contact'),'non compté');
console.log('F. sans transcription');
r=run(touchAt(10,13,...hairXY),[]);const f=r.issues.find(i=>i.kind==='contact');
ok(f&&/inconnu/.test(f.title),'« contexte inconnu », sans accusation');
console.log('G. trois contacts courts répétés (tic)');
r=run(t=>{const k=[[5,6],[12,13],[20,21]].some(([a,b])=>t>=a&&t<b);return k?{hands:[{x:hairXY[0],y:hairXY[1],ratio:.5}],wl:[hairXY[0],hairXY[1],.99],wr:REST[1]}:{wl:REST[0],wr:REST[1]}},'on avance sur ce sujet important pour tous'.split(' ').map((w,i)=>[w,4+i*2]));
ok(r.issues.filter(i=>i.kind==='contact').length===3,'3 contacts répétés comptés ('+r.issues.filter(i=>i.kind==='contact').length+')');
console.log('H. mains cachées 15 s');
r=run(t=>t>=5&&t<20?{wl:[.45,.55,.1],wr:[.55,.55,.1]}:{wl:REST[0],wr:REST[1]},[]);
const h=r.issues.find(i=>i.kind==='cachees');ok(h&&h.t0>=4.9&&h.t1<=20.1,'mains cachées '+(h&&h.t0.toFixed(1))+'→'+(h&&h.t1.toFixed(1)));
console.log('I. pouce baissé en disant « bien »');
{const a=E.createAnalyzer({aspect:AS});a.addWord('bien',10);
 for(let i=0;i<30*15;i++){const t=i/15;const th=t>=9.8&&t<11;let hh=null;
  if(th){const L=hand(.6,.45,.5);const w={x:.6,y:.45};
   // poing fermé, pouce vers le bas
   [8,12,16,20].forEach(k=>L[k]={x:.6,y:.45});[6,10,14,18].forEach(k=>L[k]={x:.6,y:.40});L[0]={x:.6,y:.5};L[5]={x:.59,y:.45};L[17]={x:.62,y:.45};L[2]={x:.585,y:.47};L[4]={x:.585,y:.56};hh=[L];}
  a.push({t,pose:pose(REST[0],REST[1]),hands:hh});}
 const r=a.finish();ok(r.issues.some(i=>i.kind==='contradiction'),'contradiction mots/geste détectée');}
console.log('J. balancement');
r=run(t=>({wl:REST[0],wr:REST[1],}),[],10);
{const a=E.createAnalyzer({aspect:AS});for(let i=0;i<30*15;i++){const t=i/15,dx=t>=8&&t<24?.035*Math.sin(t*2*Math.PI/1.3):0;
 const L=pose(REST[0],REST[1]);[23,24].forEach(k=>L[k].x+=dx);a.push({t,pose:L});}
 const r=a.finish();const s=r.issues.find(i=>i.kind==='balancement');ok(s&&s.t0>7&&s.t1<25,'balancement localisé '+(s&&s.t0.toFixed(1))+'→'+(s&&s.t1.toFixed(1)));}
console.log('K. avec le maillage du visage : main dans les cheveux, tête inclinée de 15°');
{const roll=15*Math.PI/180,fw=ED/AS*0+0.036/1;
 const run2=(words,touch)=>{const a=E.createAnalyzer({aspect:AS,hiddenAlert:8});words.forEach(w=>a.addWord(w[0],w[1]));for(let t=0;t<30;t+=.5)a.markSpeech(t);
  for(let i=0;i<30*15;i++){const t=i/15,on=touch&&t>=10&&t<13;const face=E.syntheticFace(CX,EY,0.036/AS*AS,AS,roll);
   // position cheveux en repère local incliné (0.05 largeur de visage au-dessus du front)
   const lx=0.05,ly=-1.0,c=Math.cos(roll),sn=Math.sin(roll),hx=CX+(lx*0.036*c-ly*0.036*sn)/AS,hy=EY+(lx*0.036*sn+ly*0.036*c);
   a.push({t,pose:pose(on?[hx,hy,.99]:REST[0],REST[1]),hands:on?[hand(hx,hy,.5)]:null,face});}return a.finish();};
 let r=run2('on peut dire que ce projet va changer notre quartier'.split(' ').map((w,i)=>[w,8+i*.5]),true);
 ok(r.issues.some(i=>i.kind==='contact'&&i.zone==='cheveux'),'contact cheveux détecté malgré l’inclinaison');
 r=run2('ma couleur de cheveux est naturelle'.split(' ').map((w,i)=>[w,9+i*.5]),true);
 ok(!r.issues.some(i=>i.kind==='contact')&&r.neutral.some(n=>n.kind==='contact-compris'),'« couleur de cheveux » : compris par le contexte');
 r=run2([['bonjour',3]],false);ok(r.issues.length===0,'sans geste : aucun problème ('+r.issues.map(i=>i.kind)+')');}
console.log(fails?'\n'+fails+' ÉCHEC(S)':'\nTous les tests passent');process.exit(fails?1:0);
