import assert from 'node:assert/strict';
import '../src/room-boundaries.js';
import '../src/consistency-review.js';
const R=globalThis.RoomBoundaries,C=globalThis.ConsistencyReview,copy=structuredClone;
const projectId='fabricated-project',sourceHash='fixture-source',frameId='fixture-frame';
function fixture(id='ring'){
 const points=[[0,0],[6,0],[6,4],[0,4]],segments=points.map((a,i)=>({id:id+'-'+i,kind:'wall',a:[...a],b:[...points[(i+1)%4]],sourceHash,frameId,coordinateStatus:'supported'}));
 return {records:[R.createDeclaration({id,projectId,sourceHash,frameId,intent:'enclosure',edges:segments.map(s=>({segmentId:s.id,startEndpoint:'a'}))})],projectId,sourceHash,frameId,segments,unsupported:[]};
}
const options={revision:'v1',projectId,sourceHash,stateToken:'fixture-token',runAt:'2026-11-03T00:00:00.000Z'};
function saved(input){return C.createReport({...options,boundaryReview:R.evaluate(input)});}
const input=fixture(),original=copy(input),pass=saved(input),finding=pass.findings.find(f=>f.code==='boundary:ring');
assert.deepEqual(pass.boundaries,{total:1,retained:1,checked:1,status:'pass',knownViolationCount:0});assert.equal(pass.coverage[3].status,'not-checked');assert.equal(pass.coverage.at(-1).status,'pass');assert.equal(pass.status,'unknown');assert.deepEqual(C.validateReports(JSON.parse(JSON.stringify([pass]))),[pass]);assert.deepEqual(input,original);
const details=C.boundaryDetails(finding,pass);assert.equal(details.resolvedEdges.length,4);details.resolvedEdges[0].a[0]=999;assert.deepEqual(input,original);assert.equal(C.boundaryDetails(finding,pass).resolvedEdges[0].a[0],0);
for(const mutate of [f=>f.records[0].intent='open-plan-zone',f=>f.records[0].sourceHashAtCreation='old-source',f=>f.segments[0].frameId='foreign-frame',f=>f.segments.pop(),f=>f.unsupported=['Unsupported fabricated geometry'],f=>f.unsupported=['Unmodeled source\nwith newline']]){const f=copy(input);mutate(f);const report=saved(f);assert.equal(report.boundaries.status,'unknown');assert.deepEqual(C.validateReports([report]),[report]);}
const sameNamespace=copy(input);sameNamespace.records[0].id=sameNamespace.segments[0].id;const sameNamespaceSaved=saved(sameNamespace);assert.equal(sameNamespaceSaved.boundaries.status,'pass');assert.deepEqual(C.validateReports([sameNamespaceSaved]),[sameNamespaceSaved]);
assert.equal(saved({...input,records:[]}).boundaries.status,'unknown');assert.equal(C.createReport(options).boundaries.status,'unknown');
const failInput=copy(input);failInput.segments[1].a[1]=.5;const fail=saved(failInput);assert.equal(fail.boundaries.status,'fail');assert(fail.boundaries.knownViolationCount>0);assert.equal(C.compareReports(pass,fail).changed.includes(finding.id),true);assert(C.isStale(pass,{...options,stateToken:'new-token'}));
const unknown=fixture('unknown');unknown.records[0].intent='open-plan-zone';const mixed=saved({...input,records:[...failInput.records,...unknown.records],segments:[...failInput.segments,...unknown.segments]});assert.equal(mixed.boundaries.status,'unknown');assert(mixed.boundaries.knownViolationCount>0);
for(const mutate of [r=>r.boundaries.checked=0,r=>r.boundaries.status='unknown',r=>r.coverage.at(-1).status='fail',r=>r.findings.find(f=>f.code==='boundary:ring').status='unknown',r=>{const f=r.findings.find(f=>f.code==='boundary:ring'),ctx=JSON.parse(f.evidence.slice(1).join(''));ctx.boundarySourceContext.currentSourceHash='foreign';f.evidence=[f.evidence[0],JSON.stringify(ctx)];},r=>{const f=r.findings.find(f=>f.code==='boundary:ring'),ctx=JSON.parse(f.evidence.slice(1).join(''));ctx.boundarySourceContext.resolvedEdges[0].a=[3,3];f.evidence=[f.evidence[0],JSON.stringify(ctx)];}]){const bad=copy(pass);mutate(bad);assert.throws(()=>C.validateReports([bad]));}
const many=Array.from({length:101},(_,i)=>fixture('ring'+i)),bounded=saved({...input,records:many.flatMap(f=>f.records),segments:many.flatMap(f=>f.segments)});assert.equal(bounded.boundaries.total,101);assert.equal(bounded.boundaries.retained,100);assert.equal(bounded.boundaries.status,'unknown');assert(bounded.findings.some(f=>f.code==='review-incomplete'));assert.deepEqual(C.validateReports([bounded]),[bounded]);
console.log('PASS: saved explicit boundary proof replay, unknown/fail scope, count/import guards, source preservation, stable comparisons and bounded omission disclosure.');
