/* Generic schematic geometry checks; coordinates are SVG units. */
(function(root){
'use strict';
const EPS=0.01;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function on(p,s,t=EPS){const length=dist(s.a,s.b);return length>0&&Math.abs(cross(s.a,s.b,p))/length<=t&&p[0]>=Math.min(s.a[0],s.b[0])-t&&p[0]<=Math.max(s.a[0],s.b[0])+t&&p[1]>=Math.min(s.a[1],s.b[1])-t&&p[1]<=Math.max(s.a[1],s.b[1])+t;}
function overlap(a,b){if(!on(b.a,{a:a.a,b:a.b},EPS)&&Math.abs(cross(a.a,a.b,b.a))>EPS*dist(a.a,a.b))return false;if(Math.abs(cross(a.a,a.b,b.b))>EPS*dist(a.a,a.b))return false;const axis=Math.abs(a.a[0]-a.b[0])>=Math.abs(a.a[1]-a.b[1])?0:1;return Math.min(Math.max(a.a[axis],a.b[axis]),Math.max(b.a[axis],b.b[axis]))-Math.max(Math.min(a.a[axis],a.b[axis]),Math.min(b.a[axis],b.b[axis]))>EPS;}
function crossing(a,b){const c=[cross(a.a,a.b,b.a),cross(a.a,a.b,b.b),cross(b.a,b.b,a.a),cross(b.a,b.b,a.b)];return c[0]*c[1]<-EPS&&c[2]*c[3]<-EPS;}
function hitsRect(s,r){let lo=0,hi=1;for(let k=0;k<2;k++){const min=(k?r.y:r.x)+EPS,max=min+(k?r.h:r.w)-2*EPS,d=s.b[k]-s.a[k];if(Math.abs(d)<EPS){if(s.a[k]<=min||s.a[k]>=max)return false;}else{const u=(min-s.a[k])/d,v=(max-s.a[k])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}}return hi>lo;}
function linearPath(d,id,kind){
 const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[];
 if(tokens.some(t=>/^[a-z]$/i.test(t)&&!/[mlhvz]/i.test(t)))throw Error('curved or unsupported path');
 const out=[];let i=0,cmd='',pt=[0,0],start=[0,0];
 const number=()=>{if(i>=tokens.length||/^[a-z]$/i.test(tokens[i]))throw Error('invalid path');const n=Number(tokens[i++]);if(!Number.isFinite(n))throw Error('invalid coordinate');return n;};
 while(i<tokens.length){if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];if(!cmd)throw Error('missing command');const rel=cmd===cmd.toLowerCase(),c=cmd.toUpperCase();if(c==='Z'){out.push({id:id+':'+out.length,kind,a:pt,b:start});pt=start;cmd='';continue;}let next;if(c==='H')next=[number()+(rel?pt[0]:0),pt[1]];else if(c==='V')next=[pt[0],number()+(rel?pt[1]:0)];else next=[number()+(rel?pt[0]:0),number()+(rel?pt[1]:0)];if(c==='M'){start=next;cmd=rel?'l':'L';}else out.push({id:id+':'+out.length,kind,a:pt,b:next});pt=next;}
 return out;
}
function validate(model){
 const issues=[],segments=model.segments||[],walls=segments.filter(s=>s.kind==='wall'),boundaries=segments.filter(s=>['wall','window','opening'].includes(s.kind));
 const add=(code,ids)=>issues.push({code,ids});
 for(const s of segments)if(![...s.a,...s.b].every(Number.isFinite)||dist(s.a,s.b)<EPS)add('degenerate-segment',[s.id]);
 for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){if(overlap(walls[i],walls[j]))add('duplicate-wall-span',[walls[i].id,walls[j].id]);else if(crossing(walls[i],walls[j]))add('wall-crossing',[walls[i].id,walls[j].id]);}
 for(const s of segments.filter(s=>s.kind==='window'||s.kind==='opening')){for(const w of walls)if(overlap(s,w)||crossing(s,w))add('wall-through-'+s.kind,[w.id,s.id]);for(const p of [s.a,s.b])if(!boundaries.some(b=>b!==s&&on(p,b)))add('unjoined-'+s.kind,[s.id]);}
 for(const w of walls){for(const p of [w.a,w.b])if(!boundaries.some(s=>s!==w&&on(p,s)))add('open-wall-end',[w.id]);for(const r of model.fixtures||[])if(hitsRect(w,r))add('wall-through-fixture',[w.id,r.id]);}
 const scale=model.calibration;
 if(!scale||![scale.drawingUnits,scale.realMillimetres].every(x=>Number.isFinite(x)&&x>0))add('scale-unverified',[]);
 if(!walls.length)add('no-semantic-walls',[]);
 return {segments:segments.length,walls:walls.length,fixtures:(model.fixtures||[]).length,issues,unsupported:model.unsupported||[],limitations:['Schematic centreline checks only. Open wall ends may be intentional; explicit opening segments close door gaps. Door leaves and curves are not opening spans. Wall thickness, door swings, load-bearing safety and as-built accuracy are not certified.']};
}
root.LayoutGeometry={linearPath,validate,on,overlap,crossing,hitsRect};
})(typeof window==='undefined'?globalThis:window);
