import assert from 'node:assert/strict';
import '../src/item-adjustments.js';
const A=globalThis.ItemAdjustments;
const item={id:'synthetic-item',kind:'furniture',x:10,y:20,w:30,h:40,label:'Synthetic box',assetId:'synthetic-asset'};
const context={item,projectId:'synthetic-project',stateToken:'state-a',locked:false,hidden:false};
const snapshot=structuredClone(context);
const patch={x:12.125,y:-3.5,w:.5,label:'Adjusted box'};
const proposal=A.propose({...context,patch});
assert.deepEqual(context,snapshot);
assert.equal(proposal.after.x,12.125);assert.equal(proposal.after.w,.5);
assert.equal(proposal.after.assetId,item.assetId);
assert.match(proposal.unitDescription,/provisional.*uncalibrated/);
assert.deepEqual(A.applyProposal(proposal,context),{...item,...patch});
assert.deepEqual(context,snapshot);
const codex=A.propose({...context,patch:structuredClone(patch)}),claude=A.propose({...context,patch:structuredClone(patch)});
assert.deepEqual(codex,claude,'Adapters share identical validated operations');
assert.deepEqual(A.applyProposal(codex,context),A.applyProposal(claude,context));
assert.match(A.propose({...context,patch:{x:0},calibration:{drawingUnits:10,realMillimetres:25,status:'manual'}}).unitDescription,/provisional recorded calibration: 1 drawing unit = 2.5 mm/);
for(const bad of [{x:NaN},{y:Infinity},{w:0},{h:-1},{x:'3'},{rotation:90},{id:'replacement'},{label:'x'.repeat(81)},{x:A.MAX_COORDINATE+1},{}]){
 assert.throws(()=>A.propose({...context,patch:bad}));assert.deepEqual(context,snapshot);
}
for(const restriction of [{locked:true},{hidden:true}]){
 assert.throws(()=>A.propose({...context,...restriction,patch}));
 assert.throws(()=>A.applyProposal(proposal,{...context,...restriction}));
}
for(const stale of [{stateToken:'different-branch'},{projectId:'foreign'},{item:{...item,x:11}},{item:{...item,id:'different-item'}}])assert.throws(()=>A.applyProposal(proposal,{...context,...stale}));
const reordered=Object.fromEntries(Object.entries(item).reverse());assert.deepEqual(A.applyProposal(proposal,{...context,item:reordered}),{...item,...patch});
const tampered=structuredClone(proposal);tampered.after.x=999;assert.throws(()=>A.applyProposal(tampered,context));
proposal.after.label='Mutated preview';assert.equal(item.label,'Synthetic box');
assert.throws(()=>A.propose({...context,patch:{x:1},calibration:{drawingUnits:0,realMillimetres:10}}));
for(const overlay of [{id:'rectangle',kind:'rect',x:0,y:0,w:20,h:10},{id:'arrow',kind:'arrow',x:0,y:0,x2:10,y2:20},{id:'paint',kind:'paint',x:0,y:0,points:[[0,0],[5,6]],width:2,color:'#000000'}]){
 const proposal=A.propose({...context,item:overlay,patch:{x:2.75,y:4.125}});
 assert.deepEqual(A.applyProposal(proposal,{...context,item:overlay}),{...overlay,x:2.75,y:4.125});
 if(overlay.kind==='paint')assert.deepEqual(proposal.after.points,overlay.points);
 assert.throws(()=>A.propose({...context,item:overlay,patch:{label:'Unsupported'}}));
}
assert.throws(()=>A.propose({...context,item:{...item,kind:'wall'},patch:{x:2}}));
assert.throws(()=>A.propose({...context,item:{...item,kind:'paint',points:[[0,0],[NaN,1]]},patch:{x:2}}));
console.log('PASS: exact single-overlay preview/apply, units, metadata, locks/visibility, stale-state/item guards, unsupported edits and atomic rejection.');
