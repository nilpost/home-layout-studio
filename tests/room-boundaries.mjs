import assert from 'node:assert/strict';
import '../src/room-boundaries.js';
const R=globalThis.RoomBoundaries,projectId='fabricated-project',sourceHash='fixture-source',frameId='fixture-frame';
const clone=structuredClone;
function fixture(points,prefix='ring'){
 const segments=points.map((p,i)=>({id:prefix+'-'+i,kind:'wall',a:[...p],b:[...points[(i+1)%points.length]],sourceHash,frameId,coordinateStatus:'supported'}));
 const record=R.createDeclaration({id:prefix,projectId,sourceHash,frameId,intent:'enclosure',edges:segments.map(s=>({segmentId:s.id,startEndpoint:'a'}))});return {records:[record],projectId,sourceHash,frameId,segments,unsupported:[]};
}
const rectangle=fixture([[0,0],[6,0],[6,4],[0,4]]),original=clone(rectangle);let result=R.evaluate(rectangle);assert.equal(result.status,'pass');assert.equal(result.checked,1);assert.equal(result.knownViolationCount,0);assert.deepEqual(rectangle,original);assert(!JSON.stringify(rectangle.records).includes('"a":['));
for(const points of [[[0,0],[6,0],[6,2],[2,2],[2,6],[0,6]],[[0,0],[3,0],[6,0],[6,4],[0,4]]]){const f=fixture(points);assert.equal(R.evaluate(f).status,'pass');f.records[0].edges.reverse();for(const edge of f.records[0].edges)edge.startEndpoint='b';assert.equal(R.evaluate(f).status,'pass');}
const mixed=clone(rectangle);mixed.segments[1].kind='window';mixed.segments[2].kind='opening';assert.equal(R.evaluate(mixed).status,'pass');
const violations=f=>R.evaluate(f).findings[0].evidence.numericalViolationCodes;
for(const [points,code]of [
 [[[0,0],[4,0],[4,4],[0,4],[0,2],[6,2],[6,-2],[0,-2]],'nonadjacent-crossing'],
 [[[0,0],[4,0],[4,4],[2,4],[2,0],[2,-2],[0,-2]],'nonadjacent-touch'],
 [[[0,0],[4,0],[2,0],[2,4],[0,4]],'adjacent-overlap-or-retrace'],
 [[[0,0],[6,0],[6,4],[2,4],[2,0],[4,0],[4,-2],[0,-2]],'nonadjacent-overlap-or-retrace'],
 [[[0,0],[4,0],[6,0],[2,0]],'zero-ring-extent']]){const f=fixture(points);assert.equal(R.evaluate(f).status,'fail');assert(violations(f).includes(code));}
const tinyGap=clone(rectangle);tinyGap.segments[1].a[1]=Number.MIN_VALUE;assert.equal(R.evaluate(tinyGap).status,'fail');assert(violations(tinyGap).includes('consecutive-endpoint-mismatch'));
const finalGap=clone(rectangle);finalGap.segments[3].b[1]=.25;assert(violations(finalGap).includes('final-closure-mismatch'));
const misordered=clone(rectangle);[misordered.records[0].edges[1],misordered.records[0].edges[2]]=[misordered.records[0].edges[2],misordered.records[0].edges[1]];assert.equal(R.evaluate(misordered).status,'fail');
const reversedOne=clone(rectangle);reversedOne.records[0].edges[1].startEndpoint='b';assert.equal(R.evaluate(reversedOne).status,'fail');
const tiny=fixture([[0,0],[Number.MIN_VALUE,0],[Number.MIN_VALUE,Number.MIN_VALUE],[0,Number.MIN_VALUE]]);assert.equal(R.evaluate(tiny).status,'pass');
const translated=fixture([[1e9-6,1e9-4],[1e9,1e9-4],[1e9,1e9],[1e9-6,1e9]]);assert.equal(R.evaluate(translated).status,'pass');
const pointGetter=[0,0];let getterCalls=0;Object.defineProperty(pointGetter,'0',{enumerable:true,get(){getterCalls++;throw Error('must not execute');}});
for(const change of [s=>{delete s.coordinateStatus;},s=>{s.coordinateStatus='unsupported';},s=>{delete s.sourceHash;},s=>{s.sourceHash='foreign-source';},s=>{delete s.frameId;},s=>{s.frameId='foreign-frame';},s=>{s.kind='door';},s=>{s.a=[0,NaN];},s=>{s.a=[0,Infinity];},s=>{s.a=[0,1e9+1];},s=>{s.a=Array(2);},s=>{s.a=pointGetter;},s=>{s.a=[0,0];s.b=[1,1];},s=>{s.b=[...s.a];}]){const f=clone(rectangle);change(f.segments[1]);const output=R.evaluate(f);assert.equal(output.status,'unknown');assert.equal(output.findings[0].evidence.resolvedEdgeCount,3);assert.equal(output.knownViolationCount,0,'Unusable geometry cannot create pair/continuity violations');}
assert.equal(getterCalls,0);
const inheritedPoint=[0,0];delete inheritedPoint[0];const pointProto=Object.create(Array.prototype);pointProto[0]=0;Object.setPrototypeOf(inheritedPoint,pointProto);const inheritedPointFixture=clone(rectangle);inheritedPointFixture.segments[0].a=inheritedPoint;assert.equal(R.evaluate(inheritedPointFixture).status,'unknown');
for(const change of [f=>{delete f.unsupported;},f=>{f.unsupported=['unmodeled transformed source'];},f=>{delete f.segments;},f=>{f.segments.pop();},f=>{f.segments.push(clone(f.segments[1]));},f=>{f.records[0].sourceHashAtCreation='old-source';},f=>{f.records[0].frameId='old-frame';},f=>{f.records[0].intent='open-plan-zone';},f=>{delete f.projectId;},f=>{delete f.sourceHash;},f=>{delete f.frameId;}]){const f=clone(rectangle);change(f);assert.equal(R.evaluate(f).status,'unknown');}
const conditional=clone(tinyGap);conditional.segments.pop();let conditionalResult=R.evaluate(conditional);assert.equal(conditionalResult.status,'unknown');assert(conditionalResult.knownViolationCount>0);assert(conditionalResult.findings[0].evidence.numericalViolationCodes.includes('consecutive-endpoint-mismatch'));
const stale=clone(tinyGap);stale.records[0].sourceHashAtCreation='old-source';assert.equal(R.evaluate(stale).status,'unknown');assert(R.evaluate(stale).knownViolationCount>0);
const unsafeFrame=clone(tinyGap);unsafeFrame.segments[1].frameId='foreign-frame';assert.equal(R.evaluate(unsafeFrame).status,'unknown');assert.equal(R.evaluate(unsafeFrame).knownViolationCount,0);
const knownFail=fixture([[0,0],[4,0],[6,0],[2,0]],'known-fail'),unknown=fixture([[0,0],[6,0],[6,4],[0,4]],'unknown-ring');unknown.records[0].intent='open-plan-zone';const combined={...knownFail,records:[...knownFail.records,...unknown.records],segments:[...knownFail.segments,...unknown.segments]};result=R.evaluate(combined);assert.equal(result.status,'unknown');assert.equal(result.findings[0].status,'fail');assert.equal(result.findings[1].status,'unknown');assert(result.knownViolationCount>0);
assert.equal(R.evaluate({...rectangle,records:[]}).status,'unknown');assert.equal(R.evaluate({...rectangle,records:[]}).checked,0);
const validRecord=rectangle.records[0];
for(const mutate of [r=>{r.projectId='foreign';},r=>{r.id='';},r=>{r.intent='inferred-room';},r=>{r.edges[1].segmentId=r.edges[0].segmentId;},r=>{r.edges[0].startEndpoint='auto';},r=>{r.edges[0].x=1;},r=>{r.extra='ignored?';},r=>{r.edges=Array(4);},r=>{r.edges.length=3;},r=>{r.edges=Array.from({length:65},(_,i)=>({segmentId:'edge-'+i,startEndpoint:'a'}));}]){const record=clone(validRecord);mutate(record);assert.throws(()=>R.validate([record],{projectId}));}
assert.throws(()=>R.validate([validRecord,validRecord],{projectId}));assert.throws(()=>R.validate(Array(1),{projectId}));assert.throws(()=>R.validate(Array(1001).fill(validRecord),{projectId}));
for(const bad of [{...rectangle,segments:[null]},{...rectangle,segments:Array(2)},{...rectangle,segments:[{id:'bad',extra:true}]},{...rectangle,unsupported:undefined},{...rectangle,unsupported:Array(1)},{...rectangle,unsupported:['']},{...rectangle,extra:true}])assert.throws(()=>R.evaluate(bad));
const recordGetter=clone(validRecord);Object.defineProperty(recordGetter,'intent',{enumerable:true,get(){getterCalls++;return 'enclosure';}});assert.throws(()=>R.validate([recordGetter]));assert.equal(getterCalls,0);
const many=fixture(Array.from({length:64},(_,i)=>[i%2?100:0,i%2?0:0]));const bounded=R.evaluate(many).findings[0].evidence;assert(bounded.numericalViolationCount>R.MAX_VIOLATIONS);assert.equal(bounded.violations.length,R.MAX_VIOLATIONS);assert.equal(bounded.violationsTruncated,true);
const upstream=R.evaluate({...rectangle,unsupported:Array.from({length:11},()=> 'x'.repeat(201))}).upstream;assert.equal(upstream.unsupportedCount,11);assert.equal(upstream.unsupportedSample.length,10);assert.equal(upstream.unsupportedSample[0].length,200);assert.equal(upstream.unsupportedTruncated,true);
function freeze(v){if(v&&typeof v==='object'){Object.freeze(v);for(const child of Object.values(v))freeze(child);}return v;}
const frozen=freeze(clone(rectangle));assert.equal(R.evaluate(frozen).status,'pass');const detached=R.evaluate(rectangle);detached.findings[0].declaration.edges[0].segmentId='tampered';detached.findings[0].affectedIds[0]='changed';assert.deepEqual(rectangle,original);assert.equal(R.evaluate(rectangle).findings[0].declaration.edges[0].segmentId,validRecord.edges[0].segmentId);const checked=R.validate(rectangle.records,{projectId});checked[0].edges[0].segmentId='changed';assert.deepEqual(rectangle,original);
console.log('Declared room rings: exact orthogonal topology, inclusive contacts, provenance unknowns, retained violations, bounded evidence and immutable declarations pass; runtime/physical acceptance unclaimed.');

const geometryEvidence=R.evaluate(rectangle).findings[0].evidence.resolvedEdges;assert.equal(geometryEvidence.length,4);assert.deepEqual(geometryEvidence[0],{edgeIndex:0,segmentId:'ring-0',kind:'wall',startEndpoint:'a',a:[0,0],b:[6,0],sourceHash,frameId});geometryEvidence[0].a[0]=999;geometryEvidence[1].b[1]=888;assert.deepEqual(rectangle,original);assert.deepEqual(R.evaluate(rectangle).findings[0].evidence.resolvedEdges[0].a,[0,0]);
const mismatchEvidence=R.evaluate(unsafeFrame).findings[0].evidence.resolvedEdges;assert.equal(mismatchEvidence.length,3);assert(!mismatchEvidence.some(e=>e.edgeIndex===1));const staleEvidence=R.evaluate(stale).findings[0].evidence.resolvedEdges;assert.equal(staleEvidence.length,4);assert(staleEvidence.every(e=>e.sourceHash===sourceHash&&e.frameId===frameId));
const reverseEvidence=clone(rectangle);reverseEvidence.records[0].edges.reverse();for(const edge of reverseEvidence.records[0].edges)edge.startEndpoint='b';assert.deepEqual(R.evaluate(reverseEvidence).findings[0].evidence.resolvedEdges[0].a,[0,0]);assert.deepEqual(R.evaluate(reverseEvidence).findings[0].evidence.resolvedEdges[0].b,[0,4]);

assert.deepEqual(R.evaluate(rectangle).coverage,{scope:'explicit-declared-schematic-rings-only',roomDiscoveryPerformed:false,physicalEnclosureVerified:false});assert.deepEqual(R.evaluate({...rectangle,records:[]}).coverage,R.evaluate(rectangle).coverage);
