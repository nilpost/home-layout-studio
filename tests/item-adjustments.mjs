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
for(const scalePercent of [200,50,112.5,100,.25]){
 const preview=A.proposeScale({...context,scalePercent}),factor=scalePercent/100;
 assert.equal(preview.operationVersion,1);assert.deepEqual(Object.keys(preview.patch).sort(),['h','w','x','y']);
 assert.equal(preview.after.w,item.w*factor);assert.equal(preview.after.h,item.h*factor);
 assert.equal(preview.after.x+preview.after.w/2,item.x+item.w/2);assert.equal(preview.after.y+preview.after.h/2,item.y+item.h/2);
 assert.deepEqual(preview.pivot,{x:item.x+item.w/2,y:item.y+item.h/2});
 assert.equal(preview.after.label,item.label);assert.equal(preview.after.assetId,item.assetId);
 assert.deepEqual(A.applyProposal(preview,context),preview.after);assert.deepEqual(context,snapshot);
 const restored=JSON.parse(JSON.stringify(preview.before));assert.deepEqual(restored,item,'The ordinary snapshot remains sufficient for undo');
 assert.deepEqual(A.applyProposal(JSON.parse(JSON.stringify(preview)),context),preview.after,'Serializable proposals use the shared apply guard');
}
const scaledRect=A.proposeScale({...context,item:{id:'rect-scale',kind:'rect',x:-1.5,y:2.25,w:3,h:6,color:'#123456'},scalePercent:50});
assert.deepEqual(scaledRect.after,{id:'rect-scale',kind:'rect',x:-.75,y:3.75,w:1.5,h:3,color:'#123456'});
for(const scalePercent of [NaN,Infinity,-1,0,'200',1e308,Number.MIN_VALUE,1e-300])assert.throws(()=>A.proposeScale({...context,scalePercent}));
for(const kind of ['arrow','paint','wall']){
 const overlay=kind==='arrow'?{id:'arrow-scale',kind,x:0,y:0,x2:5,y2:5}:kind==='paint'?{id:'paint-scale',kind,x:0,y:0,points:[[0,0],[5,5]],width:2,color:'#000000'}:{...item,kind};
 assert.throws(()=>A.proposeScale({...context,item:overlay,scalePercent:200}));
}
for(const restriction of [{locked:true},{hidden:true}])assert.throws(()=>A.proposeScale({...context,...restriction,scalePercent:200}));
const staleScale=A.proposeScale({...context,scalePercent:200});
assert.throws(()=>A.applyProposal(staleScale,{...context,stateToken:'changed'}));
assert.throws(()=>A.applyProposal(staleScale,{...context,item:{...item,w:31}}));
const changedScale=structuredClone(staleScale);changedScale.after.w=999;assert.throws(()=>A.applyProposal(changedScale,context));
assert.throws(()=>A.proposeScale({...context,item:{...item,x:A.MAX_COORDINATE,y:A.MAX_COORDINATE},scalePercent:50}));
assert.throws(()=>A.proposeScale({...context,item:{...item,x:A.MAX_COORDINATE-10},scalePercent:200}));
assert.deepEqual(context,snapshot);
const groupItems=[item,{id:'synthetic-arrow',kind:'arrow',x:-3,y:4,x2:9,y2:14,color:'#123456',assetId:'arrow-asset'},{id:'synthetic-paint',kind:'paint',x:3,y:5,points:[[0,0],[-2,4]],width:2,color:'#654321',sourceId:'synthetic-source'},{id:'synthetic-rect',kind:'rect',x:1,y:2,w:7,h:9}];
const group={items:groupItems,selectedRefs:groupItems.map(item=>'item:'+item.id),projectId:context.projectId,stateToken:context.stateToken,lockedRefs:[],hiddenRefs:[],deltaX:12.125,deltaY:-3.5};
const groupBefore=structuredClone(group),translated=A.proposeTranslation(group),replacements=A.applyTranslation(translated,group);
assert.deepEqual(group,groupBefore);assert.equal(translated.members.length,4);
for(let i=0;i<replacements.length;i++){
 assert.equal(replacements[i].id,groupItems[i].id);assert.equal(replacements[i].x,groupItems[i].x+group.deltaX);assert.equal(replacements[i].y,groupItems[i].y+group.deltaY);
 if(replacements[i].kind==='arrow'){assert.equal(replacements[i].x2,groupItems[i].x2+group.deltaX);assert.equal(replacements[i].y2,groupItems[i].y2+group.deltaY);assert.equal(replacements[i].x2-replacements[i].x,groupItems[i].x2-groupItems[i].x);}
 else if(replacements[i].kind==='paint')assert.deepEqual(replacements[i].points,groupItems[i].points);
 else {assert.equal(replacements[i].w,groupItems[i].w);assert.equal(replacements[i].h,groupItems[i].h);}
}
assert.equal(replacements[0].assetId,item.assetId);assert.equal(replacements[1].assetId,'arrow-asset');assert.equal(replacements[2].sourceId,'synthetic-source');
assert.deepEqual(A.applyTranslation(JSON.parse(JSON.stringify(translated)),{...group,selectedRefs:[...group.selectedRefs].reverse()}),replacements);
for(const change of [{selectedRefs:group.selectedRefs.slice(0,1)},{selectedRefs:['item:synthetic-item','photo:synthetic-photo']},{selectedRefs:['item:synthetic-item','item:synthetic-item']},{selectedRefs:['item:synthetic-item','item:missing']},{items:[...groupItems,item]},{deltaX:NaN},{deltaY:Infinity},{deltaX:'2'},{deltaX:A.MAX_COORDINATE},{lockedRefs:['item:synthetic-arrow']},{hiddenRefs:['item:synthetic-paint']}]){
 assert.throws(()=>A.proposeTranslation({...group,...change}));assert.deepEqual(group,groupBefore);
}
assert.throws(()=>A.proposeTranslation({...group,selectedRefs:Array.from({length:101},(_,i)=>'item:'+i)}));
for(const change of [{selectedRefs:group.selectedRefs.slice(1)},{selectedRefs:[...group.selectedRefs.slice(1),'item:other']},{stateToken:'changed'},{projectId:'foreign'},{lockedRefs:['item:synthetic-rect']},{hiddenRefs:['item:synthetic-arrow']},{items:groupItems.slice(1)},{items:groupItems.map((item,i)=>i===3?{...item,x:99}:item)}]){
 assert.throws(()=>A.applyTranslation(translated,{...group,...change}));assert.deepEqual(group,groupBefore);
}
for(const tamper of [p=>p.members.pop(),p=>p.members.push(p.members[0]),p=>{p.members[1].patch.x2++;},p=>{p.members[1].after.color='#ffffff';},p=>{p.members[1].extraOperation='delete';},p=>{p.extraOperation='delete';},p=>{p.deltaX++;}]){const changed=structuredClone(translated);tamper(changed);assert.throws(()=>A.applyTranslation(changed,group));assert.deepEqual(group,groupBefore);}
const paintOverflow={...groupItems[2],x:A.MAX_COORDINATE-1,points:[[0,0],[4,0]]};
assert.throws(()=>A.proposeTranslation({...group,items:[item,paintOverflow],selectedRefs:['item:'+item.id,'item:'+paintOverflow.id],deltaX:0,deltaY:0}));
const rectOverflow={...item,x:A.MAX_COORDINATE-1};assert.throws(()=>A.proposeTranslation({...group,items:[rectOverflow,groupItems[1]],selectedRefs:['item:'+item.id,'item:synthetic-arrow'],deltaX:0,deltaY:0}));
const detachedGroup=structuredClone(translated);detachedGroup.members[2].after.points[0][0]=888;assert.deepEqual(group,groupBefore);
assert.throws(()=>A.proposeTranslation({...group,deltaX:Number.MIN_VALUE}),'Unrepresentable motion must not partially move the group');
console.log('PASS: single-overlay preview/scaling and atomic group translation, bounds, metadata, locks/visibility, exact selection/state guards, tampering and detached serialization.');
