import assert from 'node:assert/strict';
import '../src/opening-bindings.js';
const O=globalThis.OpeningBindings,copy=structuredClone,E=O.EPSILON;
const record=O.createBinding({id:'synthetic-binding',projectId:'synthetic-project',openingSegmentId:'opening',startJamb:{segmentId:'left',endpoint:'b'},endJamb:{segmentId:'right',endpoint:'a'},sourceHash:'synthetic-source'});
const geometry=()=>[{id:'left',kind:'wall',a:[-10,0],b:[0,0]},{id:'opening',kind:'opening',a:[0,0],b:[10,0]},{id:'right',kind:'wall',a:[10,0],b:[20,0]}];
const context=()=>({records:[copy(record)],projectId:'synthetic-project',sourceHash:'synthetic-source',segments:geometry(),unsupported:[]});
function notPass(input){let result;try{result=O.evaluate(input);}catch{return;}assert.notEqual(result.status,'pass');assert.equal(result.checked,0);}
// A caller must supply an enclosing project identity rather than borrow ownership from a record.
for(const projectId of [undefined,null,'','other-project','bad identity'])notPass({...context(),projectId});
for(const sourceHash of [undefined,null,'',0,{},'bad hash','different-source'])notPass({...context(),sourceHash});
// Unreferenced malformed wall identities must not silently count as complete conflict coverage.
for(const id of [undefined,null,'','bad identity','control\u0000id']){
 const wall={kind:'wall',a:[100,100],b:[110,100]};if(id!==undefined)wall.id=id;const input=context();input.segments.push(wall);assert.equal(O.evaluate(input).status,'unknown','Malformed unrelated wall identity: '+String(id));
}
// Epsilon classification remains explicit and orientation invariant, including endpoint contact.
for(const vertical of [false,true])for(const reverseHosts of [false,true]){
 const input=context();if(reverseHosts){for(const i of [0,2])[input.segments[i].a,input.segments[i].b]=[input.segments[i].b,input.segments[i].a];input.records[0].startJamb.endpoint='a';input.records[0].endJamb.endpoint='b';}if(vertical)for(const s of input.segments){s.a=[-s.a[1],s.a[0]];s.b=[-s.b[1],s.b[0]];}assert.equal(O.evaluate(input).status,'pass');
}
for(const fraction of [0.25,0.75,2]){
 const input=context();input.segments[0].b=[-fraction*E,0];const result=O.evaluate(input);assert.equal(result.status,fraction<1?'pass':'fail');assert.equal(result.findings[0].expected,0);assert.equal(result.findings[0].unit,'drawing-units');
}
for(const width of [0,E/2]){
 const input=context();input.segments[1].b=[width,0];input.segments[2].a=[width,0];assert.equal(O.evaluate(input).status,'unknown','Numerically degenerate opening never passes');
}
for(const wall of [{id:'interior-collinear',kind:'wall',a:[2,0],b:[8,0]},{id:'interior-perpendicular',kind:'wall',a:[5,-3],b:[5,3]},{id:'interior-ending',kind:'wall',a:[5,0],b:[5,3]}]){
 const input=context();input.segments.push(wall);assert.equal(O.evaluate(input).status,'fail');const unsupported=copy(input);unsupported.unsupported=['synthetic CSS context not extracted'];assert.equal(O.evaluate(unsupported).status,'unknown','Incomplete geometry coverage takes precedence over a numeric conflict');
}
// Duplicates are ambiguous even when their coordinates happen to agree.
for(const id of ['left','opening','right']){const input=context();input.segments.push(copy(input.segments.find(s=>s.id===id)));assert.equal(O.evaluate(input).status,'unknown');}
{
 const input=context(),before=copy(input),result=O.preview({...input,binding:record});result.record.endJamb.endpoint='b';result.result.findings[0].evidence.endJamb.point[0]=999;assert.deepEqual(input,before);assert.equal(record.endJamb.endpoint,'a');const stale=O.evaluate({...input,sourceHash:'new-source'});assert.equal(stale.status,'unknown');assert.equal(record.sourceHashAtCreation,'synthetic-source');assert.deepEqual(input,before);
}
{
 const input=context();input.segments.push(...Array.from({length:130},(_,i)=>({id:'synthetic-crossing-'+i,kind:'wall',a:[5,-2],b:[5,2]})));const result=O.evaluate(input),finding=result.findings[0];assert.equal(result.status,'fail');assert.equal(finding.evidence.conflictingWallCount,130);assert.equal(finding.evidence.conflictsTruncated,true);assert.ok(finding.affectedIds.length<=100);assert.equal(new Set(finding.evidence.conflictingWallIds).size,finding.evidence.conflictingWallIds.length);assert.ok(finding.evidence.violations.includes('wall-crosses-opening'));
 input.unsupported=Array.from({length:12},(_,i)=>'synthetic unsupported context '+i);const incomplete=O.evaluate(input).findings[0];assert.equal(incomplete.status,'unknown');assert.equal(incomplete.evidence.unsupportedCount,12);assert.equal(incomplete.evidence.unsupportedTruncated,true);
}
console.log('PASS: opening foundation rejects missing provenance, malformed unrelated walls, ambiguous references and degenerate epsilon geometry; preserves explicit numerical-only, detached source associations.');
