/* Общие элементы интерфейса: стеклянный переключатель с перетаскиваемым бегунком,
   блик за указателем, заливка ползунков, переключение светлой и темной темы. */
(function(){
"use strict";

/* ---------- тема ---------- */
const KEY='cc-theme';
function getStored(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
function setStored(v){try{localStorage.setItem(KEY,v);}catch(e){}}
const st=getStored(); if(st==='light'||st==='dark') document.documentElement.dataset.theme=st;
function isDark(){const t=document.documentElement.dataset.theme; if(t) return t==='dark'; return matchMedia('(prefers-color-scheme: dark)').matches;}
function toggleTheme(){const v=isDark()?'light':'dark'; document.documentElement.dataset.theme=v; setStored(v); document.dispatchEvent(new CustomEvent('themechange'));}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>document.dispatchEvent(new CustomEvent('themechange')));

/* ---------- блик за указателем ---------- */
document.addEventListener('pointermove',e=>{
  const g=e.target.closest&&e.target.closest('.glass'); if(!g) return;
  const r=g.getBoundingClientRect();
  g.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
  g.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
},{passive:true});

/* ---------- ползунки: закрашенная часть дорожки ---------- */
function fillRange(el){const mn=+el.min||0,mx=+el.max||100; el.style.setProperty('--p',((el.value-mn)/(mx-mn)*100)+'%');}
document.addEventListener('input',e=>{if(e.target.type==='range')fillRange(e.target);});
function fillAll(){document.querySelectorAll('input[type=range]').forEach(fillRange);}

/* ---------- стеклянный сегментный переключатель ----------
   el – контейнер, items – [{k, label, html?}], value – выбранный ключ, onChange(k) */
function GlassSeg(el,items,value,onChange,opts={}){
  el.classList.add('gseg','glass'); if(opts.tabs) el.classList.add('tabs');
  el.setAttribute('role','radiogroup'); if(opts.label) el.setAttribute('aria-label',opts.label);
  el.innerHTML='<span class="gthumb" aria-hidden="true"></span>'+items.map(it=>
    `<button type="button" role="radio" data-k="${it.k}" aria-checked="false" tabindex="-1">${it.html||it.label}</button>`).join('');
  const thumb=el.querySelector('.gthumb'), btns=[...el.querySelectorAll('button')];
  let cur=value, drag=null;
  function rectOf(b){const c=el.getBoundingClientRect(), r=b.getBoundingClientRect(); return {x:r.left-c.left,y:r.top-c.top,w:r.width,h:r.height};}
  function put(b){if(!b)return; const r=rectOf(b); thumb.style.width=r.w+'px'; thumb.style.height=r.h+'px'; thumb.style.transform=`translate(${r.x}px,${r.y}px)`;}
  function mark(k){btns.forEach(b=>{const on=b.dataset.k===k; b.setAttribute('aria-checked',on); b.tabIndex=on?0:-1;});}
  function set(k,fire){cur=k; mark(k); put(btns.find(b=>b.dataset.k===k)); if(fire&&onChange) onChange(k);}
  function nearest(px,py){let best=null,bd=1e9; btns.forEach(b=>{const r=rectOf(b); const cx=r.x+r.w/2, cy=r.y+r.h/2; const d=Math.hypot((px-cx)/Math.max(r.w,40),(py-cy)/(r.h*0.8)); if(d<bd){bd=d;best=b;}}); return best;}
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0) return;
    const c=el.getBoundingClientRect();
    drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,moved:false,c,btn:e.target.closest('button')};
    el.setPointerCapture(e.pointerId);
    const b=btns.find(b=>b.dataset.k===cur); if(b) b.classList.add('pressing');
    thumb.style.transform+=' scale(1.04)';
  });
  el.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id) return;
    const dx=e.clientX-drag.x0, dy=e.clientY-drag.y0;
    if(!drag.moved && Math.hypot(dx,dy)<5) return;
    drag.moved=true; el.classList.add('dragging');
    const c=el.getBoundingClientRect(); const px=e.clientX-c.left, py=e.clientY-c.top;
    const nb=nearest(px,py); btns.forEach(b=>b.classList.toggle('near',b===nb));
    const r=rectOf(nb); const stretch=1+Math.min(Math.abs(e.movementX||0)/40,0.18);
    const x=Math.max(0,Math.min(c.width-r.w,px-r.w/2)), y=Math.max(0,Math.min(c.height-r.h,py-r.h/2));
    thumb.style.width=r.w+'px'; thumb.style.height=r.h+'px';
    thumb.style.transform=`translate(${x}px,${y}px) scale(${stretch.toFixed(3)},${(2-stretch).toFixed(3)})`;
  });
  function end(e){
    if(!drag||e.pointerId!==drag.id) return;
    el.classList.remove('dragging'); btns.forEach(b=>b.classList.remove('near','pressing'));
    let k=cur;
    if(drag.moved){const c=el.getBoundingClientRect(); const nb=nearest(e.clientX-c.left,e.clientY-c.top); if(nb)k=nb.dataset.k;}
    else if(drag.btn) k=drag.btn.dataset.k;
    drag=null; const changed=k!==cur; set(k,changed); if(!changed) put(btns.find(b=>b.dataset.k===k));
  }
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',e=>{if(drag){drag.moved=false;drag.btn=null;} end(e);});
  el.addEventListener('keydown',e=>{
    const i=btns.findIndex(b=>b.dataset.k===cur); let j=null;
    if(e.key==='ArrowRight'||e.key==='ArrowDown') j=(i+1)%btns.length;
    if(e.key==='ArrowLeft'||e.key==='ArrowUp') j=(i-1+btns.length)%btns.length;
    if(j!==null){e.preventDefault(); set(btns[j].dataset.k,true); btns[j].focus();}
  });
  new ResizeObserver(()=>put(btns.find(b=>b.dataset.k===cur))).observe(el);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>put(btns.find(b=>b.dataset.k===cur)));
  set(value,false);
  return {set:k=>set(k,false),get:()=>cur,el};
}

window.UI={GlassSeg,toggleTheme,isDark,fillAll,fillRange};
})();
