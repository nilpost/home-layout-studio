import assert from 'node:assert/strict';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
const A=globalThis.MeasurementAnchors,C=globalThis.MeasurementChains;
const segments=[{id:'span-a:0',a:[0,0],b:[4,0]},{id:'span-b:0',a:[10,0],b:[4,0]},{id:'total:0',a:[10,0],b:[0,0]}];
const anchors=segments.map((s,i)=>A.createBinding({id:'anchor-'+i,projectId:'synthetic-project',dimensionId:'dimension-'+i,start:{segmentId:s.id,endpoint:'a'},end:{segmentId:s.id,endpoint:'b'},sourceHash:'synthetic-hash'}));
const chain=C.createChain({id:'chain-1',projectId:'synthetic-project',spanAnchorIds:['anchor-0','anchor-1'],totalAnchorId:'anchor-2',sourceHash:'synthetic-hash'});
const input={chains:[chain],anchors,projectId:'synthetic-project',segments,dimensions:[{id:'dimension-0',value:40,unit:'mm',unitStatus:'verified'},{id:'dimension-1',value:6,unit:'cm',unitStatus:'verified'},{id:'dimension-2',value:.1,unit:'m',unitStatus:'verified'}],calibration:{drawingUnits:1,realMillimetres:10,status:'verified'},tolerancePercent:0,sourceHash:'synthetic-hash'};
const snapshot=structuredClone(input),pass=C.review(input);
assert.equal(pass.status,'pass');assert.equal(pass.checked,1);assert.equal(pass.findings[0].measured,100);assert.equal(pass.findings[0].expected,100);assert.deepEqual(input,snapshot);
assert.deepEqual(C.validate(undefined),[]);assert.equal(C.review({...input,chains:[]}).status,'unknown');
const mismatch={...input,dimensions:input.dimensions.map((d,i)=>i===2?{...d,value:.09}:d)};
assert.equal(C.review(mismatch).status,'fail');assert.equal(C.review({...mismatch,tolerancePercent:12}).status,'pass');
assert.equal(C.review({...input,chains:[{...chain,spanAnchorIds:[...chain.spanAnchorIds].reverse()}]}).status,'pass');
assert.equal(C.review({...input,segments:segments.map(s=>({...s,a:[s.a[1],s.a[0]],b:[s.b[1],s.b[0]]}))}).status,'pass');
assert.equal(C.review({...input,anchors:anchors.map((a,i)=>i===1?{...a,dimensionId:anchors[0].dimensionId}:a)}).status,'unknown');
const unknown=[{sourceHash:'changed'},{anchors:anchors.slice(1)},{anchors:[...anchors,anchors[0]]},{calibration:{...input.calibration,status:'manual'}},{tolerancePercent:undefined},{dimensions:input.dimensions.map((d,i)=>i===0?{...d,unitStatus:'inferred'}:d)},{dimensions:input.dimensions.map((d,i)=>i===0?{...d,unit:'mm/cm'}:d)},{segments:[segments[0],{...segments[1],b:[5,0]},segments[2]]},{segments:[segments[0],{...segments[1],b:[3,0]},segments[2]]},{segments:[segments[0],{...segments[1],a:[10,1]},segments[2]]},{segments:[segments[0],segments[1],{...segments[2],a:[11,0]}]},{segments:segments.slice(0,1)},{segments:[...segments,segments[0]]},{dimensions:input.dimensions.map((d,i)=>i===0?{...d,value:1e308,unit:'m'}:d)},{segments:segments.map(s=>({...s,a:[1e10,0]}))}];
for(const change of unknown){const r=C.review({...input,...change});assert.equal(r.status,'unknown',JSON.stringify(change));assert.equal(r.checked,0);assert(r.findings[0].evidence.reasons.length);assert.deepEqual(input,snapshot);}
for(const patch of [{id:'bad\u0000id'},{projectId:'bad\u007fid'},{spanAnchorIds:['same','same']},{spanAnchorIds:['anchor-0']},{spanAnchorIds:['anchor-0','anchor-2']},{totalAnchorId:'anchor-0'},{sourceHashAtCreation:'bad hash'},{unknown:true}])assert.throws(()=>C.validate([{...chain,...patch}]));
assert.throws(()=>C.validate([chain,chain]));assert.throws(()=>C.validate([chain],{projectId:'foreign'}));
for(const tolerancePercent of [-1,101,NaN,'1'])assert.throws(()=>C.review({...input,tolerancePercent}));
const detached=C.review(input);detached.findings[0].evidence.anchors[0].start[0]=999;assert.deepEqual(input,snapshot);
// Ordered spans that return to an earlier interval must never count as a valid chain.
const thirdSegment={id:'backtrack:0',a:[4,0],b:[2,0]},thirdAnchor=A.createBinding({id:'anchor-3',projectId:input.projectId,dimensionId:'dimension-3',start:{segmentId:thirdSegment.id,endpoint:'a'},end:{segmentId:thirdSegment.id,endpoint:'b'},sourceHash:input.sourceHash});
assert.equal(C.review({...input,chains:[{...chain,spanAnchorIds:[...chain.spanAnchorIds,'anchor-3']}],anchors:[...anchors,thirdAnchor],segments:[...segments,thirdSegment],dimensions:[...input.dimensions,{id:'dimension-3',value:20,unit:'mm',unitStatus:'verified'}]}).status,'unknown');
console.log('PASS: declared source chain totals, mixed convertible units, reversed endpoints/order, explicit topology/tolerance, stale/orphan/provisional evidence, overflow bounds and no mutation.');
