/* Isolated manual single-overlay requests; not a runtime import or approval grant. */
(function(root){
'use strict';
const VERSION=1,OPERATION='adjust-single-overlay';
const numericFields={furniture:['x','y','w','h'],rect:['x','y','w','h'],arrow:['x','y','x2','y2'],paint:['x','y']};
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('Invalid '+label+': plain JSON object required.');return value;}
function exact(value,allowed,required,label){object(value,label);for(const key of Reflect.ownKeys(value))if(typeof key!=='string'||!allowed.includes(key))throw Error('Unknown '+label+' field: '+String(key));for(const key of required)if(!Object.hasOwn(value,key))throw Error('Missing '+label+' field: '+key);}
function text(value,label,max=300){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw Error('Invalid '+label);return value;}
// Validate before JSON copying: serialization must not erase undefined, sparse
// slots, accessors, symbols, nonfinite numbers or custom object behavior.
function copy(value,label){
 if(Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')||Object.getOwnPropertyDescriptor(Array.prototype,'toJSON'))throw Error('Custom inherited JSON serialization is unsupported.');
 const active=new Set();let count=0;
 function visit(v,depth){if(++count>500000||depth>64)throw Error('JSON limit exceeded: '+label);if(v===null||typeof v==='boolean'||typeof v==='string')return;if(typeof v==='number'){if(!Number.isFinite(v))throw Error('Nonfinite JSON number: '+label);return;}if(typeof v!=='object')throw Error('Non-JSON value: '+label);if(active.has(v))throw Error('Cyclic JSON value: '+label);active.add(v);
  if(Array.isArray(v)){if(Object.getPrototypeOf(v)!==Array.prototype)throw Error('Custom JSON array prototype: '+label);if(v.length>50000)throw Error('JSON array limit exceeded: '+label);const keys=Reflect.ownKeys(v);if(keys.length!==v.length+1)throw Error('Sparse or extended JSON array: '+label);for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Invalid JSON array slot: '+label);visit(d.value,depth+1);}}
  else{object(v,label);for(const key of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,key);if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('Non-JSON property: '+label);visit(d.value,depth+1);}}
  active.delete(v);
 }
 visit(value,0);return JSON.parse(JSON.stringify(value));
}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function build(input,current){
 if(typeof root.ItemAdjustments?.propose!=='function'||typeof root.ItemAdjustments?.applyProposal!=='function'||typeof root.LayerItems?.validate!=='function'||typeof root.LayerItems?.flags!=='function')throw Error('Shared overlay adjustment/policy component unavailable.');
 const request=copy(input,'operation request'),state=copy(current,'current operation context');
 const requestFields=['operationContractVersion','operation','projectId','stateToken','baseRevision','baseSourceHash','targetRef','patch','provider'];
 exact(request,requestFields,requestFields.filter(k=>k!=='provider'),'operation request');
 if(request.operationContractVersion!==VERSION||request.operation!==OPERATION)throw Error('Unsupported manual overlay operation/version.');
 exact(state,['projectId','stateToken','revision','sourceHash','items','objectSettings','layers','calibration'],['projectId','stateToken','revision','sourceHash','items','objectSettings','layers'],'current operation context');
 for(const [key,currentKey]of [['projectId','projectId'],['stateToken','stateToken'],['baseRevision','revision'],['baseSourceHash','sourceHash']])if(text(request[key],key)!==text(state[currentKey],'current '+currentKey))throw Error('Foreign or stale operation: '+key+' does not match.');
 text(request.targetRef,'target reference');if(!/^item:[^\s\u0000-\u001f\u007f]+$/.test(request.targetRef))throw Error('Target must be one explicit overlay item reference.');
 if(Object.hasOwn(request,'provider'))text(request.provider,'informational provider',80);
 object(request.patch,'numeric patch');if(!Object.keys(request.patch).length)throw Error('At least one numeric adjustment is required.');
 if(!Array.isArray(state.items)||state.items.length>5000)throw Error('Invalid current overlay items');
 const ids=new Set();for(const item of state.items){object(item,'current overlay item');text(item.id,'overlay item identity');if(ids.has(item.id))throw Error('Duplicate current overlay item identity');ids.add(item.id);}
 const target=state.items.find(item=>'item:'+item.id===request.targetRef);if(!target)throw Error('Unknown operation target');
 if(!Object.hasOwn(numericFields,target.kind))throw Error('Unsupported operation target kind');
 for(const [key,value]of Object.entries(request.patch))if(!numericFields[target.kind].includes(key)||typeof value!=='number'||!Number.isFinite(value))throw Error('Unsupported or nonfinite numeric adjustment: '+key);
 object(state.objectSettings,'current item settings');root.LayerItems.validate(state.objectSettings);
 exact(state.layers,['base','furniture','markup','comments','photos','original'],['furniture','markup'],'current layer visibility');for(const value of Object.values(state.layers))if(typeof value!=='boolean')throw Error('Current layer visibility must be boolean.');
 const flags=root.LayerItems.flags(state.objectSettings,request.targetRef),layer=target.kind==='furniture'?'furniture':'markup';
 const context={projectId:state.projectId,stateToken:state.stateToken,item:target,locked:flags.locked===true,hidden:flags.hidden===true||state.layers[layer]===false,calibration:state.calibration??null};
 const proposal=root.ItemAdjustments.propose({...context,patch:request.patch});
 return {review:{operationContractVersion:VERSION,request,proposal},context};
}
function propose(request,current){return build(request,current).review;}
function applyProposal(request,review,current){
 const received=copy(review,'reviewed operation');exact(received,['operationContractVersion','request','proposal'],['operationContractVersion','request','proposal'],'reviewed operation');
 const checked=build(request,current);
 if(canonical(received)!==canonical(checked.review))throw Error('Stale or modified operation review: preview the original request against current state again.');
 return root.ItemAdjustments.applyProposal(checked.review.proposal,checked.context);
}
root.CorrectionOperations=Object.freeze({VERSION,OPERATION,propose,applyProposal});
})(typeof window==='undefined'?globalThis:window);
