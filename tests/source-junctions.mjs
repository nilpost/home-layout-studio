import assert from 'node:assert/strict';
import '../src/source-junctions.js';
const fresh=()=>({sourceOperationContractVersion:1,operation:'move-explicit-line-junction',projectId:'fabricated-project',stateToken:'fabricated-token',baseRevision:'v3',baseSourceHash:'fabricated-source',members:[{segmentId:'north',endpoint:'b'},{segmentId:'east',endpoint:'a'}],target:[12.5,-20]});
let cases=0;function test(name,fn){fn();cases++;}
function reject(input){assert.throws(()=>SourceJunctions.validateRequest(input));}
test('valid request retains ordered membership and detached normalized data',()=>{
 const input=fresh(),before=structuredClone(input),result=SourceJunctions.validateRequest(input);assert.deepEqual(result,before);assert.notEqual(result,input);assert.notEqual(result.members,input.members);assert.notEqual(result.members[0],input.members[0]);assert.notEqual(result.target,input.target);result.members[0].endpoint='a';result.target[0]=0;assert.deepEqual(input,before);assert.deepEqual(Object.keys(SourceJunctions),['VERSION','OPERATION','MAX_MEMBERS','MAX_COORDINATE','validateRequest','propose','revalidate']);
});
test('bounds accept 2 and 16 distinct members and finite represented drawing coordinates',()=>{
 for(const count of [2,16]){const input=fresh();input.members=Array.from({length:count},(_,i)=>({segmentId:'line-'+i,endpoint:i%2?'a':'b'}));input.target=[-1e9,1e9];assert.deepEqual(SourceJunctions.validateRequest(input),input);}
 const input=fresh();input.target=[Number.MIN_VALUE,-0];assert.deepEqual(SourceJunctions.validateRequest(input).target,input.target);
});
test('namespace version and operation are exact; overlay v1 cannot enter source validation',()=>{
 for(const version of [0,2,'1',null,true])reject({...fresh(),sourceOperationContractVersion:version});
 for(const operation of ['adjust-single-overlay','move-explicit-line-junction ',null])reject({...fresh(),operation});
 const overlay={...fresh(),operationContractVersion:1};delete overlay.sourceOperationContractVersion;reject(overlay);reject({...fresh(),operationContractVersion:1});reject({...fresh(),provider:'example'});reject({...fresh(),status:'pass'});reject({...fresh(),proposal:{}});
});
test('all request and member fields are required and unknown fields reject',()=>{
 for(const key of Object.keys(fresh())){const input=fresh();delete input[key];reject(input);}
 for(const key of ['segmentId','endpoint']){const input=fresh();delete input.members[0][key];reject(input);}
 reject({...fresh(),unknown:'x'});const member=fresh();member.members[0].unknown='x';reject(member);
});
test('identity and revision string bounds reject blank, whitespace, control and non-string values',()=>{
 for(const key of ['projectId','stateToken','baseRevision','baseSourceHash'])for(const value of ['', ' ', 'two words','leading\t','line\nbreak','x\u0000',12,null,{},'x'.repeat(key==='baseRevision'?101:301)])reject({...fresh(),[key]:value});
 const valid=fresh();valid.projectId='p'.repeat(300);valid.baseRevision='r'.repeat(100);assert.equal(SourceJunctions.validateRequest(valid).projectId,valid.projectId);
 for(const value of ['', 'two words',null,1,'x'.repeat(301)]){const input=fresh();input.members[0].segmentId=value;reject(input);}
});
test('membership count, direction and duplicate lines reject including opposite endpoints',()=>{
 for(const count of [0,1,17]){const input=fresh();input.members=Array.from({length:count},(_,i)=>({segmentId:'line-'+i,endpoint:'a'}));reject(input);}
 for(const endpoint of ['A','c','',null,0]){const input=fresh();input.members[0].endpoint=endpoint;reject(input);}
 for(const endpoint of ['a','b']){const input=fresh();input.members[1]={segmentId:input.members[0].segmentId,endpoint};reject(input);}
});
test('target shape, unsafe magnitudes, nonfinite and non-number coordinates reject',()=>{
 for(const target of [[],[1],[1,2,3],null,{},'1,2',[NaN,0],[Infinity,0],[-Infinity,0],[1e9+1,0],[-1e9-1,0],[Number.MAX_SAFE_INTEGER+1,0],['2',0],[2n,0],[undefined,0]])reject({...fresh(),target});
});
test('plain null-prototype data is accepted but inherited/custom objects reject',()=>{
 const input=Object.assign(Object.create(null),fresh());input.members[0]=Object.assign(Object.create(null),input.members[0]);assert.deepEqual(SourceJunctions.validateRequest(input),fresh());
 reject(Object.assign(Object.create({}),fresh()));const inherited=fresh();inherited.members[0]=Object.assign(Object.create({endpoint:'a'}),{segmentId:'north'});reject(inherited);reject(new Date());reject([]);
 const custom=fresh();Object.setPrototypeOf(custom.members,{});reject(custom);
});
test('hidden, symbol and accessor properties reject without getter execution',()=>{
 let calls=0;
 for(const location of ['root','member','members','target'])for(const property of ['hidden','symbol','getter']){
  const input=fresh(),object=location==='root'?input:location==='member'?input.members[0]:input[location];
  if(property==='hidden')Object.defineProperty(object,'hidden',{value:1});
  if(property==='symbol')object[Symbol('extra')]=1;
  if(property==='getter')Object.defineProperty(object,location==='root'?'projectId':location==='member'?'segmentId':'0',{enumerable:true,get(){calls++;throw Error('Getter executed');}});
  reject(input);assert.equal(calls,0);
 }
});
test('sparse, extended and hidden array slots reject without serialization',()=>{
 for(const key of ['members','target']){const input=fresh();delete input[key][0];reject(input);const hidden=fresh();Object.defineProperty(hidden[key],'0',{enumerable:false});reject(hidden);const extra=fresh();extra[key].extra=0;reject(extra);}
 let calls=0;const input=fresh();input.toJSON=()=>{calls++;throw Error('Serializer executed');};reject(input);assert.equal(calls,0);
 const member=fresh();member.members[0].toJSON=input.toJSON;reject(member);assert.equal(calls,0);
});
function trusted(){return {projectId:'fabricated-project',stateToken:'fabricated-token',revision:'v3',sourceHash:'fabricated-source',policySnapshot:'policy-a',lines:[{segmentId:'north',kind:'wall',a:[0,0],b:[10,0],editable:true,reason:''},{segmentId:'east',kind:'window',a:[10,0],b:[10,10],editable:true,reason:''},{segmentId:'tee',kind:'wall',a:[10,0],b:[20,0],editable:false,reason:'Locked'}]};}
function junction(){return {...fresh(),target:[11,1]};}
test('proposal is detached with explicit stationary diagnostics and allows all endpoint orientations',()=>{
 for(const a of ['a','b'])for(const b of ['a','b']){const current=trusted(),request=junction();if(a==='a')current.lines[0].a=[10,0],current.lines[0].b=[0,0];if(b==='b')current.lines[1].b=[10,0],current.lines[1].a=[10,10];request.members=[{segmentId:'north',endpoint:a},{segmentId:'east',endpoint:b}];const before=structuredClone(current),proposal=SourceJunctions.propose(request,current);assert.deepEqual(proposal.origin,[10,0]);assert.deepEqual(proposal.stationaryEndpoints,[{segmentId:'tee',endpoint:'a',point:[10,0]}]);assert.deepEqual(current,before);proposal.changes[0].before.a[0]=999;assert.deepEqual(current,before);}
});
test('proposal enforces current identity, exact coincidence, no-op/collapse and trusted policy',()=>{
 for(const key of ['projectId','stateToken','revision','sourceHash']){const current=trusted();current[key]='changed';assert.throws(()=>SourceJunctions.propose(junction(),current));}
 for(const change of [c=>c.lines[1].a=[10,1],c=>c.lines[0].editable=false,c=>c.lines[0].kind='opening',c=>c.lines.push({...c.lines[0]}),c=>c.lines[0].b=[0,0]]){const current=trusted();change(current);assert.throws(()=>SourceJunctions.propose(junction(),current));}
 for(const target of [[10,0],[0,0],[10,10]])assert.throws(()=>SourceJunctions.propose({...junction(),target},trusted()));
});
test('16 explicit members remain bounded with no automatically included endpoint',()=>{const current=trusted();current.lines=Array.from({length:16},(_,i)=>({segmentId:'line-'+i,kind:'wall',a:[10,0],b:[i,10],editable:true,reason:''}));const request={...junction(),members:current.lines.map(line=>({segmentId:line.segmentId,endpoint:'a'}))};const proposal=SourceJunctions.propose(request,current);assert.equal(proposal.changes.length,16);assert.deepEqual(proposal.stationaryEndpoints,[]);});
test('revalidate regenerates current proof and rejects tampering, policy drift and non-data proposals',()=>{
 const current=trusted(),proposal=SourceJunctions.propose(junction(),current);assert.deepEqual(SourceJunctions.revalidate(proposal,current),proposal);
 assert.throws(()=>SourceJunctions.revalidate(proposal,{...current,policySnapshot:'policy-b'}));
 for(const change of [p=>p.changes[0].after.a=[1,2],p=>p.target=[1,2],p=>p.request.target=[1,2],p=>p.stationaryEndpoints=[],p=>p.extra=true]){const tampered=structuredClone(proposal);change(tampered);assert.throws(()=>SourceJunctions.revalidate(tampered,current));}
 let calls=0;const getter=structuredClone(proposal);Object.defineProperty(getter.changes[0],'after',{enumerable:true,get(){calls++;throw Error('Getter executed');}});assert.throws(()=>SourceJunctions.revalidate(getter,current));assert.equal(calls,0);
 const serial=structuredClone(proposal);serial.changes[0].toJSON=()=>{calls++;throw Error('Serializer executed');};assert.throws(()=>SourceJunctions.revalidate(serial,current));assert.equal(calls,0);
});
console.log('PASS: '+cases+' source-junction request/proposal cases; strict namespace/data, bounded explicit members, detached geometry, exact origin/no-op/collapse, stationary diagnostics, current-policy revalidation and tamper rejection. Native-source ownership and Apply require the separate trusted site adapter.');
