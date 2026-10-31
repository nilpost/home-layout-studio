import assert from 'node:assert/strict';
import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import '../src/layer-items.js';
import '../src/correction-contract.js';
import '../src/correction-operations.js';
const C=globalThis.CorrectionOperations,A=globalThis.ItemAdjustments,V1=globalThis.CorrectionContract;
const clone=structuredClone;
const target={id:'synthetic-overlay',kind:'furniture',x:10,y:20,w:30,h:40,label:'Synthetic chair',assetId:'fixture-asset',metadata:{source:'fabricated',retained:[1,2]}};
const current={projectId:'fixture-project',stateToken:'fixture-state',revision:'v3',sourceHash:'fixture-source-hash',items:[target,{id:'sibling',kind:'rect',x:1,y:2,w:3,h:4}],objectSettings:{},layers:{base:true,furniture:true,markup:true,comments:true,photos:true},calibration:null};
const request={operationContractVersion:1,operation:'adjust-single-overlay',projectId:current.projectId,stateToken:current.stateToken,baseRevision:current.revision,baseSourceHash:current.sourceHash,targetRef:'item:'+target.id,patch:{x:12.125,y:-3.5,w:.5}};
const before=clone(current),requestBefore=clone(request),review=C.propose(request,current);
const siteContext={item:target,projectId:current.projectId,stateToken:current.stateToken,locked:false,hidden:false,calibration:null};
assert.equal(C.VERSION,1);assert.equal(C.OPERATION,'adjust-single-overlay');assert.deepEqual(review.proposal,A.propose({...siteContext,patch:request.patch}));assert.deepEqual(C.applyProposal(request,review,current),A.applyProposal(review.proposal,siteContext));assert.deepEqual(current,before);assert.deepEqual(request,requestBefore);assert.equal(C.applyProposal(request,review,current).assetId,target.assetId);
for(const provider of ['Codex','Claude']){const labelled={...request,provider},p=C.propose(labelled,current);assert.deepEqual(p.proposal,review.proposal);assert.deepEqual(C.applyProposal(labelled,p,current),review.proposal.after);}
const rejectRequest=bad=>{const original=clone(current);assert.throws(()=>C.propose(bad,current));assert.deepEqual(current,original);};
for(const change of [{operationContractVersion:2},{operation:'replace-base-svg'},{projectId:'foreign'},{stateToken:'stale'},{baseRevision:'v2'},{baseSourceHash:'stale-hash'},{targetRef:'item:missing'},{targetRef:'base:synthetic-overlay'},{targetRef:'item:synthetic overlay'},{patch:{}},{patch:[]},{patch:{x:NaN}},{patch:{x:Infinity}},{patch:{x:'2'}},{patch:{w:0}},{patch:{label:'Changed'}},{patch:{rotation:90,rotationVersion:1}},{patch:{id:'replacement'}},{patch:{x:2,extra:'ignored?'}},{provider:''},{provider:'a'.repeat(81)},{locked:false},{hidden:false},{after:{x:2}},{operations:[]},{contractVersion:1}])rejectRequest({...request,...change});
for(const bad of [null,[],[request],{},'request'])rejectRequest(bad);
const undefinedRequest={...request,provider:undefined};rejectRequest(undefinedRequest);
const accessor={...request};Object.defineProperty(accessor,'patch',{enumerable:true,get(){throw Error('Getter must not execute');}});assert.throws(()=>C.propose(accessor,current),/Non-JSON property/);
const symbolRequest={...request,[Symbol('extra')]:1};rejectRequest(symbolRequest);const hiddenField={...request};Object.defineProperty(hiddenField,'extra',{value:1});rejectRequest(hiddenField);
for(const restrictions of [{objectSettings:{[request.targetRef]:{locked:true}}},{objectSettings:{[request.targetRef]:{hidden:true}}},{layers:{...current.layers,furniture:false}}]){const changed={...current,...restrictions},snapshot=clone(changed);assert.throws(()=>C.propose(request,changed));assert.throws(()=>C.applyProposal(request,review,changed));assert.deepEqual(changed,snapshot);}
for(const invalidPolicy of [{objectSettings:{[request.targetRef]:{locked:'yes'}}},{objectSettings:{[request.targetRef]:{unknown:true}}},{objectSettings:[]},{layers:{furniture:true}},{layers:{furniture:true,markup:'true'}},{layers:{furniture:true,markup:true,unknown:true}}])assert.throws(()=>C.propose(request,{...current,...invalidPolicy}));
for(const change of [{projectId:'foreign'},{stateToken:'new-state'},{revision:'v4'},{sourceHash:'new-hash'},{items:[{...target,x:11},current.items[1]]},{items:[{...target,metadata:{source:'changed'}},current.items[1]]},{items:[...current.items,target]},{items:current.items.slice(1)}]){const changed={...current,...change},snapshot=clone(changed);assert.throws(()=>C.applyProposal(request,review,changed));assert.deepEqual(changed,snapshot);}
for(const mutate of [p=>{p.proposal.after.x=999;},p=>{p.proposal.before.label='changed';},p=>{p.proposal.patch.x=999;},p=>{p.proposal.unitDescription='verified physical units';},p=>{p.proposal.extra='ignored?';},p=>{p.request.patch.x=999;},p=>{p.operationContractVersion=2;},p=>{p.extra='ignored?';}]){const tampered=clone(review);mutate(tampered);assert.throws(()=>C.applyProposal(request,tampered,current));assert.deepEqual(current,before);}
const coordinated=clone(review);coordinated.request.patch.x=99;coordinated.proposal.patch.x=99;coordinated.proposal.after.x=99;assert.throws(()=>C.applyProposal(request,coordinated,current),'Retained original request rejects coordinated preview tampering');
assert.throws(()=>C.applyProposal({...request,patch:{x:44}},review,current));
const sparseTarget={...target,metadata:{slots:Array(2)}};assert.throws(()=>C.propose(request,{...current,items:[sparseTarget]}),/Sparse/);
for(const metadata of [{bad:NaN},{bad:undefined},{bad:()=>1},{bad:Infinity},{bad:new Date(0)}])assert.throws(()=>C.propose(request,{...current,items:[{...target,metadata}]}));
const cyclic={};cyclic.self=cyclic;assert.throws(()=>C.propose(request,{...current,items:[{...target,metadata:cyclic}]}),/Cyclic/);
for(const overlay of [{id:target.id,kind:'rect',x:0,y:0,w:20,h:10},{id:target.id,kind:'arrow',x:0,y:0,x2:10,y2:20},{id:target.id,kind:'paint',x:0,y:0,points:[[0,0],[5,6]],width:2,color:'#000000'}]){const state={...current,items:[overlay]},r={...request,patch:{x:2.75,y:4.125}},p=C.propose(r,state);assert.deepEqual(C.applyProposal(r,p,state),{...overlay,...r.patch});assert.throws(()=>C.propose(r,{...state,layers:{...state.layers,markup:false}}));}
assert.throws(()=>C.propose(request,{...current,items:[{...target,kind:'wall'}]}));
const detached=C.propose(request,current);detached.proposal.before.metadata.retained[0]=99;detached.proposal.after.metadata.retained[0]=88;detached.request.patch.x=77;assert.deepEqual(current,before);assert.deepEqual(request,requestBefore);const returned=C.applyProposal(request,C.propose(request,current),current);returned.metadata.retained[0]=66;assert.deepEqual(current,before);
function freeze(v){if(v&&typeof v==='object'){Object.freeze(v);for(const child of Object.values(v))freeze(child);}return v;}
const frozenCurrent=freeze(clone(current)),frozenRequest=freeze(clone(request)),frozenReview=freeze(C.propose(frozenRequest,frozenCurrent));assert.deepEqual(C.applyProposal(frozenRequest,frozenReview,frozenCurrent),review.proposal.after);
// The separate module neither changes version1 nor adds its capability to handoffs.
assert.equal(V1.VERSION,1);assert.deepEqual(V1.CAPABILITIES.operations,['replace-base-svg','resolve-existing-comments']);assert.equal(V1.CAPABILITIES.liveProviderIntegration,false);
const handoff=V1.createHandoff({projectId:current.projectId,stateToken:current.stateToken,revision:current.revision,sourceHash:current.sourceHash,payload:{items:current.items}});assert.equal(handoff.contractVersion,1);assert(!Object.hasOwn(handoff,'operationContractVersion'));assert.deepEqual(handoff.capabilities,V1.CAPABILITIES);
const v1Request={contractVersion:1,projectId:current.projectId,stateToken:current.stateToken,baseRevision:current.revision,baseSourceHash:current.sourceHash,newBaseSvg:'<svg xmlns="http://www.w3.org/2000/svg"/>',unknown:'discarded'};assert(!Object.hasOwn(V1.validateCorrection(v1Request,current),'unknown'));assert.throws(()=>V1.validateCorrection(request,current));
assert.deepEqual(current,before);assert.deepEqual(request,requestBefore);
console.log('Manual single-overlay operations: shared numeric parity, identity/policy guards, strict JSON, review binding, atomic isolation and unchanged v1 compatibility pass; browser/runtime acceptance pending.');

// Never execute inherited serializers on Array subclasses/custom prototypes.
let serializerCalls=0;
class SerializedArray extends Array{toJSON(){serializerCalls++;return request;}}
const serializedRequest=new SerializedArray();assert.throws(()=>C.propose(serializedRequest,current),/Custom JSON array prototype/);
const serializedItems=new SerializedArray(...current.items);assert.throws(()=>C.propose(request,{...current,items:serializedItems}),/Custom JSON array prototype/);
const customNested=[1,2];Object.setPrototypeOf(customNested,{toJSON(){serializerCalls++;return [3,4];}});assert.throws(()=>C.propose(request,{...current,items:[{...target,metadata:{retained:customNested}}]}),/Custom JSON array prototype/);assert.equal(serializerCalls,0);assert.equal(customNested[0],1);
for(const prototype of [Object.prototype,Array.prototype]){const prior=Object.getOwnPropertyDescriptor(prototype,'toJSON');try{Object.defineProperty(prototype,'toJSON',{configurable:true,value(){serializerCalls++;return null;}});assert.throws(()=>C.propose(request,current),/Custom inherited JSON serialization/);assert.equal(serializerCalls,0);}finally{if(prior)Object.defineProperty(prototype,'toJSON',prior);else delete prototype.toJSON;}}
assert.deepEqual(current,before);assert.deepEqual(request,requestBefore);
