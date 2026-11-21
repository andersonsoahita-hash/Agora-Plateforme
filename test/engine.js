/* Agora Test — moteur d'analyse gestuelle (by Stephen). Pur JS, testable sous Node.
   Entrée : images de points (pose 33 pts, mains 21 pts) ; sortie : rapport chiffré. */
(function(root){
'use strict';
const E={};
const I={NOSE:0,EAR_L:7,EAR_R:8,SH_L:11,SH_R:12,EL_L:13,EL_R:14,WR_L:15,WR_R:16,HIP_L:23,HIP_R:24,AN_L:27,AN_R:28};
E.I=I;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const pct=(a,b)=>b>0?Math.round(1000*a/b)/10:0;
const STATES=['force','basse','haute','cachee','hors'];

/* ---------- Lexique (règles simples, pas de compréhension du sens) ---------- */
const POS=new Set(['bien','super','excellent','parfait','génial','genial','bravo','oui','d\'accord','formidable','magnifique','top','content','heureux','adore','aime','réussi','reussi']);
const NEGS=new Set(['mauvais','nul','horrible','terrible','catastrophe','problème','probleme','échec','echec','difficile']);
const NO=new Set(['non','jamais','aucun','impossible','faux']);
const INCL=new Set(['tous','toutes','ensemble','nous','venez','bienvenue','accueillir','public','vous']);
const NUM={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5};
E.lex={POS,NEGS,NO,INCL,NUM};

/* ---------- Gestes de la main (21 points) ---------- */
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
E.handShape=function(lm){
  if(!lm||lm.length<21)return null;
  const w=lm[0],palm=d2(lm[5],lm[17])||1e-6;
  const tips=[8,12,16,20],pips=[6,10,14,18];
  let curled=0,ext=0;
  tips.forEach((t,i)=>{const dt=d2(lm[t],w),dp=d2(lm[pips[i]],w);if(dt<dp*1.05)curled++;else if(dt>dp*1.2)ext++;});
  const thumbExt=d2(lm[4],lm[2])>0.7*palm&&d2(lm[4],lm[5])>0.55*palm;
  const dy=(lm[4].y-lm[2].y)/(d2(lm[4],lm[2])||1e-6); // <0 : pouce vers le haut (écran)
  let thumb=null;
  if(curled>=3&&thumbExt){ if(dy<-0.6)thumb='up'; else if(dy>0.6)thumb='down'; }
  const fingers=ext+(thumbExt&&curled<3?1:0);
  return {thumb,fingers,curled};
};

/* ---------- Balancement : oscillations du bassin ---------- */
E.computeSway=function(series){ // series: [{t,x}] x en largeurs d'épaules
  if(series.length<20)return {cycles:0,perMin:0,pctTime:0};
  const T=series[series.length-1].t-series[0].t; if(T<5)return {cycles:0,perMin:0,pctTime:0};
  // passe-haut : x - moyenne mobile 2,5 s
  const hp=[];let j=0,sum=0,cnt=0;
  for(let i=0;i<series.length;i++){
    sum+=series[i].x;cnt++;
    while(series[i].t-series[j].t>2.5){sum-=series[j].x;cnt--;j++;}
    hp.push({t:series[i].t,x:series[i].x-sum/cnt});
  }
  // extrema locaux d'amplitude > 0,08 largeur d'épaules
  const ext=[];let dir=0,last=hp[0];
  for(let i=1;i<hp.length;i++){
    const v=hp[i].x-last.x;
    if(Math.abs(v)<1e-4)continue;
    const nd=v>0?1:-1;
    if(dir!==0&&nd!==dir)ext.push(last);
    dir=nd;last=hp[i];
  }
  const peaks=[];for(let i=1;i<ext.length;i++){if(Math.abs(ext[i].x-ext[i-1].x)>0.08)peaks.push({t:ext[i].t,a:Math.abs(ext[i].x-ext[i-1].x),dt:ext[i].t-ext[i-1].t});}
  // un balancement = au moins 3 demi-cycles successifs de 0,3 à 2 s
  let cycles=0,run=0,inTime=0;
  for(const p of peaks){ if(p.dt>=0.3&&p.dt<=2.0){run++;inTime+=p.dt;if(run>=3)cycles+=0.5;} else run=0; }
  return {cycles:Math.round(cycles),perMin:Math.round(cycles/(T/60)*10)/10,pctTime:clamp(Math.round(1000*inTime/T)/10,0,100)};
};

/* ---------- Analyseur ---------- */
E.createAnalyzer=function(opts){
  opts=Object.assign({aspect:9/16,mode:'full',teleprompter:false,hiddenAlert:10,heightCm:null},opts||{});
  const A={};
  let prev=null,t0=null,tLast=0;
  const dur={total:0,body:0,hand:{force:0,basse:0,haute:0,cachee:0,hors:0},bothForce:0,anyForce:0,crossed:0,aside:0,down:0,headN:0,feetN:0};
  const events=[],words=[],speech=[],series=[],buckets=new Map(),tilt=[],feet=[],sws=[],depth=[],grid=[[0,0,0],[0,0,0],[0,0,0]];
  let hiddenRun=0,maxHidden=0,hiddenAlerted=false,gs={on:false,t:0,amp:0,quiet:0,p0:null},gestures=[];
  let wPrev=[null,null],speedEMA=[0,0],lastTouch=-9,headBuf=[],lastNod=-9,lastShake=-9,baseHead=[],headBase=null;
  let anchor=null,mv=null,moves=[],thumbRun={up:0,down:0},lastThumb=-9,fingerRun={n:0,c:0},lastFinger=-9,crossStart=null,sideCb=null;
  const P=(l,i)=>({x:l[i].x*opts.aspect,y:l[i].y,v:l[i].visibility==null?1:l[i].visibility,rx:l[i].x,ry:l[i].y});

  A.markSpeech=function(t){speech.push(t);};
  A.addWord=function(text,t){words.push({w:String(text).toLowerCase(),t});};
  A.speechActive=function(t){ if(!speech.length)return null; for(let i=speech.length-1;i>=0&&speech[i]>t-1.2;i--){if(speech[i]<=t)return true;} return false; };
  A.hiddenLive=()=>hiddenRun;
  A.setOpts=o=>Object.assign(opts,o);

  A.push=function(f){
    const t=f.t; if(t0==null)t0=t;
    const dt=prev==null?0:clamp(t-prev,0,0.5); prev=t; tLast=t; dur.total+=dt;
    const out={state:null,alerts:[]};
    const L=f.pose; if(!L||L.length<33){return out;}
    const Ls=P(L,I.SH_L),Rs=P(L,I.SH_R);
    if(Ls.v<0.4||Rs.v<0.4){return out;}
    dur.body+=dt;
    const SW=Math.hypot(Ls.x-Rs.x,Ls.y-Rs.y)||1e-6;
    const Sm={x:(Ls.x+Rs.x)/2,y:(Ls.y+Rs.y)/2};
    const Lh=P(L,I.HIP_L),Rh=P(L,I.HIP_R);
    const hipsOk=Lh.v>0.4&&Rh.v>0.4&&Lh.ry<1&&Rh.ry<1;
    const Hm=hipsOk?{x:(Lh.x+Rh.x)/2,y:(Lh.y+Rh.y)/2}:{x:Sm.x,y:Sm.y+1.5*SW};
    const T=Math.max(0.1,hipsOk?Math.hypot(Hm.x-Sm.x,Hm.y-Sm.y):1.5*SW);
    const sec=Math.floor(t-t0);

    // --- mains : zones ---
    const st=[];
    [I.WR_L,I.WR_R].forEach((wi,k)=>{
      const w=P(L,wi); let s;
      if(w.rx<0||w.rx>1||w.ry<0||w.ry>1)s='hors';
      else if(w.v<0.45)s='cachee';
      else{const r=(w.y-Sm.y)/T;
        if(r>1.05)s='basse'; else if(r<-0.2)s='haute';
        else s=Math.abs(w.x-Sm.x)<=2.2*SW?'force':'haute';}
      st.push(s);dur.hand[s]+=dt/2;
      // vitesse du poignet
      if(wPrev[k]&&dt>0&&s!=='hors'&&s!=='cachee'){const sp=Math.hypot(w.x-wPrev[k].x,w.y-wPrev[k].y)/dt/T;speedEMA[k]=0.6*speedEMA[k]+0.4*sp;} else speedEMA[k]=0.6*speedEMA[k];
      wPrev[k]=(s==='hors'||s==='cachee')?null:w;
    });
    const anyF=st.includes('force'),bothF=st[0]==='force'&&st[1]==='force';
    if(anyF)dur.anyForce+=dt; if(bothF)dur.bothForce+=dt;
    const dom=anyF?'force':(st.includes('cachee')&&!st.includes('basse')&&!st.includes('haute')?'cachee':(st.includes('basse')?'basse':(st.includes('haute')?'haute':'hors')));
    out.state=dom;
    const b=buckets.get(sec)||{force:0,basse:0,haute:0,cachee:0,hors:0};b[dom]+=dt||0.001;buckets.set(sec,b);
    // mains cachées (les deux, hors cadre exclu)
    if(st[0]==='cachee'&&st[1]==='cachee'){hiddenRun+=dt;maxHidden=Math.max(maxHidden,hiddenRun);
      if(hiddenRun>=opts.hiddenAlert&&!hiddenAlerted){hiddenAlerted=true;out.alerts.push('Mains cachées depuis '+Math.round(hiddenRun)+' s');events.push({t:t-t0,type:'cachees',data:Math.round(hiddenRun)});}}
    else if(st.every(s=>s!=='cachee')){hiddenRun=0;hiddenAlerted=false;}

    // --- gestes (segments de mouvement en zone utile) ---
    const sp=Math.max(speedEMA[0],speedEMA[1]);
    if(sp>0.35){ if(!gs.on){gs.on=true;gs.t=t;gs.amp=0;gs.quiet=0;} gs.amp=Math.max(gs.amp,sp);}
    else if(gs.on){gs.quiet+=dt; if(gs.quiet>0.3){ if(t-gs.t>0.25){gestures.push({t0:gs.t-t0,t1:t-t0,amp:gs.amp});events.push({t:gs.t-t0,type:'geste',data:Math.round(gs.amp*10)/10});} gs.on=false;} }

    // --- contact visage ---
    const nose=P(L,I.NOSE);
    [I.WR_L,I.WR_R].forEach(wi=>{const w=P(L,wi);if(w.v>0.5&&w.rx>=0&&w.rx<=1&&Math.hypot(w.x-nose.x,w.y-nose.y)<0.35*T&&t-lastTouch>2){lastTouch=t;events.push({t:t-t0,type:'visage'});}});

    // --- bras croisés ---
    {const wl=P(L,I.WR_L),wr=P(L,I.WR_R);
     const cross=(w,s)=>(w.x-Sm.x)*(s.x-Sm.x)<0&&Math.abs(w.x-Sm.x)>0.1*SW;
     const rl=(wl.y-Sm.y)/T,rr=(wr.y-Sm.y)/T;
     const c=wl.v>0.4&&wr.v>0.4&&cross(wl,Ls)&&cross(wr,Rs)&&rl>0.1&&rl<0.95&&rr>0.1&&rr<0.95&&Math.hypot(wl.x-wr.x,wl.y-wr.y)<1.3*SW;
     if(c){dur.crossed+=dt;if(crossStart==null)crossStart=t;} else if(crossStart!=null){if(t-crossStart>0.8)events.push({t:crossStart-t0,type:'croises',data:Math.round((t-crossStart)*10)/10});crossStart=null;}}

    // --- tête ---
    {const el=P(L,I.EAR_L),er=P(L,I.EAR_R);
     if(el.v>0.4&&er.v>0.4){const ed=Math.hypot(el.x-er.x,el.y-er.y)||1e-6,em={x:(el.x+er.x)/2,y:(el.y+er.y)/2};
       const yaw=(nose.x-em.x)/ed,pit=(nose.y-em.y)/ed;
       if(!headBase){baseHead.push([yaw,pit]);if(baseHead.length>25)headBase=[median(baseHead.map(a=>a[0])),median(baseHead.map(a=>a[1]))];}
       else{dur.headN+=dt;const dy=yaw-headBase[0],dp=pit-headBase[1];
         if(!opts.teleprompter){if(Math.abs(dy)>0.45)dur.aside+=dt;if(dp>0.45)dur.down+=dt;}
         headBuf.push({t,x:nose.x/SW,y:nose.y/SW});while(headBuf.length&&t-headBuf[0].t>1.5)headBuf.shift();
         const rev=k=>{let r=0,d=0,l=headBuf[0][k];for(const h of headBuf){const v=h[k]-l;if(Math.abs(v)>0.03){const n=v>0?1:-1;if(d&&n!==d)r++;d=n;l=h[k];}}return r;};
         if(headBuf.length>8){if(rev('x')>=3&&t-lastShake>1.8){lastShake=t;events.push({t:t-t0,type:'non-tete'});}
           else if(rev('y')>=3&&t-lastNod>1.8){lastNod=t;events.push({t:t-t0,type:'oui-tete'});}}}}}
    tilt.push(Math.abs(Ls.y-Rs.y)/SW);

    // --- ancrage, balancement, déplacements (corps entier) ---
    if(opts.mode==='full'&&hipsOk){
      const La=P(L,I.AN_L),Ra=P(L,I.AN_R);
      if(La.v>0.4&&Ra.v>0.4&&La.ry<1&&Ra.ry<1){feet.push(Math.abs(La.x-Ra.x)/SW);dur.feetN+=dt;}
      series.push({t:t-t0,x:(Hm.x-Sm.x*0)/SW}); // x du bassin, en largeurs d'épaules
      depth.push(SW);
      const hx=Hm.x/SW;
      if(!anchor)anchor={x:hx,t};
      if(!mv){ if(Math.abs(hx-anchor.x)>0.5){mv={t0:t,x0:anchor.x,x:hx,last:t,sp:A.speechActive(t)};} else anchor.x=0.9*anchor.x+0.1*hx; }
      else{ if(Math.abs(hx-mv.x)>0.05)mv.last=t; mv.x=hx; if(t-mv.last>0.6){moves.push({t0:mv.t0-t0,t1:mv.last-t0,dx:mv.x-mv.x0,sp:mv.sp});events.push({t:mv.t0-t0,type:'deplacement',data:Math.round((mv.x-mv.x0)*10)/10});anchor={x:mv.x,t};mv=null;} }
    }
    return out;
  };

  A.finish=function(){
    const total=Math.max(dur.total,0.001),body=Math.max(dur.body,0.001);
    const hs=dur.hand;const sumH=STATES.reduce((a,k)=>a+hs[k],0)||1;
    const hands={force:pct(hs.force,sumH),basse:pct(hs.basse,sumH),haute:pct(hs.haute,sumH),cachee:pct(hs.cachee,sumH),hors:pct(hs.hors,sumH),
      auMoinsUneEnForce:pct(dur.anyForce,body),lesDeuxEnForce:pct(dur.bothForce,body),pireSerieCachee:Math.round(maxHidden)};
    const gpm=gestures.length/(body/60);
    const sway=E.computeSway(series);
    const fr=median(feet);
    const stance=fr==null?null:{ratio:Math.round(fr*100)/100,label:fr<0.5?'pieds trop serrés':(fr>2?'pieds très écartés':'bien posé')};
    // déplacements : utiles / parasites
    let useful=0,parasite=0,back=0,unknown=0;
    moves.forEach((m,i)=>{const n=moves[i+1];
      if(n&&n.t0-m.t1<6&&Math.sign(n.dx)!==Math.sign(m.dx)){back++;parasite++;}
      else if(m.sp===null){unknown++;} else if(m.sp===false){useful++;} else parasite++;});
    let used=null;
    if(series.length>10){const xs=series.map(s=>s.x).sort((a,b)=>a-b);const p=q=>xs[Math.floor(q*(xs.length-1))];used=Math.round(100*Math.min(1,(p(0.95)-p(0.05))*(1/(median(depth)||1))*(1/opts.aspect)*(median(depth)||1)))/1;}
    // occupation 3 colonnes sur le cadre
    const cols=[0,0,0];series.forEach(s=>{});
    const head={deCotePct:pct(dur.aside,Math.max(dur.headN,0.001)),versLeBasPct:pct(dur.down,Math.max(dur.headN,0.001)),hochements:events.filter(e=>e.type==='oui-tete').length,secouements:events.filter(e=>e.type==='non-tete').length};
    const touch=events.filter(e=>e.type==='visage').length;
    // contradictions parole/gestes
    const contradictions=[];
    const evs=events.map(e=>Object.assign({},e));
    const thumbs=evs.filter(e=>e.type==='pouce-bas'||e.type==='pouce-haut');
    const near=(type,t,a,b)=>evs.some(e=>e.type===type&&e.t>=t-a&&e.t<=t+b);
    const crossedAt=(t,a,b)=>evs.some(e=>e.type==='croises'&&e.t<=t+b&&e.t+e.data>=t-a);
    words.forEach(wd=>{const t=wd.t-t0,w=wd.w.replace(/[^a-zàâçéèêëîïôûùüÿœ']/gi,'');
      if(POS.has(w)){ if(near('pouce-bas',t,0.6,2.5))contradictions.push({t,mot:w,geste:'pouce baissé',niveau:'contradiction'});
        else if(near('non-tete',t,0.6,2.5))contradictions.push({t,mot:w,geste:'tête qui dit non',niveau:'contradiction'}); }
      if(NEGS.has(w)&&near('pouce-haut',t,0.6,2.5))contradictions.push({t,mot:w,geste:'pouce levé',niveau:'contradiction'});
      if(NO.has(w)&&near('oui-tete',t,0.6,2.5))contradictions.push({t,mot:w,geste:'tête qui dit oui',niveau:'à vérifier'});
      if(INCL.has(w)&&crossedAt(t,0.3,2.5))contradictions.push({t,mot:w,geste:'bras croisés',niveau:'à vérifier'});
      if(NUM[w]){const f=evs.filter(e=>e.type==='doigts'&&e.t>=t-0.6&&e.t<=t+2.5);if(f.length&&!f.some(e=>e.data===NUM[w]))contradictions.push({t,mot:w,geste:f[0].data+' doigt(s)',niveau:'à vérifier'});}
    });
    // frise : un état par seconde
    const timeline=[];const nsec=Math.ceil(total);for(let s=0;s<nsec;s++){const b=buckets.get(s);if(!b){timeline.push('absent');continue;}let k='force',m=-1;for(const key of STATES){if(b[key]>m){m=b[key];k=key;}}timeline.push(k);}
    // note détaillée (poids affichés dans l'app)
    const sc={};
    sc.mains=Math.round(25*clamp(hands.auMoinsUneEnForce/55,0,1));
    sc.cachees=Math.round(20*(1-clamp((hands.cachee+0)/25,0,1))*(maxHidden>20?0.5:1));
    sc.ancrage=Math.round(20*(1-clamp(sway.pctTime/40,0,1))*(stance&&stance.label!=='bien posé'?0.7:1));
    sc.deplacements=Math.round(15*(moves.length?clamp(1-(parasite/Math.max(1,moves.length)),0,1):1));
    sc.posture=Math.round(10*(1-clamp((dur.crossed/body)/0.25+touch/(Math.max(1,body/60)*6),0,1)));
    sc.tete=Math.round(10*(1-clamp((head.deCotePct+head.versLeBasPct)/60,0,1)));
    const score=sc.mains+sc.cachees+sc.ancrage+sc.deplacements+sc.posture+sc.tete;
    const rang=score>=88?'S':score>=75?'A':score>=60?'B':score>=45?'C':'D';
    // conseils (règles)
    const advice=[];
    if(hands.auMoinsUneEnForce<40)advice.push('Tes mains sont peu dans la zone de force (entre la ceinture et les épaules). Monte-les devant le buste quand tu insistes.');
    if(maxHidden>=10)advice.push('Tes mains sont restées cachées jusqu’à '+Math.round(maxHidden)+' s d’affilée. Sors-les des poches ou de derrière le dos.');
    if(sway.perMin>=4)advice.push('Tu te balances d’un pied sur l’autre environ '+sway.perMin+' fois par minute. Pose tes pieds, répartis le poids, bouge seulement avec une intention.');
    if(stance&&stance.label!=='bien posé')advice.push('Ancrage : '+stance.label+'. Vise un écart des pieds proche de la largeur des épaules.');
    if(parasite>=3)advice.push('Plusieurs déplacements en pleine phrase ou en allers-retours. Garde-les pour les changements d’idée, pendant les pauses.');
    if(dur.crossed/body>0.15)advice.push('Bras croisés sur une part importante du temps : une posture fermée.');
    if(touch>=3)advice.push('Mains au visage ou aux cheveux '+touch+' fois. Repose-les devant toi.');
    if(contradictions.some(c=>c.niveau==='contradiction'))advice.push('Certains gestes contredisent tes mots (voir les moments signalés dans la transcription).');
    if(!advice.length)advice.push('Bonne base. Tu peux maintenant travailler l’amplitude et le rythme de tes gestes.');
    return {duree:Math.round(total),corpsVisiblePct:pct(dur.body,total),hands,gestes:{total:gestures.length,parMin:Math.round(gpm*10)/10},
      bras_croises_pct:pct(dur.crossed,body),visage:touch,ancrage:stance,balancement:sway,
      deplacements:{total:moves.length,utiles:useful,parasites:parasite,allersRetours:back,inconnus:unknown},
      espaceUtilisePct:used,tete:head,contradictions:contradictions.sort((a,b)=>a.t-b.t),timeline,events,score:{total:score,rang,detail:sc},conseils:advice.slice(0,4)};
  };
  /* événements de mains détectés dans l'appli (pouce, doigts) */
  A.hand=function(f){
    if(!f.hands||!f.hands.length||t0==null)return;
    const t=f.t;
    f.hands.forEach(h=>{const s=E.handShape(h.lm);if(!s)return;
      ['up','down'].forEach(k=>{thumbRun[k]=s.thumb===k?thumbRun[k]+1:0;
        if(thumbRun[k]>=4&&t-lastThumb>1.5){lastThumb=t;events.push({t:t-t0,type:k==='up'?'pouce-haut':'pouce-bas'});}});
      if(s.curled<4){fingerRun.n===s.fingers?fingerRun.c++:(fingerRun={n:s.fingers,c:1});
        if(fingerRun.c>=8&&fingerRun.n>=1&&fingerRun.n<=5&&t-lastFinger>1.2){lastFinger=t;events.push({t:t-t0,type:'doigts',data:fingerRun.n});}}
    });
  };
  return A;
};
if(typeof module!=='undefined'&&module.exports)module.exports=E;else root.AgoraEngine=E;
})(typeof self!=='undefined'?self:this);
