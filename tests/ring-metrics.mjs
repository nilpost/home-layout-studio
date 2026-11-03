import assert from 'node:assert/strict';
import '../src/room-boundaries.js';
import '../src/ring-metrics.js';
const clone=v=>JSON.parse(JSON.stringify(v));
function ring(points){
 const segments=points.map((a,i)=>({id:'edge-'+i,kind:i===1?'opening':'wall',a:[...a],b:[...points[(i+1)%points.length]],sourceHash:'source-a',frameId:'frame-a',coordinateStatus:'supported'}));
 return {projectId:'project-a',sourceHash:'source-a',frameId:'frame-a',unsupported:[],segments,records:[{id:'ring-a',projectId:'project-a',sourceHashAtCreation:'source-a',frameId:'frame-a',intent:'enclosure',edges:segments.map(s=>({segmentId:s.id,startEndpoint:'a'}))}]};
}
const rectangle=()=>ring([[0,0],[10,0],[10,6],[0,6]]);
let cases=0;function test(name,fn){fn();cases++;}
function computed(input,area,perimeter){const before=clone(input),result=RingMetrics.evaluate(input),f=result.findings[0];assert.equal(result.metricVersion,1);assert.equal(result.numericalProfile,'integer-root-drawing-units-v1');assert.equal(result.physicalUnitsVerified,false);assert.equal(f.status,'computed');assert.equal(f.areaDrawingUnitsSquared,String(area));assert.equal(f.perimeterDrawingUnits,String(perimeter));assert.equal(f.sourceHash,input.sourceHash);assert.equal(f.frameId,input.frameId);assert.equal(f.declarationId,input.records[0].id);assert.equal(f.projectId,input.projectId);assert.deepEqual(input,before);assert.doesNotThrow(()=>JSON.stringify(result));return result;}
function unknown(input){const before=clone(input),result=RingMetrics.evaluate(input);assert.equal(result.status,'unknown');for(const f of result.findings){assert.equal(f.status,'unknown');assert.equal(f.areaDrawingUnitsSquared,null);assert.equal(f.perimeterDrawingUnits,null);assert.ok(f.reasons.length);}assert.deepEqual(input,before);return result;}
test('rectangle in either winding, negatives and concavity yield exact detached results',()=>{
 computed(rectangle(),60,32);
 const reverse=rectangle();reverse.records[0].edges.reverse().forEach(edge=>edge.startEndpoint='b');computed(reverse,60,32);
 computed(ring([[-8,-5],[-2,-5],[-2,-1],[-8,-1]]),24,20);
 computed(ring([[0,0],[6,0],[6,2],[2,2],[2,5],[0,5]]),18,22);
 const input=rectangle(),result=computed(input,60,32);result.findings[0].reasons.push('detached');result.findings[0].areaDrawingUnitsSquared='changed';assert.equal(RingMetrics.evaluate(input).findings[0].areaDrawingUnitsSquared,'60');
});
test('translation at coordinate limit avoids catastrophic floating cancellation',()=>{computed(ring([[999999999,999999999],[1000000000,999999999],[1000000000,1000000000],[999999999,1000000000]]),1,4);});
test('max-coordinate totals are JSON-safe exact decimal strings rather than unsafe numbers',()=>{computed(ring([[-1e9,-1e9],[1e9,-1e9],[1e9,1e9],[-1e9,1e9]]),'4000000000000000000','8000000000');});
test('64 edges and collinear continuation retain exact totals',()=>{
 const points=[];for(let x=0;x<16;x++)points.push([x,0]);for(let y=0;y<16;y++)points.push([16,y]);for(let x=16;x>0;x--)points.push([x,16]);for(let y=16;y>0;y--)points.push([0,y]);assert.equal(points.length,64);computed(ring(points),256,64);
});
test('fractional, tiny and subnormal coordinates remain unknown with no rounding',()=>{for(const width of [.5,1e-100,Number.MIN_VALUE]){const result=unknown(ring([[0,0],[width,0],[width,2],[0,2]]));assert.ok(result.findings[0].reasons.includes('noninteger-coordinate-profile'));}});
test('stale source/frame, absent context and open-plan remain unknown',()=>{
 for(const change of [i=>i.sourceHash='changed',i=>i.frameId='changed',i=>delete i.projectId,i=>delete i.sourceHash,i=>delete i.frameId,i=>delete i.segments,i=>delete i.unsupported,i=>i.records[0].intent='open-plan-zone']){const input=rectangle();change(input);unknown(input);}
});
test('incomplete, ambiguous and unsupported geometry cannot produce partial totals',()=>{
 for(const change of [i=>i.segments.pop(),i=>i.segments.push(clone(i.segments[0])),i=>i.segments[0].kind='furniture',i=>i.segments[0].coordinateStatus='unsupported',i=>i.segments[0].sourceHash='other',i=>i.segments[0].frameId='other',i=>i.unsupported.push('Unresolved synthetic style'),i=>i.segments[0].a=[-1e9-1,0],i=>i.segments[0].a=[Infinity,0]]){const input=rectangle();change(input);const result=RingMetrics.evaluate(input);assert.equal(result.findings[0].status,'unknown');assert.equal(result.findings[0].areaDrawingUnitsSquared,null);assert.equal(result.findings[0].perimeterDrawingUnits,null);}
});
test('gaps, self-touch, overlaps/retraces and crossings return no totals',()=>{
 const gap=rectangle();gap.segments[1].a=[10,1];unknown(gap);
 for(const points of [[[0,0],[10,0],[5,0],[5,6],[0,6]],[[0,0],[4,0],[4,4],[2,4],[2,-2],[0,-2]],[[0,0],[4,0],[4,4],[2,4],[2,0],[0,0],[0,-2],[-2,-2],[-2,0]]])unknown(ring(points));
 const repeated=rectangle();repeated.segments[1].b=[10,0];unknown(repeated);
});
test('malformed/accessor/inherited/sparse inputs reject without executing getters or serializers',()=>{
 let calls=0;const withGetter=rectangle();Object.defineProperty(withGetter,'sourceHash',{enumerable:true,get(){calls++;throw Error('Getter ran');}});assert.throws(()=>RingMetrics.evaluate(withGetter));assert.equal(calls,0);
 const edgeGetter=rectangle();Object.defineProperty(edgeGetter.segments[0].a,'0',{enumerable:true,get(){calls++;throw Error('Getter ran');}});const result=RingMetrics.evaluate(edgeGetter);assert.equal(calls,0);assert.equal(result.findings[0].status,'unknown');
 for(const input of [null,{status:'pass'},Object.assign(Object.create({}),rectangle()),{...rectangle(),records:Array(1)},{...rectangle(),toJSON(){calls++;return rectangle();}},{...rectangle(),segments:[{...rectangle().segments[0],extra:'unsupported'}]}])assert.throws(()=>RingMetrics.evaluate(input));assert.equal(calls,0);
 const duplicate=rectangle();duplicate.records[0].edges[1].segmentId='edge-0';assert.throws(()=>RingMetrics.evaluate(duplicate));
});
test('empty input is explicit unknown and mixed declarations preserve per-ring scope',()=>{
 const empty=rectangle();empty.records=[];assert.deepEqual(RingMetrics.evaluate(empty).reasons,['no-room-declarations']);
 const mixed=rectangle();mixed.records.push({...clone(mixed.records[0]),id:'ring-b',intent:'open-plan-zone'});const result=RingMetrics.evaluate(mixed);assert.equal(result.status,'unknown');assert.equal(result.findings[0].status,'computed');assert.equal(result.findings[1].areaDrawingUnitsSquared,null);
});
test('topology result and frozen version remain unchanged after measurement',()=>{const input=rectangle(),before=RoomBoundaries.evaluate(input);RingMetrics.evaluate(input);assert.deepEqual(RoomBoundaries.evaluate(input),before);assert.equal(RoomBoundaries.VERSION,1);assert.equal(before.findings[0].evidence.scope,'Explicit schematic topology only; no physical enclosure, area, calibration or compliance claim.');});
console.log('PASS: '+cases+' exact ring metric cases; integer-coordinate decimal strings, translated/maximum/64-edge arithmetic, strict raw-input topology gating, detached unknowns and frozen evaluator preservation.');
