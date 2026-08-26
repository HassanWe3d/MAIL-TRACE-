import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 uMouse;
uniform float uActive;
out vec4 fragColor;

#define PI 3.14159265
#define N 10

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}
  return v;
}

float meta(vec2 uv,vec2 c,float r){
  float d=length(uv-c);
  return r*r/(d*d+0.0008);
}

void main(){
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ar=iResolution.x/iResolution.y;
  vec2 p=uv;p.x*=ar;
  float t=iTime*0.4;

  vec2 mouse=uMouse;
  mouse.x*=ar;
  float ma=uActive;

  float field=0.0;
  vec2 cs[N];
  float rs[N];

  for(int i=0;i<N;i++){
    float fi=float(i);
    float ang=fi*PI*2.0/float(N);
    float r=0.15+0.1*sin(t*0.6+fi*1.7);
    float sp=0.25+fi*0.03;
    float nx=sin(t*sp+fi*2.3)*0.3;
    float ny=cos(t*sp*0.7+fi*1.9)*0.25;
    vec2 c=vec2(
      0.5*ar+cos(ang+t*0.1)*r*2.5+nx,
      0.5+sin(ang+t*0.08)*r*2.5+ny
    );
    if(ma>0.5){
      float d=length(c-mouse);
      c=mix(c,mouse,clamp(0.25/(d+0.08),0.0,0.35));
    }
    float radius=0.07+0.04*sin(t*0.8+fi*1.1);
    field+=meta(p,c,radius);
    cs[i]=c;rs[i]=radius;
  }

  float edge=smoothstep(0.7,1.4,field);
  float core=smoothstep(1.4,3.5,field);
  float bright=smoothstep(3.5,8.0,field);

  float rim=smoothstep(0.5,0.8,field)*smoothstep(1.2,0.8,field);
  rim*=0.3;

  vec3 col=vec3(0.0);
  col+=vec3(0.06)*edge;
  col+=vec3(0.15)*core;
  col+=vec3(0.5)*bright;
  col+=vec3(0.2)*rim;

  float glow=0.0;
  for(int i=0;i<N;i++){
    float d=length(p-cs[i]);
    glow+=0.015/(d*d+0.015);
  }
  col+=vec3(0.08)*glow;

  float shimmer=fbm(p*3.0+t*0.5)*core*0.15;
  col+=vec3(shimmer);

  float alpha=max(edge*0.7,core);
  alpha=clamp(alpha,0.0,1.0);

  fragColor=vec4(col,alpha);
}
`;

const ctxMap = new WeakMap();

export default function Ferrofluid({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const renderer = new Renderer({
      webgl: 2, alpha: true, antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    const canvas = gl.canvas;
    canvas.style.cssText = 'width:100%;height:100%;display:block;position:absolute;inset:0;';
    el.appendChild(canvas);

    const program = new Program(gl, {
      vertex: VERT, fragment: FRAG,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uActive: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    ctxMap.set(el, { renderer, program });

    const resize = () => {
      const r = el.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)));
      const res = program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const cur = [0.5, 0.5], tgt = [0.5, 0.5];
    let tgtA = 0, curA = 0;

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      tgt[0] = (e.clientX - r.left) / r.width;
      tgt[1] = 1 - (e.clientY - r.top) / r.height;
      tgtA = 1;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseenter', () => { tgtA = 1; });
    canvas.addEventListener('mouseleave', () => { tgtA = 0; });

    let raf = 0, vis = true, pg = !document.hidden;
    const t0 = performance.now();

    const loop = (now) => {
      program.uniforms.iTime.value = (now - t0) * 0.001;
      cur[0] += 0.04 * (tgt[0] - cur[0]);
      cur[1] += 0.04 * (tgt[1] - cur[1]);
      curA += 0.04 * (tgtA - curA);
      program.uniforms.uMouse.value[0] = cur[0];
      program.uniforms.uMouse.value[1] = cur[1];
      program.uniforms.uActive.value = curA;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    const go = () => { if (vis && pg && !raf) raf = requestAnimationFrame(loop); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; vis ? go() : stop(); }, { threshold: 0 });
    io.observe(el);
    const onVis = () => { pg = !document.hidden; pg ? go() : stop(); };
    document.addEventListener('visibilitychange', onVis);
    go();

    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('mousemove', onMove);
      ctxMap.delete(el);
      try { el.removeChild(canvas); } catch {}
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={ref} className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }} />;
}
