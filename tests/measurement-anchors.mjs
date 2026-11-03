import assert from 'node:assert/strict';
import '../src/measurement-anchors.js';
const M=globalThis.MeasurementAnchors;
const anchor=M.createBinding({id:'synthetic-anchor',projectId:'synthetic-project',dimensionId:'dimension-1',start:{segmentId:'wall-1:0',endpoint:'a'},end:{segmentId:'wall-2:0',endpoint:'b'},sourceHash:'synthetic-hash',createdAt:'2026-01-01T00:00:00Z'});
const input={anchors:[anchor],projectId:'synthetic-project',segments:[{id:'wall-1:0',a:[0,0],b:[1,0]},{id:'wall-2:0',a:[5,0],b:[10,0]}],dimensions:[{id:'dimension-1',value:100,unit:'mm',unitStatus:'verified'}],calibration:{drawingUnits:1,realMillimetres:10,status:'verified'},tolerancePercent:0,sourceHash:'synthetic-hash'};
const snapshot=structuredClone(input),result=M.review(input);
assert.equal(result.status,'pass');assert.equal(result.checked,1);assert.equal(result.findings[0].measured,100);assert.equal(result.findings[0].expected,100);assert.equal(result.findings[0].errorPercent,0);assert.deepEqual(input,snapshot);
assert.deepEqual(M.validate(undefined),[]);
assert.equal(M.review({...input,anchors:[]}).status,'unknown');
assert.equal(M.review({...input,anchors:[]}).coverage.unboundDimensions[0],'dimension-1');
for(const [unit,value]of [['mm',100],['cm',10],['m',.1]])assert.equal(M.review({...input,dimensions:[{...input.dimensions[0],unit,value}]}).status,'pass');
assert.equal(M.review({...input,dimensions:[{...input.dimensions[0],value:80}]}).findings[0].status,'fail');
assert.equal(M.review({...input,dimensions:[{...input.dimensions[0],value:80}],tolerancePercent:25}).status,'pass');
for(const change of [{sourceHash:'changed'},{segments:[]},{dimensions:[]},{calibration:null},{calibration:{...input.calibration,status:'manual'}},{calibration:{...input.calibration,status:undefined}},{dimensions:[{...input.dimensions[0],unitStatus:'inferred'}]},{dimensions:[{...input.dimensions[0],unit:'mm/cm'}]},{dimensions:[{...input.dimensions[0],value:0}]},{tolerancePercent:undefined},{segments:[...input.segments,input.segments[0]]},{dimensions:[input.dimensions[0],input.dimensions[0]]},{segments:[input.segments[0],{...input.segments[1],b:[0,0]}]},{segments:[input.segments[0],{...input.segments[1],b:[NaN,0]}]}]){
 const review=M.review({...input,...change});assert.equal(review.status,'unknown');assert.equal(review.checked,0);assert(review.findings[0].evidence.reasons.length);assert.deepEqual(input,snapshot);
}
const provisional=M.review({...input,calibration:{...input.calibration,status:'manual'}});
assert.equal(provisional.findings[0].measured,100);assert.equal(provisional.coverage.comparisons,1);assert.equal(provisional.checked,0);
assert(M.review({...input,sourceHash:'changed'}).findings[0].evidence.reasons.includes('stale-binding'));
for(const tolerancePercent of [-1,101,NaN,Infinity,'1'])assert.throws(()=>M.review({...input,tolerancePercent}));
assert.throws(()=>M.validate([anchor,anchor]));
assert.throws(()=>M.validate([anchor,{...anchor,id:'different-anchor'}]));
assert.throws(()=>M.validate([anchor],{projectId:'foreign'}));
assert.throws(()=>M.createBinding({...anchor,sourceHash:'synthetic-hash'}));
assert.throws(()=>M.validate([{...anchor,start:{segmentId:'',endpoint:'a'}}]));
assert.throws(()=>M.validate([{...anchor,end:{segmentId:'wall-2:0',endpoint:'center'}}]));
assert.throws(()=>M.validate([{...anchor,createdAt:'2026-02-30T00:00:00Z'}]));
for(const control of ['\u0000','\u0001','\u001f','\u007f']){
 for(const field of ['id','projectId','dimensionId','sourceHashAtCreation'])assert.throws(()=>M.validate([{...anchor,[field]:'synthetic'+control+'identity'}]));
 for(const end of ['start','end'])assert.throws(()=>M.validate([{...anchor,[end]:{...anchor[end],segmentId:'synthetic'+control+'segment'}}]));
 assert.throws(()=>M.validate([anchor],{projectId:'synthetic'+control+'project'}));
}
const detached=M.review(input);detached.findings[0].evidence.start.point[0]=999;assert.deepEqual(input,snapshot);
console.log('PASS: explicit endpoint anchors, source freshness, strict schema, units/tolerance, verified-only outcomes, provisional previews, orphan/ambiguous/degenerate evidence and no mutation.');
