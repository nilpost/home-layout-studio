import assert from 'node:assert/strict';
import '../src/source-junctions.js';
const fresh=()=>({sourceOperationContractVersion:1,operation:'move-explicit-line-junction',projectId:'fabricated-project',stateToken:'fabricated-token',baseRevision:'v3',baseSourceHash:'fabricated-source',members:[{segmentId:'north',endpoint:'b'},{segmentId:'east',endpoint:'a'}],target:[12.5,-20]});
let cases=0;function test(name,fn){fn();cases++;}
function reject(input){assert.throws(()=>SourceJunctions.validateRequest(input));}
test('valid request retains ordered membership and detached normalized data',()=>{
 const input=fresh(),before=structuredClone(input),result=SourceJunctions.validateRequest(input);assert.deepEqual(result,before);assert.notEqual(result,input);assert.notEqual(result.members,input.members);assert.notEqual(result.members[0],input.members[0]);assert.notEqual(result.target,input.target);result.members[0].endpoint='a';result.target[0]=0;assert.deepEqual(input,before);assert.deepEqual(Object.keys(SourceJunctions),['VERSION','OPERATION','MAX_MEMBERS','MAX_COORDINATE','validateRequest']);
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
console.log('PASS: '+cases+' preparatory source-junction request validation cases; strict data-only namespace, bounded explicit membership/coordinates, detachment and getter/serializer rejection. No geometry, runtime route, proposal, policy or apply capability is provided.');
