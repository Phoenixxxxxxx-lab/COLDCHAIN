/* Планировщик холодовой цепи: расчеты по вкладкам. 3D-вид отсека – в hold3d.js */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const fmt=(x,d=0)=>Number(x).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const {GlassSeg}=window.UI;

/* ---------------- вкладки ---------------- */
const views=[['apron','Перрон'],['capacity','Емкость рейса'],['hold','План отсека'],['econ','Экономика']];
const tabs=GlassSeg($('#tabs'),views.map(([k,l])=>({k,label:l})),'apron',k=>{if(location.hash!=='#'+k) location.hash=k;},{tabs:true,label:'Разделы'});
function route(){
  let v=(location.hash||'#apron').slice(1); if(!views.some(x=>x[0]===v)) v='apron';
  views.forEach(([x])=>$('#v-'+x).hidden=(x!==v)); tabs.set(v);
  if(v==='hold') initHold(); else if(v==='apron') drawApron(); else if(v==='econ') drawEcon();
  if(H3) H3.active(v==='hold');
  UI.fillAll();
}
window.addEventListener('hashchange',route);
$('#themeBtn').onclick=()=>UI.toggleTheme();
document.addEventListener('themechange',()=>{drawApron(); drawEcon(); if(H3){H3.theme(); paint();}});

/* ---------------- ПЕРРОН ---------------- */
const PROD={
  fish:{n:'Охлажденная рыба со льдом',m:20,c:3600,ice:3,T0:0.5,Tmax:5,Tmin:-1.5,A:0.30,kind:'fish'},
  berry:{n:'Ягоды (черешня, клубника)',m:5,c:3800,ice:0,T0:1,Tmax:6,Tmin:-1,A:0.22,kind:'berry'},
  flower:{n:'Срезанные цветы',m:8,c:3600,ice:0,T0:2,Tmax:8,Tmin:0,A:0.40,kind:'flower'}
};
const PROT={open:{n:'Без защиты',U:6,a:0.65},blanket:{n:'Термопокрывало',U:2,a:0.12},liner:{n:'Покрывало и вкладыш',U:0.8,a:0.12}};
const CLIM={tas_d:['Ташкент, июль, день',38,850],tas_n:['Ташкент, июль, ночь',25,0],mow:['Москва, июль, день',26,650],khv:['Хабаровск, август, день',28,700],yks:['Якутск, январь',-40,0],custom:['Свои условия',20,400]};
const A={prod:'berry',clim:'tas_d',prot:'blanket',T:38,G:850,exp:30};
function sim(p,pr,Ta,G,minutes){
  let T=p.T0,ice=p.ice; const Teq=Ta+pr.a*G/17, UA=pr.U*p.A, C=p.m*p.c, out=[T];
  for(let i=0;i<minutes;i++){for(let k=0;k<6;k++){let q=UA*(Teq-T)*10; if(ice>0&&q>0&&T>=0){const melt=Math.min(ice,q/334000);ice-=melt;q-=melt*334000;T=Math.max(T,0);} T+=q/C;} out.push(T);}
  return out;
}
function tlimit(p,tr,Ta){for(let i=0;i<tr.length;i++){if(Ta>p.T0&&tr[i]>p.Tmax)return i; if(Ta<=p.T0&&tr[i]<p.Tmin)return i;} return null;}
function loss(p,tr,mins){let s=0;for(let i=1;i<=mins&&i<tr.length;i++){const t=tr[i]; s+= p.kind==='fish'?Math.pow(1+0.1*Math.max(t,-1),2):Math.pow(p.kind==='berry'?3:2.5,t/10);} const SL0=(p.kind==='fish'?12:p.kind==='berry'?6:7)*1440; return s/SL0*100;}
let segClim;
function initApron(){
  GlassSeg($('#a-prod'),Object.entries(PROD).map(([k,v])=>({k,label:v.n})),A.prod,k=>{A.prod=k;drawApron();},{label:'Вид груза'});
  segClim=GlassSeg($('#a-clim'),Object.entries(CLIM).map(([k,v])=>({k,label:v[0]})),A.clim,k=>{A.clim=k; if(k!=='custom'){A.T=CLIM[k][1];A.G=CLIM[k][2];$('#a-t').value=A.T;$('#a-g').value=A.G;UI.fillAll();} drawApron();},{label:'Аэропорт и сезон'});
  GlassSeg($('#a-prot'),Object.entries(PROT).map(([k,v])=>({k,label:v.n})),A.prot,k=>{A.prot=k;drawApron();},{label:'Защита груза'});
  $('#a-t').value=A.T; $('#a-g').value=A.G; $('#a-exp').value=A.exp;
  $('#a-t').oninput=e=>{A.T=+e.target.value;A.clim='custom';segClim.set('custom');drawApron();};
  $('#a-g').oninput=e=>{A.G=+e.target.value;A.clim='custom';segClim.set('custom');drawApron();};
  $('#a-exp').oninput=e=>{A.exp=+e.target.value;drawApron();};
}
function drawApron(){
  const p=PROD[A.prod], H=240;
  $('#a-t-v').textContent=(A.T>0?'+':'')+fmt(A.T)+' °С'; $('#a-g-v').textContent=fmt(A.G); $('#a-exp-v').textContent=A.exp+' мин';
  const tr=sim(p,PROT[A.prot],A.T,A.G,Math.max(H,1440)), tro=sim(p,PROT.open,A.T,A.G,H);
  const tl=tlimit(p,tr,A.T);
  $('#a-k1').textContent= tl===null?'более 24 ч':(tl>=120? fmt(tl/60,1)+' ч': tl+' мин');
  $('#a-k1s').textContent= A.T>p.T0? `до +${p.Tmax} °С в толще продукта` : `до ${p.Tmin} °С, есть риск подмораживания`;
  const norm= tl===null? null : Math.max(5,Math.floor(tl*0.7/5)*5);
  $('#a-k2').textContent= norm===null?'без ограничения': (norm>=120?fmt(norm/60,1)+' ч':norm+' мин');
  const L=loss(p,tr,A.exp);
  $('#a-k3').textContent=fmt(L,1)+' %';
  const st = tl!==null && A.exp>tl ? ['bad','предел превышен'] : (norm!==null && A.exp>norm ? ['warn','выше норматива'] : ['ok','в норме']);
  $('#a-k3s').innerHTML=`за ${A.exp} мин <span class="pill ${st[0]}">${st[1]}</span>`;
  const svg=$('#a-chart'), W=720,Hh=300,l=48,r=16,t=14,b=36, pw=W-l-r, ph=Hh-t-b;
  const ys=[...tr.slice(0,H+1),...tro,p.Tmax,p.T0]; let ymin=Math.min(...ys,p.Tmin), ymax=Math.max(...ys);
  ymin=Math.floor(ymin/2)*2; ymax=Math.ceil((ymax+0.5)/2)*2; if(ymax-ymin<6) ymax=ymin+6;
  const X=m=>l+m/H*pw, Y=v=>t+(1-(v-ymin)/(ymax-ymin))*ph;
  let g='';
  const step=Math.max(2,Math.ceil((ymax-ymin)/6/2)*2);
  for(let v=ymin;v<=ymax;v+=step){g+=`<line class="grid" x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l-8}" y="${Y(v)+4}" text-anchor="end">${v}</text>`;}
  for(let m=0;m<=H;m+=30){g+=`<text x="${X(m)}" y="${Hh-14}" text-anchor="middle">${m}</text>`;}
  g+=`<text x="${W-r}" y="${Hh-1}" text-anchor="end">минуты</text><text x="${l}" y="10">°С</text>`;
  const lim = A.T>p.T0? p.Tmax : p.Tmin, bad=css('--bad'), ink=css('--ink');
  g+=`<rect x="${l}" y="${t}" width="${X(Math.min(A.exp,H))-l}" height="${ph}" fill="${css('--soft')}"/>`;
  g+=`<line x1="${l}" x2="${W-r}" y1="${Y(lim)}" y2="${Y(lim)}" stroke="${bad}" stroke-dasharray="6 5" stroke-width="1.6"/><text x="${W-r-4}" y="${Y(lim)-6}" text-anchor="end" style="fill:${bad}">предел ${lim>0?'+':''}${lim} °С</text>`;
  const path=a=>a.slice(0,H+1).map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  g+=`<path d="${path(tro)}" fill="none" stroke="${css('--muted')}" stroke-width="1.6" stroke-dasharray="4 4"/>`;
  g+=`<path d="${path(tr)}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
  if(tl!==null&&tl<=H) g+=`<circle cx="${X(tl)}" cy="${Y(tr[tl])}" r="6" fill="${bad}" stroke="${css('--panel-solid')}" stroke-width="2"/>`;
  g+=`<line class="axis" x1="${l}" x2="${W-r}" y1="${t+ph}" y2="${t+ph}"/>`;
  svg.innerHTML=g;
}

/* ---------------- ЕМКОСТЬ ---------------- */
const AC={
  'A321':{seats:220,V:50.89,M:10548,P:25000,uld:false,src:'кресел 220 (SeatMaps)'},
  'A321neo':{seats:218,V:41.75,M:10371,P:25500,uld:false,src:'кресел 218 (SeatMaps)'},
  'B737-800':{seats:189,V:40.0,M:7291,P:20500,uld:false,src:'кресел 189, допущение'},
  'A330-200':{seats:310,V:136.0,M:37578,P:45000,uld:true,src:'кресел 310, допущение',fwd:16,aft:14,Mf:18869,Ma:15241},
  'A330-300':{seats:379,V:147.0,M:42836,P:45000,uld:true,src:'кресел 379 (SeatMaps)',fwd:18,aft:14,Mf:20861,Ma:18507},
  'B777-200ER':{seats:393,V:125.9,M:47494,P:54000,uld:true,src:'кресел 393 (SeatGuru)',fwd:18,aft:10,Mf:30612,Ma:12800},
  'B777-300ER':{seats:450,V:177.9,M:80656,P:66000,uld:true,src:'кресел 450, допущение',fwd:24,aft:18,Mf:40823,Ma:35751}
};
const DENS=[['Рыба охлажденная',350],['Ягоды и фрукты',220],['Срезанные цветы',110],['Генеральный груз',167]];
const C={ac:'A330-200',lf:87,bag:16,k:0.92};
function cap(ac,lf,bag,k){const pax=Math.floor(ac.seats*lf), bm=pax*bag, eta=ac.uld?0.8:0.75; const v=Math.max(ac.V*eta-bm/160,0); const m=Math.max(Math.min(ac.M*k-bm, ac.P*k-pax*84-bm),0); return {pax,bm,v,m};}
function gamma(k){if(k<1) return gamma(k+1)*Math.pow(Math.random(),1/k);
  const d=k-1/3, c=1/Math.sqrt(9*d); for(;;){let x,v; do{x=randn();v=1+c*x;}while(v<=0); v=v*v*v; const u=Math.random(); if(u<1-0.0331*x*x*x*x) return d*v; if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v;}}
function rbeta(a,b){const x=gamma(a), y=gamma(b); return x/(x+y);}
function randn(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function initCap(){
  GlassSeg($('#c-ac'),Object.keys(AC).map(k=>({k,label:k})),C.ac,k=>{C.ac=k;drawCap(true);},{label:'Тип ВС'});
  $('#c-lf').value=C.lf; $('#c-bag').value=C.bag; $('#c-k').value=C.k;
  $('#c-lf').oninput=e=>{C.lf=+e.target.value;drawCap(false);};
  $('#c-bag').oninput=e=>{C.bag=+e.target.value;drawCap(false);};
  $('#c-k').oninput=e=>{C.k=+e.target.value;drawCap(false);};
  drawCap(true);
}
function drawCap(mc){
  const ac=AC[C.ac]; $('#c-lf-v').textContent=C.lf+' %'; $('#c-bag-v').textContent=fmt(C.bag,1)+' кг'; $('#c-k-v').textContent=fmt(C.k,2);
  $('#c-src').textContent=`Отсеки ${fmt(ac.V,1)} м³, предельная загрузка отсеков ${fmt(ac.M)} кг, максимальная коммерческая загрузка ${fmt(ac.P)} кг, ${ac.src}.`;
  const r=cap(ac,C.lf/100,C.bag,C.k);
  $('#c-k1').textContent=fmt(r.v,1); $('#c-k2').textContent=fmt(r.m);
  const lim = (ac.M*C.k-r.bm) < (ac.P*C.k-r.pax*84-r.bm) ? 'ограничивают отсеки' : 'ограничивает коммерческая загрузка';
  $('#c-k2s').textContent='кг, '+lim;
  $('#c-k3').textContent=fmt(r.bm); $('#c-k3s').textContent=`кг на ${fmt(r.pax)} пассажиров`;
  const vals=DENS.map(([n,rho])=>({n,val:Math.min(r.m,r.v*rho),vol:r.v*rho<r.m}));
  const mx=Math.max(...vals.map(x=>x.val),1);
  $('#c-bars').innerHTML=vals.map(x=>`<div class="bar"><span>${x.n}</span><div class="track"><div class="fill" style="width:${x.val/mx*100}%"></div></div><span class="num">${fmt(x.val)}</span><small>${x.vol?'ограничивает объем':'ограничивает масса'}</small></div>`).join('');
  if(mc){
    const N=2000, res=DENS.map(()=>[]);
    for(let i=0;i<N;i++){const lf=rbeta(18,2.6), bag=Math.min(25,Math.max(8,16+3*randn())), k=0.85+0.15*Math.random(); const q=cap(ac,lf,bag,k); DENS.forEach(([n,rho],j)=>res[j].push(Math.min(q.m,q.v*rho)));}
    const pct=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))];};
    $('#c-mc').innerHTML='<thead><tr><th>Вид груза</th><th>P10, кг</th><th>P50, кг</th><th>P90, кг</th></tr></thead><tbody>'+
      DENS.map(([n],j)=>`<tr><td>${n}</td><td class="n">${fmt(pct(res[j],0.1))}</td><td class="n">${fmt(pct(res[j],0.5))}</td><td class="n">${fmt(pct(res[j],0.9))}</td></tr>`).join('')+'</tbody>';
  }
}

/* ---------------- ПЛАН ОТСЕКА ---------------- */
const CARGO={
  bag:{n:'Багаж',c:'#9AA0A6',kg:520,per:false},
  gen:{n:'Генеральный груз',c:'#C9A227',kg:700,per:false},
  pes:{n:'PES рыба охлажденная',c:'#E0662A',kg:800,per:true},
  pep:{n:'PEP ягоды, фрукты',c:'#4F9A3A',kg:420,per:true},
  pef:{n:'PEF цветы',c:'#B5559C',kg:260,per:true},
  pil:{n:'PIL фармацевтика',c:'#2E75B6',kg:380,per:true},
  fro:{n:'Мороженое на сухом льду (ICE)',c:'#47B5D6',kg:900,per:true}
};
const Hs={ac:'B777-300ER',sel:'pes',kg:800,plan:{},P:[]};
let H3=null, holdReady=false;
function initHold(){
  if(holdReady){H3&&H3.resize();return;} holdReady=true;
  GlassSeg($('#h-ac'),['A330-200','A330-300','B777-200ER','B777-300ER'].map(k=>({k,label:k})),Hs.ac,k=>{Hs.ac=k;Hs.plan={};setType();sample(true);},{label:'Тип ВС'});
  GlassSeg($('#h-pal'),Object.entries(CARGO).map(([k,c])=>({k,html:`<span class="sw" style="background:${c.c}"></span>${c.n}`})),Hs.sel,k=>{Hs.sel=k;Hs.kg=CARGO[k].kg;$('#h-kg').value=Hs.kg;$('#h-kg-v').textContent=fmt(Hs.kg)+' кг';UI.fillAll();},{label:'Груз'});
  $('#h-kg').value=Hs.kg; $('#h-kg-v').textContent=fmt(Hs.kg)+' кг';
  $('#h-kg').oninput=e=>{Hs.kg=+e.target.value;$('#h-kg-v').textContent=fmt(Hs.kg)+' кг';};
  $('#h-sample').onclick=()=>sample(true);
  $('#h-clear').onclick=()=>{Hs.plan={};paint();check();};
  if(typeof THREE!=='undefined' && window.Hold3D){
    try{
      H3=Hold3D.create({canvas:$('#hold3d'),viewer:$('#viewer'),labels:$('#v-labels'),tip:$('#v-tip'),note:$('#v-note'),
        describe:id=>{const a=Hs.plan[id]; return a?`<b>${id}</b><br>${CARGO[a.t].n}<br>${fmt(a.kg)} кг`:`<b>${id}</b><br>свободно, нажмите, чтобы поставить<br>${CARGO[Hs.sel].n}`;},
        pick:id=>{const cur=Hs.plan[id]; if(cur&&cur.t===Hs.sel) delete Hs.plan[id]; else Hs.plan[id]={t:Hs.sel,kg:Hs.kg}; paint(id); check();}});
      const pr=GlassSeg($('#v-preset'),[{k:'iso',label:'3D'},{k:'side',label:'Сбоку'},{k:'top',label:'Сверху'},{k:'hold',label:'Отсеки'}],'iso',k=>H3.preset(k),{label:'Ракурс'});
      const tog=(id,fn)=>{const b=$(id); b.onclick=()=>{const v=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',v); fn(v);};};
      tog('#v-doors',v=>H3.doors(v)); tog('#v-xray',v=>H3.xray(v)); tog('#v-spin',v=>H3.spin(v));
      window.__H3=H3; H3.onDoors=v=>$('#v-doors').setAttribute('aria-pressed',v);
      $('#v-full').onclick=()=>{const el=$('#viewer'); if(document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();};
      document.addEventListener('fullscreenchange',()=>setTimeout(()=>H3.resize(),50));
    }catch(err){console.error(err); H3=null;}
  }
  if(!H3){$('#viewer').innerHTML='<p class="note" style="padding:20px">Трехмерный вид недоступен в этом браузере. Проверка плана по примеру работает.</p>';}
  setType(); sample(true);
}
function setType(){
  if(H3){Hs.P=H3.setType(Hs.ac,AC[Hs.ac]);}
  else{const a=AC[Hs.ac]; Hs.P=[]; for(let i=0;i<a.fwd/2;i++)for(let s=0;s<2;s++)Hs.P.push({id:`${i+11}${s?'R':'L'}`,hold:'fwd',row:i,side:s});
    for(let i=0;i<a.aft/2;i++)for(let s=0;s<2;s++)Hs.P.push({id:`${i+31}${s?'R':'L'}`,hold:'aft',row:i,side:s});}
}
function colorOf(id){const a=Hs.plan[id]; return a?CARGO[a.t].c:null;}
function paint(changed){if(H3) H3.paint(colorOf,changed);}
function sample(animate){
  const fw=Hs.P.filter(p=>p.hold==='fwd'), af=Hs.P.filter(p=>p.hold==='aft'); Hs.plan={};
  const seqF=['pes','pes','pes','pes','pep','pep','pil','gen','gen','gen','pef','gen','gen','gen'];
  fw.forEach((p,i)=>{if(i<seqF.length){const t=seqF[i]; Hs.plan[p.id]={t,kg:CARGO[t].kg};}});
  af.forEach((p,i)=>{const t= i<8?'bag':(i<10?'fro':(i<12?'gen':null)); if(t)Hs.plan[p.id]={t,kg:CARGO[t].kg};});
  if(H3&&animate) H3.load(colorOf); else paint();
  check();
}
function check(){
  const a=AC[Hs.ac], byId={}; Hs.P.forEach(p=>byId[p.id]=p);
  let mf=0,ma=0,per=0; const iss=[];
  Object.entries(Hs.plan).forEach(([id,v])=>{const p=byId[id]; if(!p)return; if(p.hold==='fwd')mf+=v.kg; else ma+=v.kg; if(CARGO[v.t].per)per++;});
  const nb=(p,q)=>p.hold===q.hold&&Math.abs(p.row-q.row)<=1;
  const items=Object.entries(Hs.plan).map(([id,v])=>({p:byId[id],t:v.t})).filter(x=>x.p);
  const pairs=new Set();
  items.forEach(x=>items.forEach(y=>{if(x===y)return; const key=[x.p.id,y.p.id].sort().join('-'); if(pairs.has(key)||!nb(x.p,y.p))return; pairs.add(key);
    if(x.t==='pef'&&y.t==='pep') iss.push(['bad',`Цветы (${x.p.id}) стоят рядом с фруктами (${y.p.id}), а этилен от фруктов ускоряет увядание. Разнесите позиции.`]);
    if(x.t==='fro'&&(y.t==='pil'||y.t==='pep'||y.t==='pef')) iss.push(['warn',`Сухой лед (${x.p.id}) рядом с грузом «${CARGO[y.t].n}» (${y.p.id}) грозит подмораживанием, кроме того, нужно учесть выделение CO₂ в отсеке.`]);
  }));
  items.filter(x=>CARGO[x.t].per&&x.p.hold==='aft'&&x.t!=='fro').forEach(x=>iss.push(['warn',`${CARGO[x.t].n} в заднем отсеке (${x.p.id}) будет выгружен позже, предусмотрите приоритет.`]));
  const fishFar=items.filter(x=>x.t==='pes'&&x.p.hold==='fwd'&&x.p.row>3); if(fishFar.length) iss.push(['warn',`Рыба стоит в дальних рядах переднего отсека (${fishFar.map(x=>x.p.id).join(', ')}). Лучше ставить ее у двери, чтобы выгружать первой.`]);
  const dry=items.filter(x=>x.t==='fro').length; if(dry) iss.push(['ok',`Сухой лед в ${dry} контейнерах. Укажите массу ICE в NOTOC и проверьте лимит для отсека.`]);
  if(mf>a.Mf) iss.push(['bad',`Передний отсек перегружен, ${fmt(mf)} кг при пределе ${fmt(a.Mf)} кг.`]);
  if(ma>a.Ma) iss.push(['bad',`Задний отсек перегружен, ${fmt(ma)} кг при пределе ${fmt(a.Ma)} кг.`]);
  if(Math.abs(mf-ma)>8000) iss.push(['warn',`Массы отсеков различаются на ${fmt(Math.abs(mf-ma))} кг, согласуйте план с центровкой.`]);
  if(per) iss.push(['ok','На борту скоропортящийся груз. Оформите NOTOC с кодами PER и включите вентиляцию отсеков до загрузки.']);
  if(!iss.filter(x=>x[0]!=='ok').length) iss.unshift(['ok','Нарушений совместимости и перегрузки не найдено.']);
  $('#h-issues').innerHTML=iss.map(([c,t])=>`<li class="${c}">${t}</li>`).join('');
  $('#h-k1').textContent=fmt(mf)+' кг'; $('#h-k1s').innerHTML=`из ${fmt(a.Mf)} кг <span class="pill ${mf>a.Mf?'bad':'ok'}">${Math.round(mf/a.Mf*100)} %</span>`;
  $('#h-k2').textContent=fmt(ma)+' кг'; $('#h-k2s').innerHTML=`из ${fmt(a.Ma)} кг <span class="pill ${ma>a.Ma?'bad':'ok'}">${Math.round(ma/a.Ma*100)} %</span>`;
  $('#h-k3').textContent=per;
}

/* ---------------- ЭКОНОМИКА ---------------- */
const E={pot:94.2,real:55,m:45,capex:9.145,opex:3.83,r:18};
const PATH=[0.28,0.40,0.50,0.55,0.55];
function econ(){
  const k=E.real/55; const cfs=[-E.capex]; const rows=[];
  for(let y=0;y<5;y++){const re=Math.min(1,PATH[y]*k); const dr=(re-0.20)*E.pot; const dm=dr*E.m/100; const tons=re*395.3; const claims=tons*1000*0.653*0.10*600/1e6; const sla=tons*1000*12/1e6; const cf=dm+claims-E.opex-sla; cfs.push(cf); rows.push({y:y+1,re,dr,dm,claims,sla,cf});}
  const npv=(r)=>cfs.reduce((s,c,t)=>s+c/Math.pow(1+r,t),0);
  let lo=-0.9,hi=5; for(let i=0;i<120;i++){const mid=(lo+hi)/2; if(npv(mid)>0)lo=mid; else hi=mid;}
  const r=E.r/100; let acc=0,dpp=null; const cum=[]; cfs.forEach((c,t)=>{const d=c/Math.pow(1+r,t); if(dpp===null&&t>0&&acc+d>=0) dpp=t-1+(-acc)/d; acc+=d; cum.push(acc);});
  return {cfs,rows,npv:npv(r),irr:npv(-0.89)>0&&npv(4.99)<0?(lo+hi)/2:null,dpp,cum};
}
const EIDS={pot:['e-pot',1,' млн'],real:['e-real',0,' %'],m:['e-m',0,' %'],capex:['e-capex',1,' млн'],opex:['e-opex',1,' млн'],r:['e-r',1,' %']};
function initEcon(){Object.entries(EIDS).forEach(([k,[id]])=>{const el=$('#'+id); el.value=E[k]; el.oninput=ev=>{E[k]=+ev.target.value;drawEcon();};});}
function drawEcon(){
  Object.entries(EIDS).forEach(([k,[id,d,u]])=>$('#'+id+'-v').textContent=fmt(E[k],d)+u);
  const R=econ();
  $('#e-k1').textContent=fmt(R.npv,1); $('#e-k1').style.color= R.npv>=0?'':css('--bad');
  $('#e-k2').textContent= R.irr===null?'–':fmt(R.irr*100,1)+' %'; $('#e-k2s').textContent= R.irr!==null&&R.irr>E.r/100?'выше ставки дисконтирования':'ниже ставки дисконтирования';
  $('#e-k3').textContent= R.dpp===null?'более 5':fmt(R.dpp,1);
  const svg=$('#e-chart'),W=720,H=280,l=56,rr=16,t=18,b=34,pw=W-l-rr,ph=H-t-b;
  const vals=R.cum; let mn=Math.min(0,...vals), mx=Math.max(0,...vals); const span=(mx-mn)||1; mn-=span*0.08; mx+=span*0.1;
  const X=i=>l+(i+0.5)*pw/vals.length, Y=v=>t+(1-(v-mn)/(mx-mn))*ph, bw=pw/vals.length*0.5;
  let g=''; const st=Math.pow(10,Math.floor(Math.log10(span/4))); const step=[1,2,5,10].map(m=>m*st).find(s=>span/s<=6)||st*10;
  for(let v=Math.ceil(mn/step)*step;v<=mx;v+=step){g+=`<line class="grid" x1="${l}" x2="${W-rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l-8}" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}
  g+=`<line class="axis" x1="${l}" x2="${W-rr}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  const ink=css('--ink'), bad=css('--bad');
  vals.forEach((v,i)=>{const y0=Y(0),y1=Y(v),h=Math.max(Math.abs(y1-y0),1); g+=`<rect x="${X(i)-bw/2}" y="${Math.min(y0,y1)}" width="${bw}" height="${h}" rx="${Math.min(10,bw/2,h/2)}" fill="${v>=0?ink:bad}"/><text x="${X(i)}" y="${H-12}" text-anchor="middle">${i===0?'вложения':i+'-й год'}</text><text x="${X(i)}" y="${v>=0?y1-7:y1+15}" text-anchor="middle" style="fill:${ink};font-weight:700">${fmt(v,1)}</text>`;});
  g+=`<text x="${l}" y="11">накопленный дисконтированный поток, млн руб.</text>`;
  svg.innerHTML=g;
  $('#e-tab').innerHTML='<thead><tr><th>Год</th><th>Реализация</th><th>Прирост выручки</th><th>Маржа</th><th>Снижение претензий</th><th>Поток</th></tr></thead><tbody>'+
    R.rows.map(x=>`<tr><td>${x.y}</td><td class="n">${fmt(x.re*100)} %</td><td class="n">${fmt(x.dr,1)}</td><td class="n">${fmt(x.dm,1)}</td><td class="n">${fmt(x.claims,1)}</td><td class="n">${fmt(x.cf,1)}</td></tr>`).join('')+'</tbody>';
}

initApron(); initCap(); initEcon(); route();
})();
