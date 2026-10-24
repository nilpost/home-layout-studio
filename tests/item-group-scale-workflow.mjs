import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import '../src/asset-records.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/opening-bindings.js';
import '../src/geometry.js';
import '../src/correction-contract.js';

// Actual all-or-nothing group controls and domain operations on fabricated project data.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
function descendants(node){return node.children.flatMap(child=>[child,...descendants(child)]);}
class Element{
 constructor(tag,registry){this.tag=tag;this.registry=registry;this.children=[];this.attrs={};this.dataset={};this._value='';this.textContent='';this.disabled=false;this.classList={add(){}};}
 set id(value){this._id=value;this.registry.set(value,this);}get id(){return this._id;}
 set value(value){const text=String(value);this._value=this.tag==='input'&&this.type==='text'?text.replace(/[\r\n]/g,''):text;}get value(){return this._value;}
 setAttribute(name,value){this.attrs[name]=String(value);if(name==='id')this.id=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=String(value);}getAttribute(name){return this.attrs[name]??null;}
 replaceChildren(...children){this.children=children;this.textContent='';}append(...children){this.children.push(...children);}showModal(){}close(){}click(){this.onclick?.();}
 querySelectorAll(selector){const choices=selector.split(',');return descendants(this).filter(node=>choices.some(choice=>choice.startsWith('#')?node.id===choice.slice(1):node.tag===choice));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const items=()=>[
 {id:'furniture-a',kind:'furniture',x:100,y:200,w:60,h:40,label:'Fabricated furniture',assetId:'asset-a',metadata:{source:'fabricated-reference'}},
 {id:'rect-a',kind:'rect',x:220,y:180,w:20,h:35,color:'#112233',assetId:'asset-a'},
 {id:'arrow-a',kind:'arrow',x:50,y:50,x2:70,y2:80,color:'#445566',assetId:'asset-a'},
 {id:'paint-a',kind:'paint',x:300,y:350,points:[[0,0],[10,15],[20,5]],width:3,color:'#778899',assetId:'asset-a'}
];
function fixture(){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated project',note:'',baseSvg:'<svg/>',viewBox:[0,0,1000,1000],items:items(),comments:[],photos:[],assets:[AssetRecords.createRecord({id:'asset-a',projectId:'project-a',name:'Fabricated asset',linkedRefs:items().map(o=>'item:'+o.id)})],measurementAnchors:[],measurementChains:[],measurementTolerancePercent:null,consistencyReports:[],objectSettings:{},original:null,nextId:1,layers:{base:true,furniture:true,markup:true}};}
function context(){
 const registry=new Map(),get=id=>{if(['group-scale-percent','group-rotation-angle'].includes(id)&&!registry.has(id))return null;if(!registry.has(id)){const node=new Element('div',registry);node.id=id;}return registry.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({NS:'http://www.w3.org/2000/svg',KEY:'fabricated-storage',state:fixture(),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,ItemAdjustments,OverlayFootprint,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,OpeningBindings,LayoutGeometry,CorrectionContract,history:[],future:[],selected:'furniture-a',selectedRefs:new Set(['item:furniture-a','item:rect-a']),selectionProposal:null,groupTranslationProposal:null,groupScaleProposal:null,groupRotationProposal:null,storageWriteFailed:false,$:get,document:{createElement:tag=>new Element(tag,registry),createElementNS:(_ns,tag)=>new Element(tag,registry)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const error=new Error('Fabricated storage quota');error.name='QuotaExceededError';throw error;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},cancelLandmarkMatch(){},reviewOptions(){},geometryOf:()=>({segments:[],dimensions:[],fixtures:[],unsupported:[]}),deleteRefs(){},zoom:1,download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,1000,1000],normalizedLayers:l=>l});
 c.storage=storage;c.inventory=()=>[...c.state.items.map(o=>({id:o.id,ref:'item:'+o.id,kind:'item',object:o})),...(c.extraEntries||[])];c.isLocked=ref=>!!LayerItems.flags(c.state.objectSettings,ref).locked;c.entryVisible=e=>!LayerItems.flags(c.state.objectSettings,e.ref).hidden&&(e.kind==='item'?c.state.layers[e.object.kind==='furniture'?'furniture':'markup']!==false:c.state.layers.base!==false);c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','sourceHash','restoreSnapshot','remember','validProject','mutate','make','paintNode','cancelItemPreview','overlayRotationTransform','drawItemPreview','groupTranslationContext','drawGroupTranslationPreview','renderGroupTranslation','renderGroupScale','drawGroupScalePreview','renderGroupRotation','drawGroupRotationPreview','renderSelection','report','reviewContext','runConsistencyReview','jsonExport','importJSON','handoff'])vm.runInContext(code(name),c);
 c.render=()=>{c.cancelItemPreview();c.renderSelection();};for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.render();return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function control(c,id){const result=c.$('selection-props').querySelector('#'+id);assert.ok(result,'Missing current control '+id);return result;}
function preview(c,percent=200){control(c,'group-scale-percent').value=String(percent);control(c,'preview-group-scale').click();assert.ok(c.groupScaleProposal,control(c,'group-scale-status').textContent);return clone(c.groupScaleProposal);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function selected(c){return c.state.items.filter(o=>c.selectedRefs.has('item:'+o.id));}
function pivotOf(values){const corners=values.flatMap(o=>OverlayFootprint.rectCorners({...o,rotation:ItemAdjustments.validateRotation(o)})),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};}
function assertScaled(before,after,pivot,factor){near(after.w,before.w*factor);near(after.h,before.h*factor);near(after.x+after.w/2,pivot.x+(before.x+before.w/2-pivot.x)*factor);near(after.y+after.h/2,pivot.y+(before.y+before.h/2-pivot.y)*factor);assert.deepEqual(after.rotation,before.rotation);assert.equal(after.rotationVersion,before.rotationVersion);assert.equal(after.id,before.id);assert.equal(after.assetId,before.assetId);assert.deepEqual(after.metadata,before.metadata);}
for(const rotated of [false,true])for(const percent of [50,200,112.5]){
 const c=context();if(rotated){Object.assign(c.state.items[0],{rotationVersion:1,rotation:45});c.state.items[1].rotation={legacy:'inert metadata'};}c.render();const before=snap(c),original=clone(c.state.items),assets=clone(c.state.assets),pivot=pivotOf(selected(c)),proposal=preview(c,percent);assert.equal(snap(c),before);assert.deepEqual(proposal.pivot,pivot);assert.equal(proposal.members.length,2);proposal.members.forEach((member,i)=>assertScaled(original[i],member.after,pivot,percent/100));
 const ghosts=c.$('preview-layer').children.filter(n=>n.dataset.groupScaleMember);assert.deepEqual(ghosts.map(n=>n.dataset.groupScaleMember),original.slice(0,2).map(o=>o.id));const marker=c.$('preview-layer').querySelector('#group-scale-pivot-marker');assert.ok(marker);near(Number(marker.querySelector('circle').getAttribute('cx')),pivot.x);near(Number(marker.querySelector('circle').getAttribute('cy')),pivot.y);assert.equal(control(c,'apply-group-scale').disabled,false);
 control(c,'cancel-group-scale').click();assert.equal(snap(c),before);assert.equal(c.groupScaleProposal,null);assert.equal(c.$('preview-layer').children.length,0);preview(c,percent);control(c,'apply-group-scale').click();assert.equal(c.history.length,1);assert.equal(c.state.changeLog.length,1);assert.equal(c.state.changeLog[0].changes.length,2);assert.equal(c.state.consistencyReports.length,1);assert.equal(c.state.baseSvg,'<svg/>');assert.deepEqual(clone(c.state.assets),assets);for(let i=0;i<2;i++)assertScaled(original[i],c.state.items[i],pivot,percent/100);assert.deepEqual(clone(c.state.items.slice(2)),original.slice(2));assert.deepEqual(JSON.parse(c.storage.text).items,clone(c.state.items));const scaled=clone(c.state.items);c.undo();assert.deepEqual(clone(c.state.items),original);c.redo();assert.deepEqual(clone(c.state.items),scaled);
}
{
 const c=context(),before=snap(c);preview(c);control(c,'group-scale-percent').value='150';control(c,'group-scale-percent').oninput();assert.equal(c.groupScaleProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-group-scale').disabled,true);assert.equal(snap(c),before);
 control(c,'preview-group-scale').click();assert.ok(c.groupScaleProposal);control(c,'group-translation-dx').value='10';control(c,'group-translation-dx').oninput();assert.equal(c.groupScaleProposal,null);assert.equal(control(c,'apply-group-scale').disabled,true);assert.equal(c.$('preview-layer').children.length,0);control(c,'preview-group-scale').click();assert.equal(c.groupScaleProposal,null,'Pending movement must not be discarded');assert.equal(snap(c),before);
 control(c,'cancel-group-scale').click();control(c,'group-scale-percent').value='150';control(c,'preview-group-translation').click();assert.equal(c.groupTranslationProposal,null,'Pending scaling must not be discarded');assert.equal(snap(c),before);
}
for(const restriction of ['token','project','member','missing','lock','hidden','layer','selection-remove','selection-add','selection-mixed']){
 const c=context();preview(c);if(restriction==='token')c.state.stateToken='changed';if(restriction==='project')c.state.projectId='other';if(restriction==='member')c.state.items[1].w=21;if(restriction==='missing')c.state.items=c.state.items.filter(o=>o.id!=='rect-a');if(restriction==='lock')c.state.objectSettings['item:rect-a']={locked:true};if(restriction==='hidden')c.state.objectSettings['item:rect-a']={hidden:true};if(restriction==='layer')c.state.layers.markup=false;if(restriction==='selection-remove')c.selectedRefs.delete('item:rect-a');if(restriction==='selection-add')c.selectedRefs.add('item:missing');if(restriction==='selection-mixed')c.selectedRefs.add('base:wall-a');const before=snap(c);control(c,'apply-group-scale').click();assert.equal(snap(c),before,restriction);assert.equal(c.storage.writes,0);assert.equal(c.groupScaleProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-group-scale').disabled,true);
}
for(const part of ['pivot','percent','after','before','members']){
 const c=context();preview(c);if(part==='pivot')c.groupScaleProposal.pivot.x++;if(part==='percent')c.groupScaleProposal.scalePercent++;if(part==='after')c.groupScaleProposal.members[1].after.w++;if(part==='before')c.groupScaleProposal.members[1].before.x++;if(part==='members')c.groupScaleProposal.members.pop();const before=snap(c);control(c,'apply-group-scale').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.equal(c.groupScaleProposal,null);
}
for(const restriction of ['locked','hidden','missing','arrow','paint','mixed']){
 const c=context();if(restriction==='locked')c.state.objectSettings['item:rect-a']={locked:true};if(restriction==='hidden')c.state.objectSettings['item:rect-a']={hidden:true};if(restriction==='missing')c.selectedRefs.add('item:missing');if(restriction==='arrow')c.selectedRefs.add('item:arrow-a');if(restriction==='paint')c.selectedRefs.add('item:paint-a');if(restriction==='mixed'){c.selectedRefs.add('base:wall-a');c.extraEntries=[{kind:'base',ref:'base:wall-a',id:'wall-a'}];}c.render();const before=snap(c),button=c.$('selection-props').querySelector('#preview-group-scale');if(button){assert.equal(button.disabled,true);button.click();assert.equal(c.groupScaleProposal,null);}assert.equal(snap(c),before);assert.equal(c.storage.writes,0);
}
for(const value of ['',0,-1,'Infinity','NaN']){const c=context(),before=snap(c);control(c,'group-scale-percent').value=String(value);control(c,'preview-group-scale').click();assert.equal(c.groupScaleProposal,null);assert.equal(control(c,'apply-group-scale').disabled,true);assert.equal(snap(c),before);}
for(const failure of ['quota','history']){const c=context();if(failure==='history')c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated',revision:'v0',commentIds:[],changes:[]}));preview(c);const before=snap(c);c.storage.fail=failure==='quota';control(c,'apply-group-scale').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);}
{
 const c=context();Object.assign(c.state.items[0],{rotationVersion:1,rotation:45});c.state.items[1].rotation={legacy:'inert metadata'};c.render();preview(c);c.selectedRefs=new Set([...c.selectedRefs].reverse());control(c,'apply-group-scale').click();assert.equal(c.history.length,1,'Selected set ordering does not change membership');const saved=clone(c.state.items),assets=clone(c.state.assets);let blob;c.download=(_name,b)=>blob=b;await c.jsonExport();const restored=context();await restored.importJSON(await blob.text());assert.deepEqual(clone(restored.state.items),saved);assert.deepEqual(clone(restored.state.assets),assets);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.items,saved);assert.deepEqual(envelope.assets,assets);
}
for(const field of ['group-scale-percent','group-translation-dx']){const c=context();preview(c);control(c,field).value=field==='group-scale-percent'?'150':'10';const before=snap(c);control(c,'apply-group-scale').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.equal(c.groupScaleProposal,null,'Programmatically changed displayed inputs also invalidate prepared Apply');}
{
 const c=context(),before=snap(c);c.selectedRefs.add('item:arrow-a');control(c,'preview-group-scale').click();assert.equal(c.groupScaleProposal,null);assert.equal(snap(c),before);assert.match(control(c,'group-scale-status').textContent,/selection changed/i);
}
console.log('PASS: group uniform-scale actual controls/common pivot/all ghosts, rotated and legacy metadata, draft/cancel/stale/tamper guards, one atomic transaction, undo/redo and backup/handoff.');
