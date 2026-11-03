/* Explicit native-line junction proposals. Trusted source evidence is supplied by the site adapter. */
(function(root){
'use strict';
const VERSION=1,OPERATION='move-explicit-line-junction',MAX_MEMBERS=16,MAX_COORDINATE=1e9;
const fields=['sourceOperationContractVersion','operation','projectId','stateToken','baseRevision','baseSourceHash','members','target'];
function object(value,allowed,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('Invalid '+label+': plain data object required.');
 for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw Error('Unsupported '+label+' property.');}
 for(const key of allowed)if(!Object.hasOwn(value,key))throw Error('Missing '+label+' field: '+key);
 return Object.fromEntries(allowed.map(key=>[key,Object.getOwnPropertyDescriptor(value,key).value]));
}
function array(value,min,max,label){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('Invalid '+label+': plain data array required.');
 const length=Object.getOwnPropertyDescriptor(value,'length').value;
 if(length<min||length>max||Reflect.ownKeys(value).length!==length+1)throw Error('Invalid '+label+' count or properties.');
 const out=[];for(let i=0;i<length;i++){const descriptor=Object.getOwnPropertyDescriptor(value,String(i));if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw Error('Invalid '+label+' slot.');out.push(descriptor.value);}return out;
}
function identity(value,label,max=300){if(typeof value!=='string'||!value||value.length>max||/[\s\u0000-\u001f\u007f]/.test(value))throw Error('Invalid '+label);return value;}
function validateRequest(input){
 const request=object(input,fields,'source junction request');
 if(request.sourceOperationContractVersion!==VERSION||request.operation!==OPERATION)throw Error('Unsupported source junction operation/version.');
 const projectId=identity(request.projectId,'project identity'),stateToken=identity(request.stateToken,'state token'),baseRevision=identity(request.baseRevision,'base revision',100),baseSourceHash=identity(request.baseSourceHash,'source hash'),ids=new Set();
 const members=array(request.members,2,MAX_MEMBERS,'junction members').map(value=>{const member=object(value,['segmentId','endpoint'],'junction member'),segmentId=identity(member.segmentId,'segment identity');if(!['a','b'].includes(member.endpoint))throw Error('Invalid junction endpoint');if(ids.has(segmentId))throw Error('Duplicate junction segment identity');ids.add(segmentId);return {segmentId,endpoint:member.endpoint};});
 const target=array(request.target,2,2,'junction target').map(value=>{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>MAX_COORDINATE)throw Error('Invalid junction drawing coordinate');return value;});
 return {sourceOperationContractVersion:VERSION,operation:OPERATION,projectId,stateToken,baseRevision,baseSourceHash,members,target};
}
function point(value,label){return array(value,2,2,label).map(n=>{if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>MAX_COORDINATE)throw Error('Invalid '+label);return n;});}
function context(input){
 const value=object(input,['projectId','stateToken','revision','sourceHash','policySnapshot','lines'],'trusted junction context');
 for(const key of ['projectId','stateToken','revision','sourceHash'])identity(value[key],key,key==='revision'?100:300);
 if(typeof value.policySnapshot!=='string'||value.policySnapshot.length>2_000_000)throw Error('Invalid junction policy snapshot');
 const ids=new Set(),lines=array(value.lines,0,20000,'trusted native lines').map(item=>{const line=object(item,['segmentId','kind','a','b','editable','reason'],'trusted native line');identity(line.segmentId,'native line identity');if(ids.has(line.segmentId))throw Error('Ambiguous native line evidence');ids.add(line.segmentId);if(!['wall','window'].includes(line.kind)||typeof line.editable!=='boolean'||typeof line.reason!=='string'||line.reason.length>500)throw Error('Invalid native line evidence');const a=point(line.a,'native start'),b=point(line.b,'native end');if(a.every((value,i)=>value===b[i]))throw Error('Degenerate native line evidence');return {...line,a,b};});
 return {...value,lines};
}
function propose(input,trusted){
 const request=validateRequest(input),current=context(trusted);
 for(const [key,other]of [['projectId','projectId'],['stateToken','stateToken'],['baseRevision','revision'],['baseSourceHash','sourceHash']])if(request[key]!==current[other])throw Error('Foreign or stale source junction: '+key);
 const changes=request.members.map(member=>{const line=current.lines.find(value=>value.segmentId===member.segmentId);if(!line)throw Error('Member is not one proven native wall/window line: '+member.segmentId);if(!line.editable)throw Error(line.reason||'Junction line is hidden, locked or protected.');return {segmentId:member.segmentId,kind:line.kind,endpoint:member.endpoint,before:{a:[...line.a],b:[...line.b]},after:{a:member.endpoint==='a'?[...request.target]:[...line.a],b:member.endpoint==='b'?[...request.target]:[...line.b]}};});
 const origin=changes[0].before[changes[0].endpoint];
 if(changes.some(change=>change.before[change.endpoint].some((value,i)=>value!==origin[i])))throw Error('Selected endpoints do not already coincide exactly. No snapping is performed.');
 if(request.target.every((value,i)=>value===origin[i]))throw Error('Junction target makes no change.');
 if(changes.some(change=>change.after.a.every((value,i)=>value===change.after.b[i])))throw Error('Junction target would collapse a selected line.');
 const selected=new Set(request.members.map(member=>member.segmentId)),stationaryEndpoints=[];
 for(const line of current.lines)if(!selected.has(line.segmentId))for(const endpoint of ['a','b'])if(line[endpoint].every((value,i)=>value===origin[i]))stationaryEndpoints.push({segmentId:line.segmentId,endpoint,point:[...line[endpoint]]});
 return {sourceOperationContractVersion:VERSION,operation:OPERATION,request,policySnapshot:current.policySnapshot,origin:[...origin],target:[...request.target],changes,stationaryEndpoints,limitations:['Explicit selected native line endpoints only; unselected endpoints stay stationary.','Drawing units only; oblique results are allowed. No snapping, inferred membership, physical accuracy or topology pass is established.']};
}
function revalidate(proposal,trusted){
 const expected=object(proposal,['sourceOperationContractVersion','operation','request','policySnapshot','origin','target','changes','stationaryEndpoints','limitations'],'junction proposal');
 // Compare a freshly regenerated result, never apply supplied geometry or policy.
 const fresh=propose(expected.request,trusted);
 let nodeCount=0;const plain=(value,depth=0)=>{if(++nodeCount>200000||depth>16)throw Error('Invalid proposal depth');if(value===null||typeof value==='string'||typeof value==='boolean')return value;if(typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value))return array(value,0,20000,'proposal array').map(item=>plain(item,depth+1));if(value&&typeof value==='object'){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw Error('Invalid proposal key');const data=object(value,keys,'proposal data');return Object.fromEntries(keys.map(key=>[key,plain(data[key],depth+1)]));}throw Error('Invalid proposal value');};
 const candidate=plain(proposal);
 const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
 if(expected.sourceOperationContractVersion!==VERSION||expected.operation!==OPERATION||canonical(fresh)!==canonical(candidate))throw Error('Junction proposal changed or became stale. Preview again.');
 return fresh;
}
root.SourceJunctions=Object.freeze({VERSION,OPERATION,MAX_MEMBERS,MAX_COORDINATE,validateRequest,propose,revalidate});
})(typeof window==='undefined'?globalThis:window);
