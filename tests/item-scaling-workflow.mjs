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
import '../src/geometry.js';
import '../src/correction-contract.js';

// Actual contextual controls and domain operations; fabricated DOM/storage/project data.
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
const item=kind=>({id:'item-a',kind,x:100,y:200,w:60,h:40,...(kind==='furniture'?{label:'Fabricated furniture'}:{}),assetId:'asset-a',sourceReference:{id:'fabricated-reference',annotation:'Retain metadata'}});
function fixture(kind='furniture'){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated project',note:'',baseSvg:'<svg/>',viewBox:[0,0,1000,1000],items:[item(kind)],comments:[],photos:[],assets:[AssetRecords.createRecord({id:'asset-a',projectId:'project-a',name:'Fabricated asset',linkedRefs:['item:item-a']})],measurementAnchors:[],measurementChains:[],measurementTolerancePercent:null,consistencyReports:[],objectSettings:{},original:null,nextId:1,layers:{base:true,furniture:true,markup:true}};}
function context(kind='furniture'){
 const registry=new Map(),get=id=>{if(['group-scale-percent','group-rotation-angle'].includes(id)&&!registry.has(id))return null;if(!registry.has(id)){const node=new Element('div',registry);node.id=id;}return registry.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({NS:'http://www.w3.org/2000/svg',KEY:'fabricated-storage',state:fixture(kind),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,ItemAdjustments,OverlayFootprint,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,LayoutGeometry,CorrectionContract,history:[],future:[],selected:'item-a',selectedRefs:new Set(['item:item-a']),selectionProposal:null,groupTranslationProposal:null,groupScaleProposal:null,groupRotationProposal:null,storageWriteFailed:false,$:get,document:{createElement:tag=>new Element(tag,registry),createElementNS:(_ns,tag)=>new Element(tag,registry)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const error=new Error('Fabricated storage quota');error.name='QuotaExceededError';throw error;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},cancelLandmarkMatch(){},reviewOptions(){},geometryOf:()=>({segments:[],dimensions:[],fixtures:[],unsupported:[]}),deleteRefs(){},zoom:1,download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,1000,1000],normalizedLayers:l=>l});
 c.storage=storage;c.inventory=()=>c.state.items.map(o=>({id:o.id,ref:'item:'+o.id,kind:'item',object:o}));c.isLocked=ref=>!!LayerItems.flags(c.state.objectSettings,ref).locked;c.entryVisible=e=>!LayerItems.flags(c.state.objectSettings,e.ref).hidden&&c.state.layers[e.object.kind==='furniture'?'furniture':'markup']!==false;c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','sourceHash','restoreSnapshot','remember','validProject','mutate','make','cancelItemPreview','overlayRotationTransform','drawItemPreview','groupTranslationContext','drawGroupTranslationPreview','renderGroupTranslation','renderGroupScale','drawGroupScalePreview','renderGroupRotation','drawGroupRotationPreview','renderSelection','report','reviewContext','runConsistencyReview','jsonExport','importJSON','handoff'])vm.runInContext(code(name),c);
 c.render=()=>{c.cancelItemPreview();c.renderSelection();};for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.render();return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function control(c,id){const result=c.$('selection-props').querySelector('#'+id);assert.ok(result,'Missing current control '+id);return result;}
function normalInput(c,key){const result=descendants(c.$('selection-props')).find(node=>node.getAttribute('aria-label')==='Selected item '+key);assert.ok(result);return result;}
function preview(c,percent=200){control(c,'selected-scale-percent').value=String(percent);control(c,'preview-item-scale').click();assert.ok(c.selectionProposal,'Scale preview rejected');return clone(c.selectionProposal);}
const shape=o=>({x:o.x,y:o.y,w:o.w,h:o.h});

for(const kind of ['furniture','rect']){
 const c=context(kind),before=snap(c),original=clone(c.state.items[0]);const proposal=preview(c);assert.equal(snap(c),before);assert.deepEqual(shape(proposal.after),{x:70,y:180,w:120,h:80});assert.deepEqual(proposal.pivot,{x:130,y:220});assert.equal(proposal.after.w/proposal.after.h,original.w/original.h);assert.deepEqual(proposal.after.sourceReference,original.sourceReference);assert.equal(proposal.after.assetId,original.assetId);
 const marker=c.$('preview-layer').querySelector('#item-scale-pivot-marker');assert.ok(marker);assert.equal(marker.dataset.scalePivot,'center');assert.equal(marker.querySelector('circle').getAttribute('cx'),'130');assert.equal(marker.querySelector('circle').getAttribute('cy'),'220');assert.equal(control(c,'apply-item-adjustment').disabled,false);
 control(c,'cancel-item-adjustment').click();assert.equal(c.selectionProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(snap(c),before);
 preview(c);control(c,'apply-item-adjustment').click();assert.deepEqual(shape(c.state.items[0]),{x:70,y:180,w:120,h:80});assert.deepEqual(c.state.items[0].sourceReference,original.sourceReference);assert.equal(c.state.items[0].assetId,original.assetId);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.at(-1).type,'item-adjustment');assert.equal(c.state.consistencyReports.length,1);assert.equal(c.state.baseSvg,'<svg/>');assert.deepEqual(JSON.parse(c.storage.text).items,clone(c.state.items));
 preview(c,50);control(c,'apply-item-adjustment').click();assert.deepEqual(shape(c.state.items[0]),shape(original));c.undo();assert.deepEqual(shape(c.state.items[0]),{x:70,y:180,w:120,h:80});c.undo();assert.deepEqual(clone(c.state.items[0]),original);c.redo();assert.deepEqual(shape(c.state.items[0]),{x:70,y:180,w:120,h:80});
}
{
 const c=context(),before=snap(c);preview(c);normalInput(c,'x').value='101';normalInput(c,'x').oninput();assert.equal(c.selectionProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-item-adjustment').disabled,true);control(c,'preview-item-scale').click();assert.equal(c.selectionProposal,null,'Pending numeric changes must not be silently discarded by a scale preview');assert.equal(normalInput(c,'x').value,'101');assert.equal(snap(c),before);
 control(c,'cancel-item-adjustment').click();preview(c);control(c,'selected-scale-percent').value='50';control(c,'selected-scale-percent').oninput();assert.equal(c.selectionProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-item-adjustment').disabled,true);assert.equal(snap(c),before);
}
{
 const c=context();c.state.items[0].label='Saved\r\nlabel';c.render();assert.equal(normalInput(c,'label').value,'Savedlabel');preview(c);control(c,'apply-item-adjustment').click();assert.equal(c.state.items[0].label,'Saved\r\nlabel','Scaling preserves an untouched label even if the native input display normalizes it');
}
for(const restrict of ['token','item','lock','hidden','layer']){
 const c=context();preview(c);if(restrict==='token')c.state.stateToken='changed';if(restrict==='item')c.state.items[0].x=101;if(restrict==='lock')c.state.objectSettings['item:item-a']={locked:true};if(restrict==='hidden')c.state.objectSettings['item:item-a']={hidden:true};if(restrict==='layer')c.state.layers.furniture=false;const before=snap(c);control(c,'apply-item-adjustment').click();assert.equal(snap(c),before,'Apply must reject changed '+restrict);assert.equal(c.storage.writes,0);
}
{
 const c=context();c.state.objectSettings['item:item-a']={locked:true};c.render();assert.equal(control(c,'preview-item-scale').disabled,true);assert.equal(control(c,'selected-scale-percent').disabled,true);c.state.objectSettings['item:item-a']={hidden:true};c.render();assert.equal(control(c,'preview-item-scale').disabled,true);
 c.state.objectSettings={};c.selectedRefs.add('item:other');c.render();assert.equal(c.$('selection-props').querySelector('#preview-item-scale'),null);assert.match(c.$('selection-props').textContent,/selected/);
 for(const unsupported of [{id:'item-a',kind:'arrow',x:0,y:0,x2:10,y2:20},{id:'item-a',kind:'paint',x:0,y:0,points:[[0,0],[5,5]],width:2,color:'#000000'}]){c.state.items=[unsupported];c.selectedRefs=new Set(['item:item-a']);c.render();assert.equal(c.$('selection-props').querySelector('#preview-item-scale'),null,'Unsupported items have no scale controls');}
}
for(const percent of ['',0,-20,'Infinity','NaN']){
 const c=context(),before=snap(c);control(c,'selected-scale-percent').value=String(percent);control(c,'preview-item-scale').click();assert.equal(c.selectionProposal,null);assert.equal(control(c,'apply-item-adjustment').disabled,true);assert.equal(snap(c),before);
}
{
 const c=context();preview(c);const before=snap(c);c.storage.fail=true;control(c,'apply-item-adjustment').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('save-status').textContent,/not saved/i);c.storage.fail=false;preview(c);control(c,'apply-item-adjustment').click();assert.equal(c.history.length,1);assert.equal(c.state.items[0].w,120);
 const full=context();full.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));preview(full);const atCapacity=snap(full);control(full,'apply-item-adjustment').click();assert.equal(snap(full),atCapacity);assert.equal(full.storage.writes,0);
}
{
 const c=context();preview(c);control(c,'apply-item-adjustment').click();const saved=clone(c.state.items),assets=clone(c.state.assets);let blob;c.download=(_name,value)=>blob=value;await c.jsonExport();const text=await blob.text(),restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.items),saved);assert.deepEqual(clone(restored.state.assets),assets);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.items,saved);assert.deepEqual(envelope.assets,assets);assert.equal(envelope.items[0].assetId,'asset-a');
}
console.log('PASS: actual uniform-scale controls/pivot, exact center/aspect/metadata, cancellation and draft guards, lock/visibility/stale rejection, atomic commits and undo/backup/handoff.');
