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
 const registry=new Map(),get=id=>{if(['group-scale-percent','group-rotation-angle'].includes(id)&&!registry.has(id))return null;if(!registry.has(id)){const node=new Element('div',registry);node.id=id;}return registry.get(id);};const storage={fail:false,writes:0,text:''};const c=vm.createContext({NS:'http://www.w3.org/2000/svg',KEY:'fabricated-storage',state:fixture(),clone,JSON,crypto:webcrypto,Blob,Date,Set,Map,ItemAdjustments,OverlayFootprint,AssetRecords,LayerItems,ReviewHistory,ConsistencyReview,MeasurementAnchors,MeasurementChains,LayoutGeometry,CorrectionContract,history:[],future:[],selected:'furniture-a',selectedRefs:new Set(items().map(o=>'item:'+o.id)),selectionProposal:null,groupTranslationProposal:null,groupScaleProposal:null,groupRotationProposal:null,storageWriteFailed:false,$:get,document:{createElement:tag=>new Element(tag,registry),createElementNS:(_ns,tag)=>new Element(tag,registry)},window:{},localStorage:{setItem(_key,text){if(storage.fail){const error=new Error('Fabricated storage quota');error.name='QuotaExceededError';throw error;}storage.text=text;storage.writes++;}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},cancelLandmarkMatch(){},reviewOptions(){},geometryOf:()=>({segments:[],dimensions:[],fixtures:[],unsupported:[]}),deleteRefs(){},zoom:1,download(){},DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,1000,1000],normalizedLayers:l=>l});
 c.storage=storage;c.inventory=()=>[...c.state.items.map(o=>({id:o.id,ref:'item:'+o.id,kind:'item',object:o})),...(c.extraEntries||[])];c.isLocked=ref=>!!LayerItems.flags(c.state.objectSettings,ref).locked;c.entryVisible=e=>!LayerItems.flags(c.state.objectSettings,e.ref).hidden&&(e.kind==='item'?c.state.layers[e.object.kind==='furniture'?'furniture':'markup']!==false:c.state.layers.base!==false);c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['notify','saveLocal','sourceHash','restoreSnapshot','remember','validProject','mutate','make','paintNode','cancelItemPreview','overlayRotationTransform','drawItemPreview','groupTranslationContext','drawGroupTranslationPreview','renderGroupTranslation','renderGroupScale','drawGroupScalePreview','renderGroupRotation','drawGroupRotationPreview','renderSelection','report','reviewContext','runConsistencyReview','jsonExport','importJSON','handoff'])vm.runInContext(code(name),c);
 c.render=()=>{c.cancelItemPreview();c.renderSelection();};for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body);vm.runInContext('function '+name+'(){'+body+'}',c);}c.render();return c;
}
const snap=c=>JSON.stringify({state:c.state,history:c.history,future:c.future});
function control(c,id){const result=c.$('selection-props').querySelector('#'+id);assert.ok(result,'Missing current control '+id);return result;}
function preview(c,deltaX=20,deltaY=-10){control(c,'group-translation-dx').value=String(deltaX);control(c,'group-translation-dy').value=String(deltaY);control(c,'preview-group-translation').click();assert.ok(c.groupTranslationProposal,control(c,'group-translation-status').textContent);return clone(c.groupTranslationProposal);}
function translated(original,dx,dy){return original.map(o=>({...clone(o),x:o.x+dx,y:o.y+dy,...(o.kind==='arrow'?{x2:o.x2+dx,y2:o.y2+dy}:{})}));}

{
 const c=context(),before=snap(c),original=clone(c.state.items);const proposal=preview(c);assert.equal(snap(c),before);assert.equal(proposal.members.length,4);const ghosts=c.$('preview-layer').children;assert.equal(ghosts.length,4);assert.deepEqual(ghosts.map(node=>node.dataset.groupTranslationMember),original.map(o=>o.id));assert.equal(control(c,'apply-group-translation').disabled,false);
 control(c,'cancel-group-translation').click();assert.equal(c.groupTranslationProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(snap(c),before);
 preview(c);control(c,'group-translation-dx').value='21';control(c,'group-translation-dx').oninput();assert.equal(c.groupTranslationProposal,null);assert.equal(c.$('preview-layer').children.length,0);assert.equal(control(c,'apply-group-translation').disabled,true);assert.equal(snap(c),before);
}
{
 const c=context(),original=clone(c.state.items),assets=clone(c.state.assets);preview(c);control(c,'apply-group-translation').click();const moved=translated(original,20,-10);assert.deepEqual(clone(c.state.items),moved);assert.equal(c.history.length,1);assert.equal(c.state.changeLog.length,1);assert.equal(c.state.changeLog[0].changes.length,4);assert.equal(c.state.consistencyReports.length,1);assert.equal(c.state.baseSvg,'<svg/>');assert.deepEqual(clone(c.state.assets),assets);assert.deepEqual(JSON.parse(c.storage.text).items,moved);
 const arrow=c.state.items.find(o=>o.kind==='arrow'),paint=c.state.items.find(o=>o.kind==='paint');assert.deepEqual([arrow.x2-arrow.x,arrow.y2-arrow.y],[20,30]);assert.deepEqual(clone(paint.points),original.find(o=>o.kind==='paint').points);assert.equal(c.state.items[0].x-c.state.items[1].x,original[0].x-original[1].x);assert.equal(c.state.items[0].y-c.state.items[1].y,original[0].y-original[1].y);
 c.undo();assert.deepEqual(clone(c.state.items),original);c.redo();assert.deepEqual(clone(c.state.items),moved);assert.deepEqual(clone(c.state.assets),assets);
}
for(const restrict of ['token','project','member','missing','lock','hidden','layer','selection-remove','selection-add','selection-mixed']){
 const c=context();preview(c);if(restrict==='token')c.state.stateToken='changed';if(restrict==='project')c.state.projectId='foreign';if(restrict==='member')c.state.items[1].w=21;if(restrict==='missing')c.state.items=c.state.items.filter(o=>o.id!=='rect-a');if(restrict==='lock')c.state.objectSettings['item:rect-a']={locked:true};if(restrict==='hidden')c.state.objectSettings['item:rect-a']={hidden:true};if(restrict==='layer')c.state.layers.markup=false;if(restrict==='selection-remove')c.selectedRefs.delete('item:rect-a');if(restrict==='selection-add')c.selectedRefs.add('item:unavailable');if(restrict==='selection-mixed'){c.selectedRefs.add('base:wall-a');c.extraEntries=[{ref:'base:wall-a',id:'wall-a',kind:'base'}];}const before=snap(c);control(c,'apply-group-translation').click();assert.equal(snap(c),before,'Reject entire group for '+restrict);assert.equal(c.storage.writes,0);assert.equal(c.$('preview-layer').children.length,0);assert.equal(c.groupTranslationProposal,null);assert.equal(control(c,'apply-group-translation').disabled,true);
}
{
 const c=context();preview(c);c.selectedRefs=new Set([...c.selectedRefs].reverse());control(c,'apply-group-translation').click();assert.deepEqual(clone(c.state.items),translated(items(),20,-10),'Same selected set in a different order is still the reviewed group');
 const changed=context();changed.selectedRefs.delete('item:paint-a');const before=snap(changed);control(changed,'group-translation-dx').value='20';control(changed,'preview-group-translation').click();assert.equal(changed.groupTranslationProposal,null);assert.equal(snap(changed),before);assert.match(control(changed,'group-translation-status').textContent,/selection changed/i);
}
for(const restriction of ['locked','hidden','mixed','missing']){
 const c=context();if(restriction==='locked')c.state.objectSettings['item:rect-a']={locked:true};if(restriction==='hidden')c.state.objectSettings['item:paint-a']={hidden:true};if(restriction==='mixed'){c.selectedRefs.add('comment:comment-a');c.extraEntries=[{ref:'comment:comment-a',kind:'comment',id:'comment-a'}];}if(restriction==='missing')c.selectedRefs.add('item:missing');c.render();const before=snap(c);const button=c.$('selection-props').querySelector('#preview-group-translation');if(button){assert.equal(button.disabled,true);button.click();assert.equal(c.groupTranslationProposal,null);}else assert.match(c.$('selection-props').textContent,/only|missing/);assert.equal(snap(c),before);assert.equal(c.storage.writes,0);
}
for(const value of ['', 'Infinity','NaN']){
 const c=context(),before=snap(c);control(c,'group-translation-dx').value=value;control(c,'preview-group-translation').click();assert.equal(c.groupTranslationProposal,null);assert.equal(control(c,'apply-group-translation').disabled,true);assert.equal(snap(c),before);
}
{
 const c=context();preview(c);const before=snap(c);c.storage.fail=true;control(c,'apply-group-translation').click();assert.equal(snap(c),before);assert.equal(c.storage.writes,0);assert.match(c.$('save-status').textContent,/not saved/i);c.storage.fail=false;preview(c);control(c,'apply-group-translation').click();assert.equal(c.history.length,1);assert.deepEqual(clone(c.state.items),translated(items(),20,-10));
 const full=context();full.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));preview(full);const capacity=snap(full);control(full,'apply-group-translation').click();assert.equal(snap(full),capacity);assert.equal(full.storage.writes,0);
}
{
 const c=context();preview(c);control(c,'apply-group-translation').click();const saved=clone(c.state.items),assets=clone(c.state.assets);let blob;c.download=(_name,value)=>blob=value;await c.jsonExport();const text=await blob.text(),restored=context();await restored.importJSON(text);assert.deepEqual(clone(restored.state.items),saved);assert.deepEqual(clone(restored.state.assets),assets);c.handoff();const envelope=JSON.parse(c.$('handoff-text').value.split('\n\n').slice(1).join('\n\n'));assert.deepEqual(envelope.items,saved);assert.deepEqual(envelope.assets,assets);
}
console.log('PASS: complete group ghosts, exact relative movement/arrow vectors/paint metadata, guarded selection/state, whole-group rejection, atomic undo and backup/handoff.');
