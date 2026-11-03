/* Explicit open-path terminal proposals. Trusted whole-owner evidence comes from the site adapter. */
(function(root){
'use strict';
const VERSION=2,OPERATION='move-explicit-open-path-junction',MAX_MEMBERS=16,MAX_COORDINATE=1e9;
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
 const members=array(request.members,2,MAX_MEMBERS,'path junction members').map(value=>{const member=object(value,['ownerId','subpathIndex','endpoint'],'path terminal member'),ownerId=identity(member.ownerId,'path owner identity');if(!Number.isSafeInteger(member.subpathIndex)||member.subpathIndex<0||!['start','end'].includes(member.endpoint))throw Error('Invalid open-path terminal');if(ids.has(ownerId))throw Error('Duplicate path owner identity');ids.add(ownerId);return {ownerId,subpathIndex:member.subpathIndex,endpoint:member.endpoint};});
 const target=array(request.target,2,2,'junction target').map(value=>{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>MAX_COORDINATE)throw Error('Invalid junction drawing coordinate');return value;});
 return {sourceOperationContractVersion:VERSION,operation:OPERATION,projectId,stateToken,baseRevision,baseSourceHash,members,target};
}
function point(value,label){return array(value,2,2,label).map(n=>{if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>MAX_COORDINATE)throw Error('Invalid '+label);return n;});}
function context(input){
 const value=object(input,['projectId','stateToken','revision','sourceHash','policySnapshot','owners'],'trusted path junction context');for(const key of ['projectId','stateToken','revision','sourceHash'])identity(value[key],key,key==='revision'?100:300);if(typeof value.policySnapshot!=='string'||value.policySnapshot.length>2_000_000)throw Error('Invalid path policy snapshot');
 const ids=new Set(),owners=array(value.owners,0,20000,'trusted path owners').map(item=>{const owner=object(item,['ownerId','kind','subpaths','editable','reason'],'trusted path owner');identity(owner.ownerId,'path owner identity');if(ids.has(owner.ownerId))throw Error('Ambiguous path owner');ids.add(owner.ownerId);if(!['wall','window'].includes(owner.kind)||typeof owner.editable!=='boolean'||typeof owner.reason!=='string'||owner.reason.length>500)throw Error('Invalid trusted path owner');const subpaths=array(owner.subpaths,1,20000,'path subpaths').map(item=>{const subpath=object(item,['vertices','closed'],'path subpath');if(typeof subpath.closed!=='boolean')throw Error('Invalid path closure');return {vertices:array(subpath.vertices,1,20000,'path vertices').map(value=>point(value,'path vertex')),closed:subpath.closed};});return {...owner,subpaths};});return {...value,owners};
}
function terminals(owner){let offset=0;const result=[];for(const [subpathIndex,subpath]of owner.subpaths.entries()){const count=subpath.vertices.length;if(!subpath.closed&&count>=2&&!subpath.vertices[0].every((n,i)=>n===subpath.vertices.at(-1)[i]))for(const endpoint of ['start','end']){const vertexIndex=endpoint==='start'?0:count-1,otherIndex=endpoint==='start'?1:count-2;result.push({ownerId:owner.ownerId,subpathIndex,endpoint,vertexIndex,incidentEdgeId:owner.ownerId+':'+(endpoint==='start'?offset:offset+count-2),point:[...subpath.vertices[vertexIndex]],other:[...subpath.vertices[otherIndex]]});}offset+=count-1+(subpath.closed?1:0);}return result;}
function propose(input,trusted){
 const request=validateRequest(input),current=context(trusted);for(const [key,other]of [['projectId','projectId'],['stateToken','stateToken'],['baseRevision','revision'],['baseSourceHash','sourceHash']])if(request[key]!==current[other])throw Error('Foreign or stale path junction: '+key);
 const changes=request.members.map(member=>{const owner=current.owners.find(value=>value.ownerId===member.ownerId);if(!owner)throw Error('Member is not one proven native path owner');if(!owner.editable)throw Error(owner.reason||'Path owner is hidden, locked or protected.');const terminal=terminals(owner).find(value=>value.subpathIndex===member.subpathIndex&&value.endpoint===member.endpoint);if(!terminal)throw Error('Choose only a non-loop terminal of an open subpath with at least two vertices.');if(request.target.every((n,i)=>n===terminal.other[i]))throw Error('Path junction target would collapse its incident edge.');const subpath=owner.subpaths[member.subpathIndex],opposite=member.endpoint==='start'?subpath.vertices.at(-1):subpath.vertices[0];if(request.target.every((n,i)=>n===opposite[i]))throw Error('Path junction target would create a repeated-terminal loop.');return {ownerId:owner.ownerId,kind:owner.kind,subpathIndex:member.subpathIndex,endpoint:member.endpoint,vertexIndex:terminal.vertexIndex,incidentEdgeId:terminal.incidentEdgeId,before:[...terminal.point],after:[...request.target],beforeSegment:{a:member.endpoint==='start'?[...terminal.point]:[...terminal.other],b:member.endpoint==='start'?[...terminal.other]:[...terminal.point]},afterSegment:{a:member.endpoint==='start'?[...request.target]:[...terminal.other],b:member.endpoint==='start'?[...terminal.other]:[...request.target]}};});
 const origin=changes[0].before;if(changes.some(change=>change.before.some((n,i)=>n!==origin[i])))throw Error('Selected path terminals do not already coincide exactly. No snapping is performed.');if(request.target.every((n,i)=>n===origin[i]))throw Error('Path junction target makes no change.');
 const selected=new Set(changes.map(change=>change.ownerId+'\0'+change.subpathIndex+'\0'+change.endpoint)),stationaryTerminals=[];for(const owner of current.owners)for(const terminal of terminals(owner))if(!selected.has(terminal.ownerId+'\0'+terminal.subpathIndex+'\0'+terminal.endpoint)&&terminal.point.every((n,i)=>n===origin[i]))stationaryTerminals.push({ownerId:terminal.ownerId,subpathIndex:terminal.subpathIndex,endpoint:terminal.endpoint,point:[...terminal.point]});
 return {sourceOperationContractVersion:VERSION,operation:OPERATION,request,policySnapshot:current.policySnapshot,origin:[...origin],target:[...request.target],changes,stationaryTerminals,limitations:['Only explicit open path terminals move; all other vertex slots remain stationary.','Drawing units only. No snapping, inferred membership, physical accuracy or topology pass. Native path command formatting may normalize.']};
}
function revalidate(proposal,trusted){
 const expected=object(proposal,['sourceOperationContractVersion','operation','request','policySnapshot','origin','target','changes','stationaryTerminals','limitations'],'junction proposal');
 // Compare a freshly regenerated result, never apply supplied geometry or policy.
 const fresh=propose(expected.request,trusted);
 let nodeCount=0;const plain=(value,depth=0)=>{if(++nodeCount>200000||depth>16)throw Error('Invalid proposal depth');if(value===null||typeof value==='string'||typeof value==='boolean')return value;if(typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value))return array(value,0,20000,'proposal array').map(item=>plain(item,depth+1));if(value&&typeof value==='object'){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw Error('Invalid proposal key');const data=object(value,keys,'proposal data');return Object.fromEntries(keys.map(key=>[key,plain(data[key],depth+1)]));}throw Error('Invalid proposal value');};
 const candidate=plain(proposal);
 const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
 if(expected.sourceOperationContractVersion!==VERSION||expected.operation!==OPERATION||canonical(fresh)!==canonical(candidate))throw Error('Junction proposal changed or became stale. Preview again.');
 return fresh;
}
root.SourcePathJunctions=Object.freeze({VERSION,OPERATION,MAX_MEMBERS,MAX_COORDINATE,validateRequest,propose,revalidate});
})(typeof window==='undefined'?globalThis:window);
