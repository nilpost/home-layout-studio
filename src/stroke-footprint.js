/* Isolated drawing-space line-stroke foundation. Not loaded by the editor. */
(function(root){
'use strict';
const MAX_COORDINATE=1_000_000_000,MIN_NORMAL=2**-1022;
function unknown(reason){return {status:'unknown',reason,scope:'drawing-line-stroke'};}
function record(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function keys(v,allowed){const actual=Reflect.ownKeys(v);return actual.length===allowed.length&&actual.every(k=>typeof k==='string'&&allowed.includes(k));}
function text(v){return typeof v==='string'&&!!v.trim()&&v.length<=300;}
function normal(v){return typeof v==='number'&&Number.isFinite(v)&&(v===0||Math.abs(v)>=MIN_NORMAL);}
function coordinate(v){return normal(v)&&Math.abs(v)<=MAX_COORDINATE;}
// An error-free TwoSum residual detects a rounded extent/gap. Conservative rejection
// is intentional: a positive but lost width must never become a separation proof.
function exactSum(a,b){const s=a+b,z=s-a,error=(a-(s-z))+(b-z);if(!normal(s)||error!==0)throw Error('numeric-precision');return s;}
function gap(a0,a1,b0,b1){return a1<b0?exactSum(b0,-a1):b1<a0?exactSum(a0,-b1):0;}
function pointPair(v){return Array.isArray(v)&&v.length===2&&Object.hasOwn(v,0)&&Object.hasOwn(v,1)&&coordinate(v[0])&&coordinate(v[1]);}
function build(input){
 if(!record(input)||!keys(input,['kind','a','b','frame','style','provenance']))throw Error('unsupported-input');
 if(input.kind!=='line')throw Error('unsupported-geometry');
 const f=input.frame,s=input.style,p=input.provenance;
 if(!record(f)||!keys(f,['id','units','transform'])||!text(f.id)||f.units!=='drawing'||f.transform!=='none')throw Error('unresolved-frame');
 if(!record(s)||!keys(s,['resolved','width','cap','vectorEffect'])||s.resolved!==true||!['butt','square','round'].includes(s.cap)||s.vectorEffect!=='none')throw Error('unresolved-style');
 if(!record(p)||!keys(p,['geometry','style'])||!text(p.geometry)||!text(p.style))throw Error('missing-provenance');
 if(!pointPair(input.a)||!pointPair(input.b)||!coordinate(s.width)||s.width<=0)throw Error('numeric-range');
 const [ax,ay]=input.a,[bx,by]=input.b;
 if(ax===bx&&ay===by)throw Error('degenerate-line');
 if(ax!==bx&&ay!==by)throw Error('unsupported-geometry');
 const axis=ay===by?'horizontal':'vertical',r=s.width/2;
 if(!normal(r)||r<=0||r*2!==s.width)throw Error('numeric-precision');
 const center=[Math.min(ax,bx),Math.min(ay,by),Math.max(ax,bx),Math.max(ay,by)];
 const length=exactSum(axis==='horizontal'?center[2]:center[3],-(axis==='horizontal'?center[0]:center[1]));
 if(length<=0)throw Error('numeric-precision');
 const bounds=center.slice(),extend=s.cap!=='butt';
 for(const k of [0,1]){
  if(extend||axis===(k===0?'vertical':'horizontal')){bounds[k]=exactSum(bounds[k],-r);bounds[k+2]=exactSum(bounds[k+2],r);}
 }
 if(!bounds.every(coordinate)||bounds[0]>=bounds[2]||bounds[1]>=bounds[3])throw Error('numeric-precision');
 return {axis,r,center,bounds,kind:s.cap==='round'?'capsule':'rectangle',frameId:f.id,cap:s.cap,width:s.width,provenance:{geometry:p.geometry,style:p.style}};
}
function line(input){try{const f=build(input);return {status:'supported',scope:'drawing-line-stroke',kind:f.kind,axis:f.axis,cap:f.cap,width:f.width,frameId:f.frameId,bounds:f.bounds.slice(),centerlineBounds:f.center.slice(),provenance:{...f.provenance}};}catch(e){return unknown(e.message||'unsupported-input');}}
// Convert represented IEEE-754 doubles to exact signed dyadics. Only the sign of
// dx^2+dy^2-r^2 is needed, so no floating multiplication, overflow or underflow occurs.
function dyadic(v){if(v===0)return {m:0n,e:0};const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v,false);const bits=view.getBigUint64(0,false),exp=Number((bits>>52n)&2047n),fraction=bits&((1n<<52n)-1n);return {m:(exp===0?fraction:(1n<<52n)+fraction)*(bits>>63n?-1n:1n),e:exp===0?-1074:exp-1075};}
function radialSign(dx,dy,r){const values=[dx,dy,r].map(dyadic),exponents=values.filter(v=>v.m!==0n).map(v=>v.e*2),base=Math.min(...exponents),terms=values.map(v=>v.m===0n?0n:v.m*v.m<<BigInt(v.e*2-base)),n=terms[0]+terms[1]-terms[2];return n<0n?-1:n>0n?1:0;}
function result(relation,estimate,frameId){return {status:'supported',scope:'drawing-line-stroke',relation,separationEstimate:estimate,estimateMeaning:'Drawing-unit floating estimate only; relation uses interval or exact dyadic sign tests.',frameId};}
function radialResult(dx,dy,r,frameId,interior){const sign=radialSign(dx,dy,r);if(sign<=0)return result(sign===0?'boundary':interior,0,frameId);const distance=Math.hypot(dx,dy)-r;if(!normal(distance)||distance<=0)throw Error('numeric-distance-precision');return result('separate',distance,frameId);}
function point(input,query){
 try{
  const f=build(input);
  if(!record(query)||!keys(query,['point','frameId'])||query.frameId!==f.frameId||!text(query.frameId))throw Error('frame-mismatch');
  if(!pointPair(query.point))throw Error('numeric-range');
  const [x,y]=query.point;
  if(f.kind==='capsule')return radialResult(gap(f.center[0],f.center[2],x,x),gap(f.center[1],f.center[3],y,y),f.r,f.frameId,'interior');
  const [x0,y0,x1,y1]=f.bounds;
  if(x>=x0&&x<=x1&&y>=y0&&y<=y1)return result(x===x0||x===x1||y===y0||y===y1?'boundary':'interior',0,f.frameId);
  const distance=Math.hypot(gap(x0,x1,x,x),gap(y0,y1,y,y));if(!normal(distance)||distance<=0)throw Error('numeric-distance-precision');return result('separate',distance,f.frameId);
 }catch(e){return unknown(e.message||'unsupported-input');}
}
function compare(inputA,inputB){
 try{
  const a=build(inputA),b=build(inputB);if(a.frameId!==b.frameId)throw Error('frame-mismatch');
  if(a.kind==='rectangle'&&b.kind==='rectangle'){
   const [x0,y0,x1,y1]=a.bounds,[u0,v0,u1,v1]=b.bounds;
   if(x1>=u0&&u1>=x0&&y1>=v0&&v1>=y0)return result(x1===u0||u1===x0||y1===v0||v1===y0?'boundary':'interior-overlap',0,a.frameId);
   const distance=Math.hypot(gap(x0,x1,u0,u1),gap(y0,y1,v0,v1));if(!normal(distance)||distance<=0)throw Error('numeric-distance-precision');return result('separate',distance,a.frameId);
  }
  const ab=a.kind==='capsule'?a.center:a.bounds,bb=b.kind==='capsule'?b.center:b.bounds,r=exactSum(a.kind==='capsule'?a.r:0,b.kind==='capsule'?b.r:0);
  return radialResult(gap(ab[0],ab[2],bb[0],bb[2]),gap(ab[1],ab[3],bb[1],bb[3]),r,a.frameId,'interior-overlap');
 }catch(e){return unknown(e.message||'unsupported-input');}
}
// A local right-angle join envelope deliberately says nothing about either whole
// leg or its endpoint cap. At 90 degrees miter/bevel/round (including miter-limit
// fallback) all lie inside this vertex-centered halfwidth square.
function joinUnknown(reason,scope='drawing-local-join'){return {status:'unknown',reason,scope,quality:'conservative-bound'};}
function buildJoin(input){
 if(!record(input)||!keys(input,['kind','points','frame','style','provenance'])||input.kind!=='orthogonal-join')throw Error('unsupported-join-input');
 const f=input.frame,s=input.style,p=input.provenance,points=input.points;
 if(!record(f)||!keys(f,['id','units','transform'])||!text(f.id)||f.units!=='drawing'||f.transform!=='none')throw Error('unresolved-frame');
 if(!record(s)||!['miter','bevel','round'].includes(s.join))throw Error('unresolved-join-style');
 const styleKeys=['resolved','width','join','vectorEffect',...(s.join==='miter'?['miterLimit']:[])];
 if(!keys(s,styleKeys)||s.resolved!==true||s.vectorEffect!=='none')throw Error('unresolved-join-style');
 if(s.join==='miter'&&(!coordinate(s.miterLimit)||s.miterLimit<0))throw Error('unsupported-miter-limit');
 if(!record(p)||!keys(p,['geometry','style'])||!text(p.geometry)||!text(p.style))throw Error('missing-provenance');
 if(!Array.isArray(points)||points.length!==3||![0,1,2].every(i=>Object.hasOwn(points,i)&&pointPair(points[i]))||!coordinate(s.width)||s.width<=0)throw Error('numeric-range');
 const [a,v,b]=points;
 const axis=point=>point[0]===v[0]&&point[1]!==v[1]?'vertical':point[1]===v[1]&&point[0]!==v[0]?'horizontal':null;
 const first=axis(a),second=axis(b);if(!first||!second||first===second)throw Error('unsupported-join-geometry');
 for(const [point,direction]of [[a,first],[b,second]]){const i=direction==='horizontal'?0:1;if(exactSum(point[i],-v[i])===0)throw Error('numeric-precision');}
 const r=s.width/2;if(!normal(r)||r<=0||r*2!==s.width)throw Error('numeric-precision');
 const bounds=[exactSum(v[0],-r),exactSum(v[1],-r),exactSum(v[0],r),exactSum(v[1],r)];
 if(!bounds.every(coordinate)||bounds[0]>=bounds[2]||bounds[1]>=bounds[3])throw Error('numeric-precision');
 return {bounds,frameId:f.id,vertex:v.slice(),width:s.width,join:s.join,...(s.join==='miter'?{miterLimit:s.miterLimit}:{}),provenance:{geometry:p.geometry,style:p.style}};
}
function join(input){try{const f=buildJoin(input);return {status:'supported',scope:'drawing-local-join',quality:'conservative-bound',kind:'local-join-square-bound',...f,coverage:'Local join only; excludes leg bodies and endpoint caps. Bound intersection does not prove contact or overlap.'};}catch(e){return joinUnknown(e.message||'unsupported-join-input');}}
function boundSeparation(inputA,inputB){
 const scope='drawing-bound-separation';
 try{
  if(inputA?.kind!=='orthogonal-join'&&inputB?.kind!=='orthogonal-join')throw Error('join-required');
  const buildRaw=input=>input?.kind==='orthogonal-join'?{...buildJoin(input),operandScope:'drawing-local-join'}:{...build(input),operandScope:'drawing-line-stroke'},a=buildRaw(inputA),b=buildRaw(inputB);
  if(a.frameId!==b.frameId)throw Error('frame-mismatch');
  const dx=gap(a.bounds[0],a.bounds[2],b.bounds[0],b.bounds[2]),dy=gap(a.bounds[1],a.bounds[3],b.bounds[1],b.bounds[3]);
  if(dx===0&&dy===0)return joinUnknown('bounds-intersect-or-touch',scope);
  return {status:'supported',scope,quality:'conservative-bound',relation:'separate',frameId:a.frameId,operandScopes:[a.operandScope,b.operandScope],operandProvenance:[{...a.provenance},{...b.provenance}],axisGaps:{x:dx,y:dy},separationLowerBound:Math.max(dx,dy),proof:'Strictly disjoint enclosing bounds; exact axis gap is a drawing-distance lower bound.',coverage:'Only the supplied local join region and line footprint/local join region; not whole joined paths.'};
 }catch(e){return joinUnknown(e.message||'unsupported-bound-input',scope);}
}
root.StrokeFootprint=Object.freeze({MAX_COORDINATE,MIN_NORMAL,line,point,compare,join,boundSeparation});
})(typeof window==='undefined'?globalThis:window);
