/* Плавный «дым» на первой странице: красный, белый и черный.
   Шейдер с искажением шумового поля; рисуется в половинном разрешении, браузер сглаживает при растяжении.
   Если WebGL недоступен, остается CSS-градиент под холстом. */
(function(){
"use strict";
const cv=document.getElementById('smoke'); if(!cv) return;
const gl=cv.getContext('webgl',{antialias:false,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
if(!gl) return;
const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS=`precision highp float;
uniform vec2 res; uniform float t;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/res; vec2 p=(gl_FragCoord.xy-.5*res)/res.y*1.35;
  float s=t*.06;
  vec2 q=vec2(fbm(p+vec2(0.,s)),fbm(p+vec2(5.2,1.3)-s*.7));
  vec2 r=vec2(fbm(p+3.2*q+vec2(1.7,9.2)+s*.9),fbm(p+3.2*q+vec2(8.3,2.8)-s*.6));
  float f=fbm(p+3.4*r+vec2(s*.4,0.));
  vec3 black=vec3(.035,.02,.025), deep=vec3(.40,.03,.07), red=vec3(.808,.122,.173), hot=vec3(.90,.22,.26), white=vec3(.97,.95,.95);
  vec3 c=mix(deep,red,smoothstep(.22,.62,f));
  c=mix(c,hot,smoothstep(.62,.85,f)*.6);
  float dk=smoothstep(.44,.18,f)+smoothstep(.55,.75,q.y)*smoothstep(.55,.35,f);
  c=mix(c,black,clamp(dk,0.,1.)*.95);
  float wh=smoothstep(.47,.72,f)*smoothstep(.40,.64,r.x)*(.4+.6*uv.x);
  c=mix(c,white,wh*.85);
  c*=mix(.82,1.,smoothstep(0.,.35,uv.y));
  gl_FragColor=vec4(c,1.);
}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null;}return s;}
const vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS); if(!vs||!fs) return;
const pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr); if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return;
gl.useProgram(pr);
const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const uRes=gl.getUniformLocation(pr,'res'), uT=gl.getUniformLocation(pr,'t');
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
let w=0,hh=0; const t0=performance.now()-30000*Math.random();
function size(){const k=0.35, W=Math.min(1400,Math.round(cv.clientWidth*k)), H=Math.round(cv.clientHeight*k*(W/(cv.clientWidth*k||1)));
  if(W!==w||H!==hh){w=W;hh=H;cv.width=W;cv.height=H;gl.viewport(0,0,W,H);}}
function draw(now){size(); gl.uniform2f(uRes,w,hh); gl.uniform1f(uT,(now-t0)/1000); gl.drawArrays(gl.TRIANGLES,0,3);}
let first=true;
function loop(now){ if(!document.hidden){draw(now); if(first){first=false; cv.classList.add('on');}} if(!still) requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.addEventListener('resize',()=>{if(still) requestAnimationFrame(draw);});
})();
