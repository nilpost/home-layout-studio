/* Reversible single-overlay proposals shared by site controls and agent adapters. */
(function(root){
'use strict';
const MAX_COORDINATE=1_000_000_000;
const fields={furniture:['x','y','w','h','label','rotation','rotationVersion'],rect:['x','y','w','h','rotation','rotationVersion'],arrow:['x','y','x2','y2'],paint:['x','y']};
function copy(value){return JSON.parse(JSON.stringify(value));}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+label);return value;}
function identity(value,label){if(typeof value!=='string'||!value.trim()||value.length>300)throw Error('Invalid '+label);return value;}
function number(value,key){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>MAX_COORDINATE)throw Error('Invalid '+key+': enter a finite number within '+MAX_COORDINATE+' drawing units.');if(['w','h'].includes(key)&&value<=0)throw Error('Invalid '+key+': size must be positive.');}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function available({locked,hidden}){if(locked)throw Error('Item is locked. Unlock it before adjusting.');if(hidden)throw Error('Item is hidden. Show it before adjusting.');}
function validateRotation(item){
 object(item,'item');
 // Older backups permitted arbitrary metadata. Only explicit reviewed activation gives
 // the angle geometric meaning; retain unrelated historical rotation values verbatim.
 if(!Object.hasOwn(item,'rotationVersion'))return 0;
 if(item.rotationVersion!==1)throw Error('Unsupported overlay rotation version.');
 if(!['furniture','rect'].includes(item.kind))throw Error('Active rotation is supported only on furniture and box overlays.');
 if(typeof item.rotation!=='number'||!Number.isFinite(item.rotation)||Math.abs(item.rotation)>360)throw Error('Rotation must be a finite number from -360 to 360 degrees.');
 return item.rotation;
}
function rotationFootprint(item){if(!root.OverlayFootprint||typeof root.OverlayFootprint.rectCorners!=='function')throw Error('Rotation geometry component is unavailable. Reload the editor before rotating.');return root.OverlayFootprint.rectCorners(item);}
function validateItem(item){
 object(item,'item');identity(item.id,'item identity');
 if(!Object.hasOwn(fields,item.kind))throw Error('Unsupported item: only single furniture and markup overlays can be adjusted.');
 for(const key of fields[item.kind].filter(k=>!['label','rotation','rotationVersion'].includes(k)))number(item[key],key);
 validateRotation(item);
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
 if(Object.hasOwn(input.patch,'rotationVersion')&&(!Object.hasOwn(input.patch,'rotation')||input.patch.rotationVersion!==1))throw Error('Rotation activation requires an explicit angle and rotationVersion 1.');
 if(Object.hasOwn(input.patch,'rotation')&&!(Object.hasOwn(input.item,'rotationVersion')&&input.item.rotationVersion===1)&&input.patch.rotationVersion!==1)throw Error('Review explicit rotation activation before changing a historical metadata field.');
 const allowed=fields[input.item.kind];
 for(const key of keys){
  if(!allowed.includes(key))throw Error('Unsupported adjustment: '+key);
  if(key==='label'){if(typeof input.patch.label!=='string'||input.patch.label.length>80)throw Error('Invalid furniture label: use at most 80 characters.');}
  else if(key==='rotation')validateRotation({...input.item,...input.patch});
  else if(key==='rotationVersion'){if(input.patch.rotationVersion!==1)throw Error('Unsupported overlay rotation version.');}
  else number(input.patch[key],key);
 }
 const before=copy(input.item),after=copy(input.item),patch=copy(input.patch);
 for(const key of keys)after[key]=patch[key];
 validateItem(after);
 if(Object.hasOwn(after,'rotationVersion')&&after.rotationVersion===1)rotationFootprint(after);
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
 if(validateRotation(item)===0){number(patch.x+w,'right edge');number(patch.y+h,'bottom edge');}
 const widthFactor=w/item.w,heightFactor=h/item.h;
 if(patch.x+w===patch.x||patch.y+h===patch.y||widthFactor<=0||heightFactor<=0||Math.abs(widthFactor/heightFactor-1)>Number.EPSILON*16)throw Error('Scale is too small to preserve a representable uniform footprint.');
 return {...propose({...input,patch}),pivot,scalePercent:percent};
}
function proposeRotate(input){
 object(input,'rotation');available(input);validateItem(input.item);
 if(!['furniture','rect'].includes(input.item.kind))throw Error('Rotation supports one furniture or box overlay only.');
 if(input.rotation===undefined)throw Error('Enter a rotation angle before previewing.');
 const proposal=propose({...input,patch:{rotation:input.rotation,rotationVersion:1}}),item=input.item;
 return {...proposal,pivot:{x:item.x+item.w/2,y:item.y+item.h/2}};
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
function exactKeys(value,allowed,label){object(value,label);for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unsupported '+label+' field: '+key);}
function refs(value,label,{selection=false}={}){
 if(!Array.isArray(value)||value.length>(selection?100:20000)||selection&&value.length<2)throw Error('Choose 2 to 100 distinct overlay items for translation.');
 for(const ref of value)if(typeof ref!=='string'||!ref||ref.length>300||/[\s\u0000-\u001f\u007f]/.test(ref)||selection&&!/^item:.+/.test(ref))throw Error('Invalid '+label+': only explicit overlay item references can move together.');
 if(selection&&new Set(value).size!==value.length)throw Error('Duplicate selected item reference');
 return [...value];
}
function translationFootprint(item){
 const points=item.kind==='paint'?item.points.map(p=>[item.x+p[0],item.y+p[1]]):item.kind==='arrow'?[[item.x,item.y],[item.x2,item.y2]]:Object.hasOwn(item,'rotationVersion')&&item.rotationVersion===1?rotationFootprint(item):[[item.x,item.y],[item.x+item.w,item.y+item.h]];
 for(const [x,y]of points){number(x,'translated footprint X');number(y,'translated footprint Y');}
}
function proposeTranslation(input){
 object(input,'group translation');
 const selectedRefs=refs(input.selectedRefs,'selected references',{selection:true}),locked=new Set(refs(input.lockedRefs===undefined?[]:input.lockedRefs,'locked references')),hidden=new Set(refs(input.hiddenRefs===undefined?[]:input.hiddenRefs,'hidden references'));
 if(!Array.isArray(input.items)||input.items.length>5000)throw Error('Invalid current overlay items');
 number(input.deltaX,'translation X');number(input.deltaY,'translation Y');
 const context={projectId:identity(input.projectId,'project identity'),stateToken:identity(input.stateToken,'state token')};
 const members=selectedRefs.map(ref=>{
  const found=input.items.filter(item=>item&&'item:'+item.id===ref);
  if(found.length!==1)throw Error('Selected item is missing or duplicated: '+ref);
  const item=found[0];available({locked:locked.has(ref),hidden:hidden.has(ref)});validateItem(item);
  const patch={x:item.x+input.deltaX,y:item.y+input.deltaY};
  if(item.kind==='arrow'){patch.x2=item.x2+input.deltaX;patch.y2=item.y2+input.deltaY;}
  for(const key of Object.keys(patch))if((key==='x'||key==='x2'?input.deltaX:input.deltaY)!==0&&patch[key]===item[key])throw Error('Translation is too small to represent for every selected item.');
  const member=propose({item,patch,...context,locked:false,hidden:false,calibration:input.calibration});
  translationFootprint(member.after);return member;
 });
 return {operationVersion:1,context,selectedRefs,deltaX:input.deltaX,deltaY:input.deltaY,members,unitDescription:units(input.calibration)};
}
function applyTranslation(proposal,current){
 exactKeys(proposal,['operationVersion','context','selectedRefs','deltaX','deltaY','members','unitDescription'],'translation proposal');object(current,'current translation context');
 if(proposal.operationVersion!==1)throw Error('Unsupported translation proposal version');
 exactKeys(proposal.context,['projectId','stateToken'],'translation context');
 if(proposal.context.projectId!==current.projectId||proposal.context.stateToken!==current.stateToken)throw Error('Stale translation: project state changed.');
 const originalRefs=refs(proposal.selectedRefs,'proposal selection',{selection:true}),currentRefs=refs(current.selectedRefs,'current selection',{selection:true});
 if(canonical([...originalRefs].sort())!==canonical([...currentRefs].sort()))throw Error('Stale translation: selected item identities changed.');
 if(!Array.isArray(proposal.members)||proposal.members.length!==originalRefs.length)throw Error('Invalid translation members');
 const checked=proposeTranslation({...current,selectedRefs:originalRefs,deltaX:proposal.deltaX,deltaY:proposal.deltaY});
 for(let i=0;i<checked.members.length;i++){
  const member=proposal.members[i],expected=checked.members[i];
  exactKeys(member,['operationVersion','context','before','after','patch','unitDescription'],'translation member');
  for(const key of ['operationVersion','context','before','after','patch'])if(canonical(member[key])!==canonical(expected[key]))throw Error('Stale or modified translation member: review the complete selection again.');
 }
 return checked.members.map(member=>copy(member.after));
}
function proposeGroupScale(input){
 object(input,'group scale');
 const selectedRefs=refs(input.selectedRefs,'selected references',{selection:true}),locked=new Set(refs(input.lockedRefs===undefined?[]:input.lockedRefs,'locked references')),hidden=new Set(refs(input.hiddenRefs===undefined?[]:input.hiddenRefs,'hidden references'));
 if(!Array.isArray(input.items)||input.items.length>5000)throw Error('Invalid current overlay items');
 if(typeof input.scalePercent!=='number'||!Number.isFinite(input.scalePercent)||input.scalePercent<=0)throw Error('Enter a finite positive group scale percentage.');
 const factor=input.scalePercent/100;if(!Number.isFinite(factor)||factor<=0)throw Error('Group scale is too small or too large to represent.');
 const context={projectId:identity(input.projectId,'project identity'),stateToken:identity(input.stateToken,'state token')};
 const selected=selectedRefs.map(ref=>{
  const found=input.items.filter(item=>item&&'item:'+item.id===ref);
  if(found.length!==1)throw Error('Selected item is missing or duplicated: '+ref);
  const item=found[0];available({locked:locked.has(ref),hidden:hidden.has(ref)});validateItem(item);
  if(!['furniture','rect'].includes(item.kind))throw Error('Group scaling supports furniture and box overlays only.');
  return item;
 });
 // This new operation requires supported full footprints, without changing the import
 // contract or assigning geometric meaning to unmarked historical rotation metadata.
 const corners=selected.flatMap(item=>rotationFootprint({...item,rotation:validateRotation(item)}));
 const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),pivot={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
 number(pivot.x,'group pivot X');number(pivot.y,'group pivot Y');
 const members=selected.map(item=>{
  const center={x:item.x+item.w/2,y:item.y+item.h/2},scaledCenter={x:pivot.x+factor*(center.x-pivot.x),y:pivot.y+factor*(center.y-pivot.y)},w=item.w*factor,h=item.h*factor;
  const patch=factor===1?{x:item.x,y:item.y,w:item.w,h:item.h}:{x:scaledCenter.x-w/2,y:scaledCenter.y-h/2,w,h};
  for(const key of ['x','y','w','h'])number(patch[key],key);
  const widthFactor=w/item.w,heightFactor=h/item.h;
  if(widthFactor<=0||heightFactor<=0||Math.abs(widthFactor/heightFactor-1)>Number.EPSILON*16||center.x!==pivot.x&&scaledCenter.x===pivot.x||center.y!==pivot.y&&scaledCenter.y===pivot.y)throw Error('Group scale is too small to preserve dimensions and relative centers.');
  const member=propose({item,patch,...context,locked:false,hidden:false,calibration:input.calibration});
  rotationFootprint({...member.after,rotation:validateRotation(member.after)});return member;
 });
 return {operationVersion:1,context,selectedRefs,pivot,scalePercent:input.scalePercent,members,unitDescription:units(input.calibration)};
}
function applyGroupScale(proposal,current){
 exactKeys(proposal,['operationVersion','context','selectedRefs','pivot','scalePercent','members','unitDescription'],'group scale proposal');object(current,'current group scale context');
 if(proposal.operationVersion!==1)throw Error('Unsupported group scale proposal version');
 exactKeys(proposal.context,['projectId','stateToken'],'group scale context');exactKeys(proposal.pivot,['x','y'],'group scale pivot');
 if(proposal.context.projectId!==current.projectId||proposal.context.stateToken!==current.stateToken)throw Error('Stale group scale: project state changed.');
 const originalRefs=refs(proposal.selectedRefs,'proposal selection',{selection:true}),currentRefs=refs(current.selectedRefs,'current selection',{selection:true});
 if(canonical([...originalRefs].sort())!==canonical([...currentRefs].sort()))throw Error('Stale group scale: selected item identities changed.');
 if(!Array.isArray(proposal.members)||proposal.members.length!==originalRefs.length)throw Error('Invalid group scale members');
 const checked=proposeGroupScale({...current,selectedRefs:originalRefs,scalePercent:proposal.scalePercent});
 if(canonical(proposal.pivot)!==canonical(checked.pivot))throw Error('Modified group scale pivot: review the complete selection again.');
 for(let i=0;i<checked.members.length;i++){
  const member=proposal.members[i],expected=checked.members[i];exactKeys(member,['operationVersion','context','before','after','patch','unitDescription'],'group scale member');
  for(const key of ['operationVersion','context','before','after','patch'])if(canonical(member[key])!==canonical(expected[key]))throw Error('Stale or modified group scale member: review the complete selection again.');
 }
 return checked.members.map(member=>copy(member.after));
}
root.ItemAdjustments=Object.freeze({MAX_COORDINATE,validateRotation,propose,proposeScale,proposeRotate,applyProposal,proposeTranslation,applyTranslation,proposeGroupScale,applyGroupScale});
})(typeof window==='undefined'?globalThis:window);
