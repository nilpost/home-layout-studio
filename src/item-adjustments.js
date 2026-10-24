/* Reversible single-overlay proposals shared by site controls and agent adapters. */
(function(root){
'use strict';
const MAX_COORDINATE=1_000_000_000;
const fields={furniture:['x','y','w','h','label'],rect:['x','y','w','h'],arrow:['x','y','x2','y2'],paint:['x','y']};
function copy(value){return JSON.parse(JSON.stringify(value));}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label);return value;}
function identity(value,label){if(typeof value!=='string'||!value.trim()||value.length>300)throw Error('Invalid '+label);return value;}
function number(value,key){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>MAX_COORDINATE)throw Error('Invalid '+key+': enter a finite number within '+MAX_COORDINATE+' drawing units.');if(['w','h'].includes(key)&&value<=0)throw Error('Invalid '+key+': size must be positive.');}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function available({locked,hidden}){if(locked)throw Error('Item is locked. Unlock it before adjusting.');if(hidden)throw Error('Item is hidden. Show it before adjusting.');}
function validateItem(item){
 object(item,'item');identity(item.id,'item identity');
 if(!Object.hasOwn(fields,item.kind))throw Error('Unsupported item: only single furniture and markup overlays can be adjusted.');
 for(const key of fields[item.kind].filter(k=>k!=='label'))number(item[key],key);
 if(item.kind==='furniture'&&item.label!==undefined&&(typeof item.label!=='string'||item.label.length>80))throw Error('Invalid furniture label');
 if(item.kind==='paint'&&(!Array.isArray(item.points)||item.points.length<2||item.points.length>6000||item.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>MAX_COORDINATE))))throw Error('Invalid paint geometry');
 if(item.kind==='paint'&&(!Number.isFinite(item.width)||item.width<1||item.width>20||typeof item.color!=='string'||!/^#[0-9a-f]{6}$/i.test(item.color)))throw Error('Invalid paint style');
}
function units(calibration){
 if(calibration==null)return 'Drawing units; scale and physical dimensions are provisional (uncalibrated).';
 if(![calibration.drawingUnits,calibration.realMillimetres].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0))throw Error('Invalid calibration');
 const ratio=calibration.realMillimetres/calibration.drawingUnits;
 if(!Number.isFinite(ratio)||ratio<=0)throw Error('Invalid calibration ratio');
 return 'Drawing units; provisional recorded calibration: 1 drawing unit = '+Number(ratio.toPrecision(8))+' mm. Inputs remain drawing units; no surveyed accuracy is implied.';
}
function propose(input){
 object(input,'adjustment');available(input);validateItem(input.item);object(input.patch,'adjustment patch');
 const keys=Object.keys(input.patch);if(!keys.length)throw Error('Choose at least one supported adjustment.');
 const allowed=fields[input.item.kind];
 for(const key of keys){
  if(!allowed.includes(key))throw Error('Unsupported adjustment: '+key);
  if(key==='label'){if(typeof input.patch.label!=='string'||input.patch.label.length>80)throw Error('Invalid furniture label: use at most 80 characters.');}
  else number(input.patch[key],key);
 }
 const before=copy(input.item),after=copy(input.item),patch=copy(input.patch);
 for(const key of keys)after[key]=patch[key];
 validateItem(after);
 return {operationVersion:1,context:{projectId:identity(input.projectId,'project identity'),stateToken:identity(input.stateToken,'state token'),itemId:input.item.id},before,after,patch,unitDescription:units(input.calibration)};
}
function proposeScale(input){
 object(input,'uniform scale');available(input);validateItem(input.item);
 if(!['furniture','rect'].includes(input.item.kind))throw Error('Uniform scaling supports one furniture or box overlay only.');
 const percent=input.scalePercent;
 if(typeof percent!=='number'||!Number.isFinite(percent)||percent<=0)throw Error('Enter a finite positive scale percentage.');
 const factor=percent/100,item=input.item,pivot={x:item.x+item.w/2,y:item.y+item.h/2};
 if(!Number.isFinite(factor)||factor<=0)throw Error('Scale percentage is too small or too large to represent.');
 const w=item.w*factor,h=item.h*factor,patch={x:pivot.x-w/2,y:pivot.y-h/2,w,h};
 for(const key of ['x','y','w','h'])number(patch[key],key);
 number(patch.x+w,'right edge');number(patch.y+h,'bottom edge');
 const widthFactor=w/item.w,heightFactor=h/item.h;
 if(patch.x+w===patch.x||patch.y+h===patch.y||widthFactor<=0||heightFactor<=0||Math.abs(widthFactor/heightFactor-1)>Number.EPSILON*16)throw Error('Scale is too small to preserve a representable uniform footprint.');
 return {...propose({...input,patch}),pivot,scalePercent:percent};
}
function applyProposal(proposal,current){
 object(proposal,'adjustment proposal');object(current,'current adjustment context');available(current);validateItem(current.item);
 if(proposal.operationVersion!==1)throw Error('Unsupported adjustment proposal version');
 const context=object(proposal.context,'proposal context');
 if(context.projectId!==identity(current.projectId,'project identity')||context.stateToken!==identity(current.stateToken,'state token'))throw Error('Stale adjustment: project state changed. Review a fresh proposal.');
 if(context.itemId!==current.item.id||canonical(proposal.before)!==canonical(current.item))throw Error('Stale adjustment: selected item changed. Review a fresh proposal.');
 const checked=propose({...current,patch:proposal.patch});
 if(canonical(checked.after)!==canonical(proposal.after))throw Error('Invalid adjustment preview: proposed geometry changed.');
 return copy(checked.after);
}
root.ItemAdjustments=Object.freeze({MAX_COORDINATE,propose,proposeScale,applyProposal});
})(typeof window==='undefined'?globalThis:window);
