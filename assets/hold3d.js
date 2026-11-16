/* Трехмерный вид: интерактивная модель Boeing 777-300ER с отсеками и контейнерами AKE.
   Для остальных типов пока строится схема нижней палубы.
   Размеры модели (м): длина 73,9, размах 64,8, высота 18,5, диаметр фюзеляжа 6,2 –
   по открытым данным производителя; контуры сверены с чертежами в трех проекциях.
   Ось x направлена к носу, y вверх, z на правый борт (грузовые двери). */
(function(){
"use strict";
const T=window.THREE;
const L=73.9, YC=6.2, FLOOR=YC-2.6;
const X=s=>L/2-s;                       // станция от носа -> мировая координата x
const lerp=(a,b,k)=>a+(b-a)*k;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
const easeOut=k=>1-Math.pow(1-k,3);

/* ---------- профиль фюзеляжа: радиус и смещение оси по станции ---------- */
const NOSE=7.0, R0=3.1;
const TAIL=[[54,3.1,0],[57,3.0,.12],[60,2.65,.38],[63,2.2,.68],[66,1.7,.98],[69,1.15,1.28],[71.5,.7,1.5],[73.2,.42,1.62],[73.9,.3,1.65]];
function pchip(keys,idx){ // монотонная кубическая интерполяция
  const xs=keys.map(k=>k[0]), ys=keys.map(k=>k[idx]), n=xs.length, d=[], m=[];
  for(let i=0;i<n-1;i++) d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
  m[0]=d[0]; m[n-1]=d[n-2];
  for(let i=1;i<n-1;i++){ if(d[i-1]*d[i]<=0) m[i]=0; else { const h0=xs[i]-xs[i-1], h1=xs[i+1]-xs[i]; const w1=2*h1+h0, w2=h1+2*h0; m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]); } }
  return s=>{ if(s<=xs[0]) return ys[0]; if(s>=xs[n-1]) return ys[n-1];
    let i=0; while(s>xs[i+1]) i++; const h=xs[i+1]-xs[i], t=(s-xs[i])/h, t2=t*t, t3=t2*t;
    return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1]; };
}
const tR=pchip(TAIL,1), tDY=pchip(TAIL,2);
function fus(s){
  if(s<NOSE){ const q=1-s/NOSE; return {r:R0*Math.pow(1-Math.pow(q,2.15),1/2.15), dy:-0.5*q*q}; }
  if(s<=54) return {r:R0,dy:0};
  return {r:tR(s),dy:tDY(s)};
}
function thetaAt(s,h){ // угол на сечении для высоты h над осью YC
  const f=fus(s); return Math.acos(clamp((h-f.dy)/f.r,-1,1));
}

/* ---------- текстура окраски фюзеляжа ---------- */
function liveryTexture(renderer){
  const W=4096,H=1024, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
  const U=s=>s/L*W, V=th=>th/(2*Math.PI)*H;
  g.fillStyle='#F4F5F7'; g.fillRect(0,0,W,H);
  // нижняя часть светло-серая
  const b1=V(1.95), b2=V(2*Math.PI-1.95);
  const gr=g.createLinearGradient(0,b1-30,0,b1+30); gr.addColorStop(0,'#F4F5F7'); gr.addColorStop(1,'#D9DCE0');
  g.fillStyle=gr; g.fillRect(0,b1-30,W,60); g.fillStyle='#D9DCE0'; g.fillRect(0,b1+30,W,b2-b1-60);
  const gr2=g.createLinearGradient(0,b2-30,0,b2+30); gr2.addColorStop(0,'#D9DCE0'); gr2.addColorStop(1,'#F4F5F7'); g.fillStyle=gr2; g.fillRect(0,b2-30,W,60);
  // тонкая красная линия вдоль борта
  [[1.70,1.74],[2*Math.PI-1.74,2*Math.PI-1.70]].forEach(([a,b])=>{g.fillStyle='#CE1F2C'; g.fillRect(U(8),V(a),U(58)-U(8),V(b)-V(a));});
  const doors=[7.3,19.4,33.4,50.0,61.0];
  const rr=(x,y,w,h,r)=>{g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();};
  // окна салона
  g.fillStyle='#2A2F36';
  for(let s=9.2;s<59.2;s+=0.533){
    if(doors.some(d=>Math.abs(s-d)<1.0)) continue;
    [1,-1].forEach(side=>{const th=thetaAt(s,0.85); const t=side>0?th:2*Math.PI-th; const w=U(0.25), h=V(0.36/fus(s).r);
      rr(U(s)-w/2,V(t)-h/2,w,h,Math.min(w,h)*0.45); g.fill();});
  }
  // пассажирские двери
  g.strokeStyle='#9DA3AB'; g.lineWidth=3;
  doors.forEach(s=>[1,-1].forEach(side=>{const t1=thetaAt(s,1.08), t2=thetaAt(s,-0.82); let a=side>0?t1:2*Math.PI-t2, b=side>0?t2:2*Math.PI-t1;
    rr(U(s-0.53),V(a),U(1.07),V(b)-V(a),10); g.stroke();}));
  // остекление кабины
  g.fillStyle='#1E2329';
  [[0.07,0.43],[0.47,0.79],[0.83,1.07]].forEach(([a,b],i)=>[1,-1].forEach(side=>{
    const s0=2.3+i*0.22, s1=3.4+i*0.1; const p=[[s0+0.14,a],[s1-0.1,a],[s1,b],[s0,b]];
    g.beginPath(); p.forEach(([s,th],k)=>{const t=side>0?th:2*Math.PI-th; const x=U(s), y=V(t); k?g.lineTo(x,y):g.moveTo(x,y);}); g.closePath(); g.fill();}));
  // проемы грузовых дверей (под створками)
  g.fillStyle='#1A1D21';
  CARGO_DOORS.forEach(d=>{const a=thetaAt(d.s1,d.h1), b=thetaAt(d.s1,d.h2); g.fillRect(U(d.s1),V(a),U(d.s2)-U(d.s1),V(b)-V(a));});
  const tex=new T.CanvasTexture(cv); tex.flipY=false; tex.encoding=T.sRGBEncoding; tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return tex;
}
/* грузовые двери правого борта: станции и высоты над осью, м */
const CARGO_DOORS=[
  {k:'fwd',n:'Передняя грузовая дверь',s1:11.2,s2:13.9,h1:-1.05,h2:-2.72},
  {k:'aft',n:'Задняя грузовая дверь',s1:50.8,s2:52.6,h1:-1.05,h2:-2.62},
  {k:'blk',n:'Дверь навалочного отсека',s1:55.6,s2:56.75,h1:-1.45,h2:-2.3}
];

/* ---------- вспомогательные построения ---------- */
function gridGeometry(rows,cols,fn){ // поверхность из сетки rows×cols точек fn(i,j)->[x,y,z,u,v]
  const pos=[],uv=[],idx=[];
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const p=fn(i,j); pos.push(p[0],p[1],p[2]); uv.push(p[3]||0,p[4]||0);}
  for(let i=0;i<rows-1;i++)for(let j=0;j<cols-1;j++){const a=i*cols+j,b=a+1,c=a+cols,d=c+1; idx.push(a,c,b,b,c,d);}
  const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
function airfoil(n,t,camber){ // замкнутый контур: верх от задней кромки к передней, затем низ
  const pts=[], xs=[]; for(let i=0;i<=n;i++) xs.push((1-Math.cos(Math.PI*i/n))/2);
  const yt=x=>5*t*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);
  const yc=x=>camber? (x<0.4? camber/0.16*(0.8*x-x*x) : camber/0.36*(0.2+0.8*x-x*x)) : 0;
  for(let i=n;i>=0;i--){const x=xs[i]; pts.push([x,yc(x)+yt(x)]);}
  for(let i=1;i<n;i++){const x=xs[i]; pts.push([x,yc(x)-yt(x)]);}
  pts.push(pts[0].slice()); return pts;
}
function loft(sections){ // sections: массив замкнутых контуров одинаковой длины (массивы Vector3)
  const rows=sections.length, cols=sections[0].length;
  return gridGeometry(rows,cols,(i,j)=>{const p=sections[i][j]; return [p.x,p.y,p.z,j/(cols-1),i/(rows-1)];});
}
function capGeometry(ring){ // плоская заглушка веером
  const c=new T.Vector3(); ring.forEach(p=>c.add(p)); c.multiplyScalar(1/ring.length);
  const pos=[c.x,c.y,c.z], idx=[]; ring.forEach(p=>pos.push(p.x,p.y,p.z));
  for(let i=1;i<=ring.length;i++) idx.push(0,i,i+1>ring.length?1:i+1);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* ---------- самолет 777-300ER ---------- */
function buildB777(ctx){
  const root=new T.Group(); root.name='B777-300ER';
  const M={
    skin:new T.MeshStandardMaterial({map:liveryTexture(ctx.renderer),roughness:.38,metalness:.06}),
    white:new T.MeshStandardMaterial({color:0xEEF0F2,roughness:.4,metalness:.06}),
    wing:new T.MeshStandardMaterial({color:0xD5D9DE,roughness:.45,metalness:.12}),
    belly:new T.MeshStandardMaterial({color:0xD9DCE0,roughness:.45,metalness:.05}),
    red:new T.MeshStandardMaterial({color:0xCE1F2C,roughness:.42,metalness:.05}),
    dark:new T.MeshStandardMaterial({color:0x22262B,roughness:.6,metalness:.2}),
    blade:new T.MeshStandardMaterial({color:0x5A6068,roughness:.3,metalness:.7}),
    tire:new T.MeshStandardMaterial({color:0x1C1E21,roughness:.85}),
    metal:new T.MeshStandardMaterial({color:0xA7ADB4,roughness:.35,metalness:.6})
  };
  M.dark.side=T.DoubleSide;
  Object.values(M).forEach(m=>{if(m.color&&!m.map) m.color.convertSRGBToLinear();});
  const shell=[]; // материалы, которые становятся прозрачными в режиме просвета

  // фюзеляж
  const st=[]; for(let i=0;i<=60;i++){const k=i/60; st.push(NOSE*(1-Math.cos(k*Math.PI/2)));}
  for(let s=8;s<54;s+=2) st.push(s);
  for(let s=54;s<=73.9001;s+=0.45) st.push(Math.min(s,73.9));
  if(st[st.length-1]<73.9) st.push(73.9);
  const SEG=72;
  const fgeo=gridGeometry(st.length,SEG+1,(i,j)=>{const s=st[i], f=fus(s), th=j/SEG*2*Math.PI;
    return [X(s),YC+f.dy+f.r*Math.cos(th),f.r*Math.sin(th),s/L,j/SEG];});
  const fusel=new T.Mesh(fgeo,M.skin); fusel.castShadow=true; root.add(fusel); shell.push(M.skin);
  // сопло ВСУ
  const ft=fus(73.9); const apu=new T.Mesh(new T.CircleGeometry(ft.r,28),M.dark); apu.rotation.y=-Math.PI/2; apu.position.set(X(73.9)-0.01,YC+ft.dy,0); root.add(apu);
  // обтекатель центроплана
  const fair=new T.Mesh(new T.SphereGeometry(1,48,24),M.belly); fair.scale.set(11.5,1.35,3.3); fair.position.set(X(34.5),YC-2.35,0); fair.castShadow=true; root.add(fair);
  M.belly.userData.op=.3; shell.push(M.belly);

  // крыло
  const wst=[2.6,3.1,5,7,9,11,14,17,20,23,26,28.5,29.8,31.1,32.4];
  const LE=b=> b<=28.5? 27.5+0.637*b : lerp(45.65,49.3,(b-28.5)/3.9);
  const TE=b=> b<=3.1? 41.5 : b<=11? lerp(41.5,42.6,(b-3.1)/7.9) : b<=28.5? lerp(42.6,47.9,(b-11)/17.5) : lerp(47.9,50.0,(b-28.5)/3.9);
  const TC=b=> b<=11? lerp(.14,.105,(b-2.6)/8.4) : lerp(.105,.09,(b-11)/21.4);
  const Y0=b=>4.2+0.105*b + (b>29? (b-29)*0.06:0);
  function wingHalf(){
    const secs=wst.map(b=>{const le=LE(b), c=TE(b)-le; return airfoil(14,TC(b),0.018).map(([x,y])=>new T.Vector3(X(le+x*c),Y0(b)+y*c,b));});
    const g=new T.Group(); const w=new T.Mesh(loft(secs),M.wing); w.castShadow=true; g.add(w);
    g.add(new T.Mesh(capGeometry(secs[secs.length-1].slice(0,-1)),M.wing));
    return g;
  }

  // двигатель GE90-115B
  const fans=[];
  function engine(){
    const g=new T.Group();
    const pts=[[1.62,0],[1.79,.06],[1.91,.28],[1.97,.85],[1.97,2.4],[1.86,4.4],[1.62,5.8],[1.38,6.9],[1.3,7.25],[1.06,7.25],[1.0,7.7],[.84,8.5],[.7,8.9],[.56,8.9],[.32,9.55],[.03,10.0]];
    const shellG=new T.LatheGeometry(pts.map(([r,y])=>new T.Vector2(r,y)),48);
    const sh=new T.Mesh(shellG,M.white); sh.castShadow=true; g.add(sh);
    const lip=new T.Mesh(new T.TorusGeometry(1.72,0.12,12,48),M.red); lip.rotation.x=Math.PI/2; lip.position.y=0.05; g.add(lip);
    const inner=new T.Mesh(new T.LatheGeometry([[1.62,0],[1.56,.3],[1.52,.95]].map(([r,y])=>new T.Vector2(r,y)),48),M.dark); g.add(inner);
    const disc=new T.Mesh(new T.CircleGeometry(1.52,40),M.dark); disc.rotation.x=Math.PI/2; disc.position.y=1.0; g.add(disc);
    const fan=new T.Group(); fan.position.y=0.92;
    for(let i=0;i<22;i++){const bl=new T.Mesh(new T.BoxGeometry(0.34,0.05,1.05),M.blade); const a=i/22*Math.PI*2;
      const piv=new T.Group(); piv.rotation.y=a; bl.position.z=0.98; bl.rotation.z=0.55; piv.add(bl); fan.add(piv);}
    const sp=new T.Mesh(new T.ConeGeometry(0.5,0.9,28),M.white); sp.rotation.x=Math.PI; sp.position.y=-0.38; fan.add(sp);
    const swirl=new T.Mesh(new T.TorusGeometry(0.28,0.02,6,24,Math.PI*1.2),M.dark); swirl.rotation.x=Math.PI/2; swirl.position.y=-0.5; fan.add(swirl);
    g.add(fan); fans.push(fan);
    g.rotation.z=Math.PI/2;           // ось двигателя вдоль -x (назад)
    return g;
  }
  function pylon(){
    const sh=new T.Shape(); [[30.6,4.3],[33.0,5.05],[41.6,5.05],[39.2,3.95],[36.4,3.8]].forEach(([s,y],i)=>i?sh.lineTo(X(s),y):sh.moveTo(X(s),y));
    const g=new T.ExtrudeGeometry(sh,{depth:.6,bevelEnabled:false}); g.translate(0,0,-.3);
    const m=new T.Mesh(g,M.white); m.castShadow=true; return m;
  }
  // стабилизатор
  function stabHalf(){
    const bs=[1.4,3,5,7,9,10.75];
    const secs=bs.map(b=>{const le=64.0+0.754*b, te=70.5+(74.0-70.5)/10.75*b, c=te-le; return airfoil(10,.1,0).map(([x,y])=>new T.Vector3(X(le+x*c),YC+.95+.123*b+y*c,b));});
    const g=new T.Group(); const m=new T.Mesh(loft(secs),M.white); m.castShadow=true; g.add(m);
    g.add(new T.Mesh(capGeometry(secs[secs.length-1].slice(0,-1)),M.white)); return g;
  }
  // киль
  {
    const hs=[8.0,9.5,11.5,13.5,15.5,17.2,18.5];
    const secs=hs.map(y=>{const k=(y-8.0)/10.5, le=lerp(60.2,69.6,k), te=lerp(71.6,73.1,k), c=te-le; return airfoil(12,.11,0).map(([x,z])=>new T.Vector3(X(le+x*c),y,z*c));});
    const fin=new T.Mesh(loft(secs),M.red); fin.castShadow=true; root.add(fin);
    root.add(new T.Mesh(capGeometry(secs[secs.length-1].slice(0,-1)),M.red));
  }
  // шасси
  function mainGear(){
    const g=new T.Group();
    const strut=new T.Mesh(new T.CylinderGeometry(.2,.24,3.4,16),M.metal); strut.position.set(X(36.4),2.75,0); strut.castShadow=true; g.add(strut);
    const brace=new T.Mesh(new T.CylinderGeometry(.09,.09,3.2,8),M.metal); brace.position.set(X(37.6),2.9,-.9); brace.rotation.set(.35,0,-.38); g.add(brace);
    const beam=new T.Mesh(new T.BoxGeometry(3.5,.26,.28),M.metal); beam.position.set(X(36.4),.86,0); g.add(beam);
    [-1.45,0,1.45].forEach(dx=>[-.72,.72].forEach(dz=>{
      const w=new T.Group(); w.position.set(X(36.4)+dx,.66,dz);
      const tire=new T.Mesh(new T.CylinderGeometry(.66,.66,.48,28),M.tire); tire.rotation.x=Math.PI/2; tire.castShadow=true; w.add(tire);
      const hub=new T.Mesh(new T.CylinderGeometry(.36,.36,.5,20),M.metal); hub.rotation.x=Math.PI/2; w.add(hub); g.add(w);}));
    return g;
  }
  [1,-1].forEach(side=>{
    const half=new T.Group(); half.scale.z=side;
    half.add(wingHalf());
    const e=engine(); e.position.set(X(28.8),2.5,9.6); half.add(e);
    const p=pylon(); p.position.z=9.6; half.add(p);
    half.add(stabHalf());
    const mg=mainGear(); mg.position.z=5.5; half.add(mg);
    root.add(half);
  });
  {
    const g=new T.Group();
    const strut=new T.Mesh(new T.CylinderGeometry(.14,.17,2.6,12),M.metal); strut.position.set(X(5.3),2.0,0); g.add(strut);
    [-.33,.33].forEach(dz=>{const t=new T.Mesh(new T.CylinderGeometry(.6,.6,.4,24),M.tire); t.rotation.x=Math.PI/2; t.position.set(X(5.3),.6,dz); t.castShadow=true; g.add(t);
      const h=new T.Mesh(new T.CylinderGeometry(.3,.3,.42,16),M.metal); h.rotation.x=Math.PI/2; h.position.copy(t.position); g.add(h);});
    root.add(g);
  }

  // створки грузовых дверей (петля сверху, открываются вверх наружу)
  const doorMat=new T.MeshStandardMaterial({color:0xF4F5F7,roughness:.4,metalness:.06,side:T.DoubleSide}); doorMat.color.convertSRGBToLinear(); shell.push(doorMat); doorMat.userData.op=.28;
  const doors=CARGO_DOORS.map(d=>{
    const t1=thetaAt(d.s1,d.h1), t2=thetaAt(d.s1,d.h2), f=fus((d.s1+d.s2)/2), r=f.r+0.03;
    const py=YC+f.dy+r*Math.cos(t1), pz=r*Math.sin(t1);
    const geo=gridGeometry(6,10,(i,j)=>{const s=lerp(d.s1,d.s2,i/5), th=lerp(t1,t2,j/9), ff=fus(s), rr=ff.r+0.03; return [X(s)-X(d.s1),YC+ff.dy+rr*Math.cos(th)-py,rr*Math.sin(th)-pz];});
    const piv=new T.Group(); piv.position.set(X(d.s1),py,pz);
    const m=new T.Mesh(geo,doorMat); m.castShadow=true; piv.add(m);
        const pts=[]; for(let i=0;i<=5;i++)pts.push([i/5,0]); for(let j=0;j<=9;j++)pts.push([1,j/9]); for(let i=5;i>=0;i--)pts.push([i/5,1]); for(let j=9;j>=0;j--)pts.push([0,j/9]);
    const lg=new T.BufferGeometry().setFromPoints(pts.map(([a,b])=>{const s=lerp(d.s1,d.s2,a), th=lerp(t1,t2,b), ff=fus(s), rr=ff.r+0.045; return new T.Vector3(X(s)-X(d.s1),YC+ff.dy+rr*Math.cos(th)-py,rr*Math.sin(th)-pz);}));
    piv.add(new T.Line(lg,new T.LineBasicMaterial({color:0x8A9099})));
    root.add(piv); return {d,piv,angle:0};
  });

  // отсеки: пол, роликовые дорожки, обшивка нижней палубы
  const holds=new T.Group(); root.add(holds);
  const floorMat=new T.MeshStandardMaterial({color:0x3A3F46,roughness:.8,transparent:true,opacity:.85});
  const linerMat=new T.MeshBasicMaterial({color:0x9AA3AD,transparent:true,opacity:.07,side:T.DoubleSide,depthWrite:false});
  [[9.7,28.95,'fwd'],[40.5,55.0,'aft'],[55.0,58.2,'blk']].forEach(([s1,s2])=>{
    const w=3.36; const fl=new T.Mesh(new T.BoxGeometry(X(s1)-X(s2),.06,w),floorMat); fl.position.set((X(s1)+X(s2))/2,FLOOR-.03,0); holds.add(fl);
    const ln=[]; for(let z=-1.4;z<=1.41;z+=0.35){ln.push(new T.Vector3(X(s1),FLOOR+.005,z),new T.Vector3(X(s2),FLOOR+.005,z));}
    holds.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(ln),new T.LineBasicMaterial({color:0x6B737C,transparent:true,opacity:.6})));
    const lin=gridGeometry(4,20,(i,j)=>{const s=lerp(s1,s2,i/3), th=lerp(2.0,2*Math.PI-2.0,j/19), f=fus(s), r=f.r-.12; return [X(s),YC+f.dy+r*Math.cos(th),r*Math.sin(th)];});
    holds.add(new T.Mesh(lin,linerMat));
  });

  // позиции AKE: 12 рядов в переднем отсеке, 9 рядов в заднем
  const P=[], pitch=1.59;
  for(let i=0;i<12;i++)for(let sd=0;sd<2;sd++)P.push({id:`${11+i}${sd?'R':'L'}`,hold:'fwd',row:i,side:sd,x:X(9.8+i*pitch+pitch/2),z:0,door:'fwd'});
  for(let i=0;i<9;i++)for(let sd=0;sd<2;sd++)P.push({id:`${31+i}${sd?'R':'L'}`,hold:'aft',row:i,side:sd,x:X(40.6+i*pitch+pitch/2),z:0,door:'aft'});

  const labels=[
    {t:'Передний отсек',p:new T.Vector3(X(19.3),FLOOR+2.4,0)},
    {t:'Задний отсек',p:new T.Vector3(X(47.8),FLOOR+2.4,0)}
  ];
  const doorPos={fwd:new T.Vector3(X(12.55),FLOOR,0),aft:new T.Vector3(X(51.7),FLOOR,0)};
  return {root,P,shell,doors,fans,labels,doorPos,full:true,extent:40,
    presets:{iso:{th:.95,ph:.42,dist:80,t:[0,6,0]},side:{th:0,ph:.05,dist:90,t:[0,7.5,0]},top:{th:0,ph:1.5,dist:118,t:[0,4,0]},hold:{th:.3,ph:.62,dist:52,t:[X(33),4.4,0]}}};
}

/* ---------- схема нижней палубы для остальных типов ---------- */
function buildSchematic(ac){
  const root=new T.Group(); const P=[]; const rowsF=ac.fwd/2, rowsA=ac.aft/2, pitch=1.59, gap=6;
  const total=(rowsF+rowsA)*pitch+gap; let x0=total/2;
  for(let i=0;i<rowsF;i++)for(let s=0;s<2;s++)P.push({id:`${i+11}${s?'R':'L'}`,hold:'fwd',row:i,side:s,x:x0-i*pitch-pitch/2,z:0,door:'fwd'});
  const xa=x0-rowsF*pitch-gap; for(let i=0;i<rowsA;i++)for(let s=0;s<2;s++)P.push({id:`${i+31}${s?'R':'L'}`,hold:'aft',row:i,side:s,x:xa-i*pitch-pitch/2,z:0,door:'aft'});
  const R=2.85, cy=FLOOR+2.45;
  const mat=new T.MeshBasicMaterial({color:0x8899AA,wireframe:true,transparent:true,opacity:.14});
  const cyl=new T.Mesh(new T.CylinderGeometry(R,R,total+6,40,8,true),mat); cyl.rotation.z=Math.PI/2; cyl.position.y=cy; root.add(cyl);
  const fl=new T.Mesh(new T.BoxGeometry(total+4,.06,3.2),new T.MeshStandardMaterial({color:0x3A3F46,roughness:.8,transparent:true,opacity:.8})); fl.position.y=FLOOR-.03; root.add(fl);
  const fx=x0-rowsF*pitch/2, ax=xa-rowsA*pitch/2;
  return {root,P,shell:[],doors:[],fans:[],full:false,extent:total/2+3,
    labels:[{t:'Передний отсек',p:new T.Vector3(fx,FLOOR+2.4,0)},{t:'Задний отсек',p:new T.Vector3(ax,FLOOR+2.4,0)}],
    doorPos:{fwd:new T.Vector3(x0-1.6,FLOOR,0),aft:new T.Vector3(xa-rowsA*pitch+1.6,FLOOR,0)},
    presets:{iso:{th:.85,ph:.5,dist:60,t:[0,FLOOR+1,0]},side:{th:0,ph:.06,dist:58,t:[0,FLOOR+1,0]},top:{th:0,ph:1.5,dist:62,t:[0,FLOOR,0]},hold:{th:.5,ph:.4,dist:34,t:[fx,FLOOR+1,0]}}};
}

/* ---------- контейнер AKE ---------- */
let ULD_GEO=null, ULD_EDGE=null;
function uldGeo(){
  if(ULD_GEO) return ULD_GEO;
  const sh=new T.Shape(); sh.moveTo(.03,0); sh.lineTo(1.56,0); sh.lineTo(2.0,.64); sh.lineTo(2.0,1.6); sh.lineTo(.03,1.6); sh.lineTo(.03,0);
  const g=new T.ExtrudeGeometry(sh,{depth:1.5,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:1}); g.translate(0,0,-.75);
  ULD_GEO=g; ULD_EDGE=new T.EdgesGeometry(g,30); return g;
}
function orient(obj,side){obj.rotation.y= side? -Math.PI/2 : Math.PI/2;} // правый ряд к +z, левый к -z

/* ==================== просмотрщик ==================== */
function create(o){
  const cv=o.canvas;
  const renderer=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.outputEncoding=T.sRGBEncoding; renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();
  const cam=new T.PerspectiveCamera(32,16/9,0.5,800);
  const hemi=new T.HemisphereLight(0xffffff,0x80858c,.7); scene.add(hemi);
  const sun=new T.DirectionalLight(0xffffff,.95); sun.position.set(30,60,40); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:200}); sun.shadow.bias=-0.0006; scene.add(sun);
  const fill=new T.DirectionalLight(0xffffff,.35); fill.position.set(-40,20,-30); scene.add(fill);
  const ground=new T.Mesh(new T.PlaneGeometry(400,400),new T.ShadowMaterial({opacity:.2})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  let grid=null;

  const S={model:null,slots:[],cargo:new Map(),tweens:[],xray:true,doorsOpen:false,spin:false,active:false,hover:null,token:0,
    rot:{th:.95,ph:.36,dist:96,t:new T.Vector3(0,6.5,0)},vel:{th:0,ph:0},ptr:new Map(),drag:null};
  const slotMat=()=>new T.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.07,depthWrite:false});
  const api={_S:S}; S.cam=cam;

  function themeColors(){const dark=window.UI&&UI.isDark(); return {dark,ghost:dark?0xffffff:0x111111,grid:dark?0x3a3a40:0xcfcfd4,grid2:dark?0x222226:0xe4e4e8};}
  function makeGrid(){if(grid) scene.remove(grid); const c=themeColors(); grid=new T.GridHelper(220,44,c.grid,c.grid2); grid.material.transparent=true; grid.material.opacity=.55; grid.position.y=.002; scene.add(grid);
    ground.material.opacity=c.dark?.45:.2;}
  makeGrid();

  function applyXray(){
    if(!S.model) return;
    S.model.shell.forEach(m=>{m.transparent=S.xray; m.opacity=S.xray?(m.userData.op||.3):1; m.depthWrite=!S.xray; m.needsUpdate=true;});
  }
  api.setType=(key,ac)=>{
    S.token++; S.tweens.length=0;
    if(S.model) scene.remove(S.model.root);
    S.cargo.forEach(m=>m.parent&&m.parent.remove(m)); S.cargo.clear();
    S.model= key==='B777-300ER'? buildB777({renderer}) : buildSchematic(ac);
    scene.add(S.model.root);
    // посадочные места (призраки) для выбора
    uldGeo(); S.slots=[];
    const c=themeColors();
    S.model.P.forEach(p=>{const m=new T.Mesh(ULD_GEO,slotMat()); m.material.color.set(c.ghost); orient(m,p.side); m.position.set(p.x,FLOOR,p.z); m.userData={id:p.id,slot:true};
      const e=new T.LineSegments(ULD_EDGE,new T.LineBasicMaterial({color:c.ghost,transparent:true,opacity:.28})); m.add(e); m.userData.edge=e;
      S.model.root.add(m); S.slots.push(m);});
    S.doorsOpen=false; api.onDoors&&api.onDoors(false);
    applyXray();
    o.note.hidden=S.model.full; if(!S.model.full) o.note.textContent='Подробная модель этого типа в работе, сейчас показана схема нижней палубы';
    o.labels.innerHTML=S.model.labels.map(l=>`<div class="vlabel glass">${l.t}</div>`).join('');
    api.preset('iso',true);
    return S.model.P.map(p=>({id:p.id,hold:p.hold,row:p.row,side:p.side}));
  };

  /* ---------- камера ---------- */
  function place(){const r=S.rot, d=r.dist*Math.pow(Math.max(1,1.65/cam.aspect),.85); cam.position.set(r.t.x+d*Math.cos(r.ph)*Math.sin(r.th), r.t.y+d*Math.sin(r.ph), r.t.z+d*Math.cos(r.ph)*Math.cos(r.th)); cam.lookAt(r.t);}
  api.preset=(k,instant)=>{const p=S.model.presets[k]; const from={th:S.rot.th,ph:S.rot.ph,dist:S.rot.dist,t:S.rot.t.clone()};
    let th=p.th; while(th-from.th>Math.PI) th-=2*Math.PI; while(from.th-th>Math.PI) th+=2*Math.PI;
    const to={th,ph:p.ph,dist:p.dist,t:new T.Vector3(...p.t)};
    if(instant){Object.assign(S.rot,{th:to.th,ph:to.ph,dist:to.dist}); S.rot.t.copy(to.t); place(); return;}
    tween(900,k=>{const e=ease(k); S.rot.th=lerp(from.th,to.th,e); S.rot.ph=lerp(from.ph,to.ph,e); S.rot.dist=lerp(from.dist,to.dist,e); S.rot.t.lerpVectors(from.t,to.t,e);});
  };

  /* ---------- анимации ---------- */
  function tween(ms,fn,done,delay=0){const t0=performance.now()+delay; S.tweens.push({t0,ms,fn,done}); }
  function step(now){
    for(let i=S.tweens.length-1;i>=0;i--){const tw=S.tweens[i]; if(now<tw.t0) continue; const k=Math.min(1,(now-tw.t0)/tw.ms); tw.fn(k); if(k>=1){S.tweens.splice(i,1); tw.done&&tw.done();}}
  }

  /* ---------- двери ---------- */
  api.doors=(open,cb)=>{
    if(!S.model||!S.model.doors.length){api.onDoors&&api.onDoors(false); cb&&cb(); return;}
    S.doorsOpen=open; api.onDoors&&api.onDoors(open);
    S.model.doors.forEach((d,i)=>{const a0=d.piv.rotation.x, a1=open?-1.95:0; tween(900,k=>{d.piv.rotation.x=lerp(a0,a1,ease(k));},i===0?cb:null,i*120);});
  };
  api.xray=v=>{S.xray=v; applyXray();};
  api.spin=v=>{S.spin=v;};

  /* ---------- груз ---------- */
  function cargoMesh(color){const m=new T.Mesh(ULD_GEO,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.55,metalness:.15})); m.castShadow=true;
    m.add(new T.LineSegments(ULD_EDGE,new T.LineBasicMaterial({color:0x111111,transparent:true,opacity:.35}))); return m;}
  const slotById=id=>S.slots.find(s=>s.userData.id===id);
  api.paint=(colorOf,changed)=>{
    S.slots.forEach(sl=>{
      const id=sl.userData.id, c=colorOf(id), m=S.cargo.get(id);
      if(c&&!m){const nm=cargoMesh(c); nm.userData={id}; nm.rotation.y=sl.rotation.y; nm.position.copy(sl.position); S.model.root.add(nm); S.cargo.set(id,nm);
        if(changed===id){nm.position.y=FLOOR+1.6; nm.scale.setScalar(.6); tween(380,k=>{const e=easeOut(k); nm.position.y=lerp(FLOOR+1.6,FLOOR,e); nm.scale.setScalar(lerp(.6,1,e));});}}
      else if(c&&m){m.material.color.set(c).convertSRGBToLinear();}
      else if(!c&&m){S.cargo.delete(id); if(changed===id){tween(220,k=>{m.scale.setScalar(1-k*.9); m.position.y=FLOOR+k*.6;},()=>m.parent&&m.parent.remove(m));} else m.parent&&m.parent.remove(m);}
    });
  };
  api.load=(colorOf)=>{
    const tok=++S.token; S.tweens=S.tweens.filter(t=>!t.cargo);
    S.cargo.forEach(m=>m.parent&&m.parent.remove(m)); S.cargo.clear();
    const go=()=>{
      if(tok!==S.token) return;
      ['fwd','aft'].forEach(h=>{
        const dp=S.model.doorPos[h];
        const list=S.slots.filter(sl=>{const p=S.model.P.find(q=>q.id===sl.userData.id); return p.hold===h && colorOf(sl.userData.id);})
          .sort((a,b)=>Math.abs(b.position.x-dp.x)-Math.abs(a.position.x-dp.x)); // сначала дальние места
        list.forEach((sl,i)=>{
          const id=sl.userData.id, m=cargoMesh(colorOf(id)); m.userData={id}; m.rotation.y=sl.rotation.y; m.visible=false; S.model.root.add(m); S.cargo.set(id,m);
          const p0=new T.Vector3(dp.x,FLOOR,S.model.full?9:6), p1=new T.Vector3(dp.x,FLOOR,0), p2=sl.position.clone();
          const d2=p1.distanceTo(p2), ms=520+d2*55;
          const tw={t0:performance.now()+i*340+(h==='aft'?150:0),ms,cargo:true,fn:k=>{ if(tok!==S.token) return; m.visible=true; const a=520/ms;
            if(k<a){m.position.lerpVectors(p0,p1,ease(k/a));} else {m.position.lerpVectors(p1,p2,ease((k-a)/(1-a)));} }};
          S.tweens.push(tw);
        });
      });
    };
    if(S.model.doors.length && !S.doorsOpen){ api.doors(true,go); } else go();
  };

  /* ---------- подписи ---------- */
  const v3=new T.Vector3();
  function labels(w,h){
    const els=o.labels.children; if(!S.model) return;
    S.model.labels.forEach((l,i)=>{const el=els[i]; if(!el) return; v3.copy(l.p); v3.project(cam);
      const vis=v3.z<1 && Math.abs(v3.x)<1.1 && Math.abs(v3.y)<1.1 && (!l.door || Math.cos(S.rot.th)>0.15);
      el.style.opacity= vis?1:0;
      el.style.transform=`translate(${(v3.x*.5+.5)*w}px,${(-v3.y*.5+.5)*h}px) translate(-50%,-50%)`;});
  }

  /* ---------- указатель: вращение, масштаб, выбор, подсказка ---------- */
  const ray=new T.Raycaster(), mouse=new T.Vector2();
  function pickAt(cx,cy){const rc=cv.getBoundingClientRect(); mouse.x=((cx-rc.left)/rc.width)*2-1; mouse.y=-((cy-rc.top)/rc.height)*2+1; ray.setFromCamera(mouse,cam);
    const objs=[...S.cargo.values(),...S.slots]; const hit=ray.intersectObjects(objs,false)[0]; return hit?hit.object.userData.id:null;}
  function setHover(id,cx,cy){
    if(S.hover!==id){
      const prev=S.hover&&slotById(S.hover); if(prev){prev.material.opacity=.07; prev.userData.edge.material.opacity=.28; const cm=S.cargo.get(S.hover); cm&&cm.material.emissive.set(0x000000);}
      S.hover=id; const cur=id&&slotById(id); if(cur){cur.material.opacity=.22; cur.userData.edge.material.opacity=.8; const cm=S.cargo.get(id); cm&&cm.material.emissive.set(0x333333);}
    }
    const tip=o.tip;
    if(id){const rc=o.viewer.getBoundingClientRect(); tip.innerHTML=o.describe(id); tip.style.left=(cx-rc.left)+'px'; tip.style.top=(cy-rc.top)+'px'; tip.classList.add('on'); cv.style.cursor='pointer';}
    else {tip.classList.remove('on'); cv.style.cursor='';}
  }
  cv.addEventListener('pointerdown',e=>{
    S.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY}); cv.setPointerCapture(e.pointerId);
    if(S.ptr.size===1){S.drag={x:e.clientX,y:e.clientY,moved:false,lx:e.clientX,ly:e.clientY,lt:performance.now()}; cv.classList.add('grabbing'); S.vel.th=S.vel.ph=0;}
    else {S.drag&&(S.drag.moved=true); const [a,b]=[...S.ptr.values()]; S.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),dist:S.rot.dist};}
  });
  cv.addEventListener('pointermove',e=>{
    if(!S.ptr.has(e.pointerId)){ if(e.pointerType==='mouse') setHover(pickAt(e.clientX,e.clientY),e.clientX,e.clientY); return; }
    S.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(S.ptr.size>=2&&S.pinch){const [a,b]=[...S.ptr.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); S.rot.dist=clamp(S.pinch.dist*S.pinch.d/d,14,180); return;}
    const d=S.drag; if(!d) return;
    const dx=e.clientX-d.lx, dy=e.clientY-d.ly; if(Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)>5) d.moved=true;
    if(d.moved){S.rot.th-=dx*.006; S.rot.ph=clamp(S.rot.ph+dy*.005,-.05,1.52); const dt=Math.max(8,performance.now()-d.lt); S.vel.th=-dx*.006/dt*16; S.vel.ph=dy*.005/dt*16; setHover(null);}
    d.lx=e.clientX; d.ly=e.clientY; d.lt=performance.now();
  });
  function up(e){
    const d=S.drag; S.ptr.delete(e.pointerId); if(S.ptr.size<2) S.pinch=null;
    if(S.ptr.size===0){cv.classList.remove('grabbing'); S.drag=null;
      if(d&&!d.moved&&e.type==='pointerup'){const id=pickAt(e.clientX,e.clientY); if(id){o.pick(id); setHover(id,e.clientX,e.clientY);} }
      if(performance.now()-(d?d.lt:0)>80){S.vel.th=S.vel.ph=0;}}
  }
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!S.ptr.size) setHover(null);});
  cv.addEventListener('wheel',e=>{e.preventDefault(); S.rot.dist=clamp(S.rot.dist*Math.exp(e.deltaY*.0012),14,180);},{passive:false});

  /* ---------- цикл отрисовки ---------- */
  let raf=0, W=0, H=0;
  function resize(){const w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return; if(w!==W||h!==H){W=w;H=h; renderer.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();}}
  function frame(now){
    raf=0; if(!S.active||document.hidden) return;
    resize(); step(now);
    if(!S.drag){ if(Math.abs(S.vel.th)+Math.abs(S.vel.ph)>1e-5){S.rot.th+=S.vel.th; S.rot.ph=clamp(S.rot.ph+S.vel.ph,-.05,1.52); S.vel.th*=.93; S.vel.ph*=.9;} if(S.spin) S.rot.th+=.0022; }
    if(S.model) S.model.fans.forEach(f=>f.rotation.y+=.045);
    place(); renderer.render(scene,cam); labels(W,H);
    raf=requestAnimationFrame(frame);
  }
  function kick(){if(!raf&&S.active&&!document.hidden) raf=requestAnimationFrame(frame);}
  api.active=v=>{S.active=v; if(v){W=H=0; kick();}};
  api.resize=()=>{W=H=0; kick();};
  api.theme=()=>{makeGrid(); const c=themeColors(); S.slots.forEach(s=>{s.material.color.set(c.ghost); s.userData.edge.material.color.set(c.ghost);});};
  document.addEventListener('visibilitychange',kick);
  new ResizeObserver(()=>{W=H=0;}).observe(cv);
  S.active=true; kick();
  return api;
}

window.Hold3D={create};
})();
