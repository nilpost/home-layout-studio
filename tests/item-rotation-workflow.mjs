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

// Actual rotation controls, persistence and domain with invented data; no browser/private source.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
function descendants(node){return node.children.flatMap(child=>[child,...descendants(child)]);}
class Element{
 constructor(tag,registry){this.tag=tag;this.registry=registry;this.children=[];this.attrs={};this.dataset={};this._value='';this.textContent='';this.disabled=false;this.classList={add(){}};}
 set id(value){this._id=value;this.registry.set(value,this);}get id(){return this._id;}
 set value(value){const text=String(value);this._value=this.tag==='input'&&this.type==='text'?text.replace(/[\r\n]/g,''):text;}get value(){return this._value;}
 setAttribute(name,value){this.attrs[name]=String(value);if(name==='id')this.id=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=String(value);}getAttribute(name){return this.attrs[name]??null;}
 replaceChildren(...children){this.children=[];this.append(...children);this.textContent='';}append(...children){for(const child of children){child.parent=this;this.children.push(child);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(v=>v!==this);}cloneNode(deep){const n=new Element(this.tag,new Map());n.attrs={...this.attrs};n.dataset={...this.dataset};n._id=this.id;n.textContent=this.textContent;if(deep)n.append(...this.children.map(v=>v.cloneNode(true)));return n;}showModal(){}close(){}click(){this.onclick?.();}
 querySelectorAll(selector){const choices=selector.split(',');return descendants(this).filter(node=>choices.some(choice=>choice.startsWith('#')?node.id===choice.slice(1):node.tag===choice));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const item=kind=>({id:'item-a',kind,x:100,y:200,w:60,h:40,...(kind==='furniture'?{label:'Fabricated furniture'}:{}),assetId:'asset-a',sourceReference:{id:'fabricated-reference',annotation:'Retain metadata'}});
function fixture(kind='furniture'){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated project',note:'',baseSvg:'<svg/>',viewBox:[0,0,1000,1000],items:[item(kind)],comments:[],photos:[],assets:[AssetRecords.createRecord({id:'asset-a',projectId:'project-a',name:'Fabricated asset',linkedRefs:['item:item-a']})],measurementAnchors:[],measurementChains:[],measurementTolerancePercent:null,consistencyReports:[],objectSettings:{},original:null,nextId:1,layers:{base:true,furniture:true,markup:true}};}
function context(kind='furniture'){
 const registry=new Map(),get=id=>{if(['group-scale-percent','group-rotation-angle'].includes(id)&&!registry.has(id))return null;if(!registry.has(id)){const node=new Element('div',registry);node.id=id;}return registry.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({NS:'http://www.w3.org/2000/svg',KEY:'fabricated-storage',state:fixture(kind),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,ItemAdjustments,OverlayFootprint,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,OpeningBindings,LayoutGeometry,CorrectionContract,history:[],future:[],tool:'select',landmarkMatch:null,selected:'item-a',selectedRefs:new Set(['item:item-a']),selectionProposal:null,groupTranslationProposal:null,groupScaleProposal:null,groupRotationProposal:null,storageWriteFailed:false,$:get,document:{createElement:tag=>new Element(tag,registry),createElementNS:(_ns,tag)=>new Element(tag,registry)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const error=new Error('Fabricated storage quota');error.name='QuotaExceededError';throw error;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},cancelLandmarkMatch(){},reviewOptions(){},geometryOf:()=>({segments:[],dimensions:[],fixtures:[],unsupported:[]}),deleteRefs(){},zoom:1,download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString(s){if(typeof s==='string')return s;return '<'+s.tag+' '+Object.entries(s.attrs).map(([k,v])=>k+'="'+v+'"').join(' ')+'>'+s.textContent+s.children.map(v=>this.serializeToString(v)).join('')+'</'+s.tag+'>';}},parseVB:()=>[0,0,1000,1000],normalizedLayers:l=>l});
 c.storage=storage;c.inventory=()=>c.state.items.map(o=>({id:o.id,ref:'item:'+o.id,kind:'item',object:o}));c.isLocked=ref=>!!LayerItems.flags(c.state.objectSettings,ref).locked;c.entryVisible=e=>!LayerItems.flags(c.state.objectSettings,e.ref).hidden&&c.state.layers[e.object.kind==='furniture'?'furniture':'markup']!==false;c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','sourceHash','restoreSnapshot','remember','validProject','mutate','make','cancelItemPreview','overlayRotationTransform','drawItemPreview','groupTranslationContext','drawGroupTranslationPreview','renderGroupTranslation','renderGroupScale','drawGroupScalePreview','renderGroupRotation','drawGroupRotationPreview','renderSelection','svgRect','renderObjects','renderScaleHandle','renderItemHighlights','exportSvg','report','reviewContext','runConsistencyReview','jsonExport','importJSON','handoff'])vm.runInContext(code(name),c);
 c.refFlags=ref=>LayerItems.flags(c.state.objectSettings,ref);c.$('show-furniture').checked=true;c.$('show-markup').checked=true;c.$('drawing').append(c.$('furniture-layer'),c.$('markup-layer'),c.$('preview-layer'),c.$('selection-layer'),c.$('base-hit-layer'));c.render=()=>{c.layerEntries=c.inventory();c.renderObjects();c.renderSelection();c.renderItemHighlights();};for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.render();return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function control(c,id){const result=c.$('selection-props').querySelector('#'+id);assert.ok(result,'Missing current control '+id);return result;}
function normalInput(c,key){const result=descendants(c.$('selection-props')).find(node=>node.getAttribute('aria-label')==='Selected item '+key);assert.ok(result);return result;}
function preview(c,percent=200){control(c,'selected-scale-percent').value=String(percent);control(c,'preview-item-scale').click();assert.ok(c.selectionProposal,'Scale preview rejected');return clone(c.selectionProposal);}
const shape=o=>({x:o.x,y:o.y,w:o.w,h:o.h});

function rotate(c,angle=45){control(c,'selected-rotation-angle').value=String(angle);control(c,'preview-item-rotation').click();assert.ok(c.selectionProposal,'Rotation preview rejected');return clone(c.selectionProposal);}
const local=o=>({x:o.x,y:o.y,w:o.w,h:o.h});
for(const kind of ['furniture','rect'])for(const angle of [0,90,-90,180,45]){
 const c=context(kind),before=snap(c),original=clone(c.state.items[0]),p=rotate(c,angle);
 assert.equal(snap(c),before);assert.deepEqual(local(p.after),local(original));assert.deepEqual(p.pivot,{x:130,y:220});assert.equal(p.after.rotation,angle);assert.equal(p.after.rotationVersion,1);assert.deepEqual(p.after.sourceReference,original.sourceReference);assert.equal(p.after.assetId,'asset-a');
 const ghost=c.$('preview-layer').querySelector('rect'),marker=c.$('preview-layer').querySelector('#item-rotation-pivot-marker');assert.ok(marker);assert.equal(marker.dataset.rotationPivot,'center');assert.equal(marker.querySelector('circle').getAttribute('cx'),'130');
 assert.equal(ghost.getAttribute('transform'),angle?'rotate('+angle+' 130 220)':null);if(kind==='furniture')assert.equal(c.$('preview-layer').querySelector('text').getAttribute('transform'),ghost.getAttribute('transform'));
 control(c,'cancel-item-adjustment').click();assert.equal(snap(c),before);assert.equal(c.$('preview-layer').children.length,0);assert.equal(c.selectionProposal,null);
 rotate(c,angle);control(c,'apply-item-adjustment').click();assert.deepEqual(clone(c.state.items[0]),p.after);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.length,1);assert.equal(c.state.consistencyReports.length,1);assert.equal(c.state.baseSvg,'<svg/>');assert.deepEqual(JSON.parse(c.storage.text).items,[p.after]);
 const live=c.$(kind==='furniture'?'furniture-layer':'markup-layer').querySelector('rect');assert.equal(live.dataset.id,'item-a');assert.equal(live.getAttribute('transform'),ghost.getAttribute('transform'));if(kind==='furniture')assert.equal(c.$('furniture-layer').querySelector('text').getAttribute('transform'),live.getAttribute('transform'));
 if(angle){const polygon=c.$('selection-layer').querySelector('polygon');assert.ok(polygon);assert.equal(polygon.dataset.rotatedSelection,'item-a');assert.equal(polygon.getAttribute('points'),OverlayFootprint.rectCorners(p.after).map(p=>p.join(',')).join(' '));}
 c.undo();assert.deepEqual(clone(c.state.items[0]),original);c.redo();assert.deepEqual(clone(c.state.items[0]),p.after);
}
for(const field of ['angle','scale','x','label']){
 const c=context(),before=snap(c);rotate(c);const input=field==='angle'?control(c,'selected-rotation-angle'):field==='scale'?control(c,'selected-scale-percent'):normalInput(c,field);input.value=field==='label'?'Changed':field==='scale'?'200':'123';input.oninput();assert.equal(c.selectionProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-item-adjustment').disabled,true);assert.equal(snap(c),before);
 if(field!=='angle'){control(c,'preview-item-rotation').click();assert.equal(c.selectionProposal,null,'Do not discard pending '+field+' edits');}
}
for(const restriction of ['token','project','item','lock','hidden','layer']){
 const c=context();rotate(c);if(restriction==='token')c.state.stateToken='changed';if(restriction==='project')c.state.projectId='other-project';if(restriction==='item')c.state.items[0].w=61;if(restriction==='lock')c.state.objectSettings['item:item-a']={locked:true};if(restriction==='hidden')c.state.objectSettings['item:item-a']={hidden:true};if(restriction==='layer')c.state.layers.furniture=false;const before=snap(c);control(c,'apply-item-adjustment').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);
}
for(const restriction of ['locked','hidden']){const c=context();c.state.objectSettings['item:item-a']={[restriction]:true};c.render();assert.equal(control(c,'preview-item-rotation').disabled,true);assert.equal(control(c,'selected-rotation-angle').disabled,true);}
for(const angle of ['',361,-361,'Infinity','NaN']){const c=context(),before=snap(c);control(c,'selected-rotation-angle').value=String(angle);control(c,'preview-item-rotation').click();assert.equal(c.selectionProposal,null);assert.equal(snap(c),before);}
for(const failure of ['quota','history']){
 const c=context();if(failure==='history')c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated',revision:'v0',commentIds:[],changes:[]}));rotate(c);const before=snap(c);c.storage.fail=failure==='quota';control(c,'apply-item-adjustment').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);
}
for(const raw of ['legacy metadata',999,null,{note:'historical'}]){
 const c=context();c.state.items[0].rotation=clone(raw);c.render();assert.equal(c.overlayRotationTransform(c.state.items[0]),null);assert.equal(control(c,'selected-rotation-angle').value,'0');assert.equal(c.$('furniture-layer').querySelector('rect').getAttribute('transform'),null);assert.equal(c.validProject(clone(c.state)).items[0].rotationVersion,undefined);
 const base=clone(c.state.items[0]);for(const operation of [()=>ItemAdjustments.propose({item:base,patch:{x:101},projectId:'project-a',stateToken:'token-a'}),()=>ItemAdjustments.proposeScale({item:base,scalePercent:50,projectId:'project-a',stateToken:'token-a'})]){const p=operation();assert.deepEqual(p.after.rotation,raw);assert.equal(Object.hasOwn(p.after,'rotationVersion'),false);}
 rotate(c,90);control(c,'apply-item-adjustment').click();assert.equal(c.state.items[0].rotationVersion,1);assert.equal(c.state.items[0].rotation,90);c.undo();assert.deepEqual(c.state.items[0].rotation,raw);assert.equal(Object.hasOwn(c.state.items[0],'rotationVersion'),false);
}
{
 const c=context(),base=clone(c.state);assert.equal(Object.hasOwn(c.validProject(base).items[0],'rotation'),false);const extreme=clone(base);Object.assign(extreme.items[0],{x:1e9,w:1e9});assert.doesNotThrow(()=>c.validProject(extreme));Object.assign(extreme.items[0],{rotation:0,rotationVersion:1});assert.throws(()=>c.validProject(extreme));
 for(const patch of [{rotationVersion:2,rotation:0},{rotationVersion:1,rotation:361},{rotationVersion:1,rotation:'90'},{rotationVersion:1},{rotationVersion:null,rotation:0}]){const bad=clone(base);Object.assign(bad.items[0],patch);assert.throws(()=>c.validProject(bad));}
 const arrow={id:'item-a',kind:'arrow',x:0,y:0,x2:10,y2:20,rotation:'historical'};const old=clone(base);old.items=[arrow];assert.doesNotThrow(()=>c.validProject(old));c.state.items=[arrow];c.render();assert.equal(c.$('selection-props').querySelector('#preview-item-rotation'),null);old.items[0].rotationVersion=1;old.items[0].rotation=0;assert.throws(()=>c.validProject(old));
}
{
 const c=context();rotate(c);control(c,'apply-item-adjustment').click();normalInput(c,'x').value='110';control(c,'preview-item-changes').click();control(c,'apply-item-adjustment').click();assert.equal(c.state.items[0].x,110);assert.equal(c.state.items[0].rotation,45);preview(c,50);control(c,'apply-item-adjustment').click();assert.equal(c.state.items[0].w,30);assert.equal(c.state.items[0].rotation,45);
 c.state.items.push({id:'item-b',kind:'rect',x:500,y:500,w:20,h:30});c.selectedRefs.add('item:item-b');c.render();assert.equal(c.$('selection-props').querySelector('#preview-item-rotation'),null);control(c,'group-translation-dx').value='10';control(c,'group-translation-dy').value='-5';control(c,'preview-group-translation').click();assert.ok(c.groupTranslationProposal);const before=clone(c.state.items);control(c,'apply-group-translation').click();for(let i=0;i<2;i++){assert.equal(c.state.items[i].x,before[i].x+10);assert.equal(c.state.items[i].y,before[i].y-5);}assert.equal(c.state.items[0].rotation,45);assert.equal(c.state.items[0].rotationVersion,1);
 const saved=clone(c.state.items),assets=clone(c.state.assets);let blob;c.download=(_n,b)=>blob=b;await c.jsonExport();const restored=context();await restored.importJSON(await blob.text());assert.deepEqual(clone(restored.state.items),saved);assert.deepEqual(clone(restored.state.assets),assets);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.items,saved);assert.deepEqual(envelope.assets,assets);
 await c.exportSvg();const svg=await blob.text();assert.match(svg,/rotate\(45 /);assert.match(svg,/Fabricated furniture/);assert.doesNotMatch(svg,/preview-layer|selection-layer|base-hit-layer|pivot-marker/);
}
{
 const c=context('rect');Object.assign(c.state.items[0],{x:0,y:0,w:100,h:20,rotationVersion:1,rotation:90});assert.ok(c.report().issues.some(f=>f.code==='overlay-outside-plan'));delete c.state.items[0].rotationVersion;assert.equal(c.report().issues.some(f=>f.code==='overlay-outside-plan'),false,'Historical unmarked angle must not affect checks');
}
{
 const c=context(),before=snap(c),invalid=clone(c.state);Object.assign(invalid.items[0],{rotationVersion:1,rotation:361});await assert.rejects(()=>c.importJSON(JSON.stringify(invalid)));assert.equal(snap(c),before,'Invalid active rotation import must leave the open project untouched');assert.equal(c.storage.writes,0);
 const legacy=clone(c.state);legacy.items[0].rotation={historical:'inert metadata'};await c.importJSON(JSON.stringify(legacy));assert.deepEqual(clone(c.state.items),legacy.items);assert.equal(c.overlayRotationTransform(c.state.items[0]),null);assert.equal(c.state.baseSvg,legacy.baseSvg);
}
console.log('PASS: actual rotation controls/render/ghost/corners, inert legacy metadata, guarded marker activation, exact transaction and undo, rotated move/scale/group, backup/handoff/SVG.');
