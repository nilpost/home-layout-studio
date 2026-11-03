/* Preparatory request validation only. No geometry, policy, proposal or runtime route. */
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
root.SourceJunctions=Object.freeze({VERSION,OPERATION,MAX_MEMBERS,MAX_COORDINATE,validateRequest});
})(typeof window==='undefined'?globalThis:window);
