import assert from 'node:assert/strict';
import '../src/stroke-footprint.js';
const S=globalThis.StrokeFootprint;
// Fabricated drawing values only. No SVG parser or style resolution is simulated.
const make=(a=[0,0],b=[8,0],cap='butt',width=2)=>({kind:'line',a,b,frame:{id:'fixture-frame',units:'drawing',transform:'none'},style:{resolved:true,width,cap,vectorEffect:'none'},provenance:{geometry:'synthetic segment',style:'explicit synthetic style'}});
const point=(input,p)=>S.point(input,{point:p,frameId:'fixture-frame'});
const relation=(a,b,wanted)=>{assert.equal(S.compare(a,b).relation,wanted);assert.equal(S.compare(b,a).relation,wanted);};
for(const cap of ['butt','square','round'])for(const [a,b]of [[[0,0],[8,0]],[[8,0],[0,0]],[[0,0],[0,8]],[[0,8],[0,0]]]){
 const input=make(a,b,cap),snapshot=structuredClone(input),f=S.line(input);assert.equal(f.status,'supported');assert.deepEqual(input,snapshot);assert.equal(f.kind,cap==='round'?'capsule':'rectangle');assert.equal(point(input,[0,0]).relation,cap==='butt'?'boundary':'interior');assert.equal(point(input,[0,1]).relation,a[0]===b[0]?'interior':'boundary');
 const reversed=S.line(make(b,a,cap));assert.deepEqual(reversed.bounds,f.bounds);assert.deepEqual(reversed.centerlineBounds,f.centerlineBounds);
}
assert.deepEqual(S.line(make()).bounds,[0,-1,8,1]);assert.deepEqual(S.line(make([0,0],[8,0],'square')).bounds,[-1,-1,9,1]);assert.deepEqual(S.line(make([0,0],[0,8],'round')).bounds,[-1,-1,1,9]);
const round=make([0,0],[4,0],'round');assert.equal(point(round,[4.75,.75]).relation,'separate');assert(point(round,[4.75,.75]).separationEstimate>0);assert.equal(point(round,[4.5,.5]).relation,'interior');assert.equal(point(round,[5,0]).relation,'boundary');assert.equal(point(make([0,0],[4,0],'round',10),[7,4]).relation,'boundary');
// Intersecting capsule boxes alone cannot prove a collision.
const diagonalCapsule=make([5.5,1.5],[8,1.5],'round');assert(S.line(round).bounds[2]>S.line(diagonalCapsule).bounds[0]);assert(S.line(round).bounds[3]>S.line(diagonalCapsule).bounds[1]);relation(round,diagonalCapsule,'separate');
const mixedBoxCorner=make([5.25,.75],[5.25,1.75],'butt',1);assert(S.line(round).bounds[2]>S.line(mixedBoxCorner).bounds[0]);assert(S.line(round).bounds[3]>S.line(mixedBoxCorner).bounds[1]);relation(round,mixedBoxCorner,'separate');
const k=2**-900;assert.equal(point(make([-10*k,0],[0,0],'round',10*k),[3*k,4*k]).relation,'boundary');
relation(round,make([6,0],[8,0],'round'),'boundary');relation(round,make([5,0],[8,0],'round'),'interior-overlap');relation(round,make([1,-4],[1,4],'round'),'interior-overlap');relation(round,make([6,0],[8,0],'square'),'boundary');relation(round,make([5.5,1.5],[8,1.5],'butt'),'separate');relation(round,make([2,-4],[2,4],'butt'),'interior-overlap');
relation(make(),make([8,0],[10,0]),'boundary');relation(make(),make([7,0],[10,0]),'interior-overlap');relation(make(),make([0,2],[8,2]),'boundary');relation(make(),make([0,4],[8,4]),'separate');relation(make(),make([3,-4],[3,4]),'interior-overlap');
// Exact dyadic comparison prevents a rounded hypot from reporting a false tangency.
const near=point(make([0,0],[4,0],'round',4),[6,Number.EPSILON]);assert.equal(near.status,'unknown');assert.equal(near.reason,'numeric-distance-precision');
assert.equal(point(make([0,0],[4,0],'round',4),[5.5,Number.EPSILON]).relation,'interior');
for(const update of [
 x=>{delete x.frame;},x=>{x.frame.units='mm';},x=>{x.frame.transform='matrix(...)';},x=>{delete x.frame.transform;},x=>{x.frame.matrix=[1,0,0,1,0,0];},x=>{x.transform='none';},
 x=>{delete x.provenance;},x=>{delete x.provenance.style;},x=>{x.provenance.geometry='';},x=>{delete x.style;},x=>{delete x.style.width;},x=>{delete x.style.cap;},x=>{delete x.style.vectorEffect;},x=>{x.style.resolved=false;},x=>{x.style.vectorEffect='non-scaling-stroke';},x=>{x.style.dasharray=[];},x=>{x.style.cap='inherit';},
 x=>{x.kind='curve';},x=>{x.b=[2,2];},x=>{x.b=[0,0];},x=>{x.a=[Infinity,0];},x=>{x.a=[NaN,0];},x=>{x.a=[S.MAX_COORDINATE+1,0];},x=>{x.style.width=-1;},x=>{x.style.width=0;},x=>{x.style.width=Number.MIN_VALUE;},x=>{x.style.width=S.MIN_NORMAL;},x=>{x.style.width=Number.MAX_VALUE;},x=>{x.a=[0,1e8];x.b=[8,1e8];x.style.width=2**-30;},x=>{x.a=[0,0];x.b=[S.MIN_NORMAL,0];x.style.width=S.MIN_NORMAL;},
 x=>{x.a=[S.MAX_COORDINATE-4,0];x.b=[S.MAX_COORDINATE,0];x.style.cap='round';}
]){const input=make();update(input);const before=structuredClone(input);assert.equal(S.line(input).status,'unknown');assert.equal(point(input,[0,0]).status,'unknown');assert.equal(S.compare(input,make()).status,'unknown');assert.deepEqual(input,before);}
// Decimal extents that cannot be represented exactly are conservative unknowns.
assert.equal(S.line(make([0,1],[8,1],'butt',.1)).reason,'numeric-precision');assert.equal(S.line(make([0,0],[8,0],'butt',.1)).status,'supported');
const inherited=make();inherited.style=Object.create(inherited.style);assert.equal(S.line(inherited).status,'unknown');const symbolField=make();symbolField[Symbol('transform')]='unsupported';assert.equal(S.line(symbolField).status,'unknown');
for(const cap of ['butt','square','round'])for(const index of [0,1]){const sparse=Array(2);sparse[index]=0;assert.equal(point(make([0,0],[8,0],cap),sparse).status,'unknown');for(const endpoint of ['a','b']){const input=make([0,0],[8,0],cap);input[endpoint]=sparse;assert.equal(S.line(input).status,'unknown');assert.equal(S.compare(input,make()).status,'unknown');}}
assert.equal(S.line(null).status,'unknown');assert.equal(S.line([]).status,'unknown');assert.equal(S.point(make(),{point:[0,0]}).status,'unknown');assert.equal(S.point(make(),{point:[0,0],frameId:'other'}).reason,'frame-mismatch');assert.equal(S.point(make(),{point:[0,0],frameId:'fixture-frame',transform:'none'}).status,'unknown');assert.equal(S.point(make(),{point:[Number.MIN_VALUE,0],frameId:'fixture-frame'}).status,'unknown');const foreign=make();foreign.frame.id='other';assert.equal(S.compare(make(),foreign).reason,'frame-mismatch');
// Supported numeric extremes use hypot/exact dyadics; no squared-float overflow.
const large=make([-S.MAX_COORDINATE,0],[S.MAX_COORDINATE,0],'butt',2);assert.equal(S.line(large).status,'supported');assert.equal(point(large,[0,8]).separationEstimate,7);assert.equal(point(make([0,0],[8,0],'round',1e9),[0,1e9]).relation,'separate');
const tiny=make([0,0],[S.MIN_NORMAL*8,0],'butt',S.MIN_NORMAL*4);assert.equal(S.line(tiny).status,'supported');assert.equal(point(tiny,[S.MIN_NORMAL*4,S.MIN_NORMAL]).relation,'interior');
const a=make([0,0],[8,0],'round'),b=make([4,4],[12,4],'square'),snap=structuredClone({a,b});Object.freeze(a.a);Object.freeze(a.b);Object.freeze(a.frame);Object.freeze(a.style);Object.freeze(a.provenance);Object.freeze(a);S.compare(a,b);S.point(a,{point:[2,4],frameId:'fixture-frame'});assert.deepEqual({a,b},snap);
console.log('Stroke footprint foundation: analytical line/point/pair, conservative unknowns and immutable fabricated inputs pass.');
