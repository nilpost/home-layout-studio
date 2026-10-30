/* Read-only declared-source SVG inventory. No DOM parsing, mutation or runtime hook. */
(function(root){
'use strict';
const SVG='http://www.w3.org/2000/svg',NUM='[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?',numberRE=new RegExp('^(?:'+NUM+')$');
const inherited=['stroke','stroke-width','stroke-linecap','stroke-opacity'];
const core=[...inherited,'vector-effect','opacity'];
const initialValues={opacity:{value:'1',specURI:'https://www.w3.org/TR/css-color-4/#transparency'},'vector-effect':{value:'none',specURI:'https://www.w3.org/TR/SVG2/coords.html#VectorEffectProperty'}};
// These fully parsed declarations are evidence of an unsupported inherited stroke
// condition, never supported values or declarations that a later rule can erase.
const localHazards=['stroke-dasharray','stroke-dashoffset'];
const harmless=['fill','fill-opacity','color','font-family','font-size','font-weight','text-anchor','stroke-linejoin','stroke-miterlimit'];
const containers=new Set(['svg','g','defs','symbol','marker','clipPath','mask','pattern','style','title','desc','metadata','linearGradient','radialGradient','stop','script']);
const definitions=new Set(['defs','symbol','marker','clipPath','mask','pattern','linearGradient','radialGradient']);
const dynamic=new Set(['script','animate','animateTransform','animateMotion','set','handler','discard']);
const unhandledAttrs=new Set(['transform','clip-path','mask','filter','stroke-dasharray','stroke-dashoffset','marker-start','marker-mid','marker-end','display','visibility','paint-order','mix-blend-mode','isolation','pathLength','href','xlink:href','xml:base']);
function text(v){return typeof v==='string'&&!!v.trim()&&v.length<=300;}
function asciiTrim(v){return v.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');}
function numeric(v){if(typeof v!=='string'||!numberRE.test(asciiTrim(v)))throw Error('unitless-number-required');const n=Number(v);if(!Number.isFinite(n))throw Error('nonfinite-number');return n;}
function attrs(node){return Object.fromEntries(Array.from(node.attributes||[],a=>[a.name,a.value]));}
function children(node){return Array.from(node.childNodes||[]);}
function comments(s){if(typeof s!=='string'||s.length>100000)throw Error('stylesheet-limit');if(/[^\x09\x0a\x0c\x0d\x20-\x7e]/.test(s))throw Error('unsupported-nonascii-css-syntax');if(/['"()\[\]]/.test(s))throw Error('unsupported-css-value-syntax');const clean=s.replace(/\/\*[\s\S]*?\*\//g,' ');if(clean.includes('/*')||clean.includes('*/'))throw Error('unclosed-css-comment');return clean;}
function declarations(s){const clean=comments(s);if(/[!@\\{}]|url\s*\(/i.test(clean))throw Error('unsupported-css-syntax');const result=[];for(const part of clean.split(';')){if(!part.trim())continue;const m=/^\s*([a-zA-Z-]+)\s*:\s*(.*?)\s*$/.exec(part);if(!m||!m[2])throw Error('unparsed-css-declaration');const property=m[1].toLowerCase();if(!core.includes(property)&&!harmless.includes(property)&&!localHazards.includes(property))throw Error('unsupported-css-property:'+property);result.push([property,m[2]]);}return result;}
function styles(s,nodeIndex,order){const clean=comments(s);if(/[!@\\]/.test(clean))throw Error('unsupported-stylesheet-syntax');const rules=[];let offset=0;const rule=/\s*([^{}]+)\{([^{}]*)\}/gy;while(offset<clean.length){if(!clean.slice(offset).trim())break;rule.lastIndex=offset;const m=rule.exec(clean);if(!m)throw Error('unparsed-stylesheet-text');const selector=m[1].trim();let type,specificity;if(/^[A-Za-z][A-Za-z0-9-]*$/.test(selector)){type='tag';specificity=1;}else if(/^\.[_A-Za-z][_A-Za-z0-9-]*$/.test(selector)){type='class';specificity=10;}else if(/^#[_A-Za-z][_A-Za-z0-9-]*$/.test(selector)){type='id';specificity=100;}else throw Error('unsupported-css-selector');rules.push({selector,type,specificity,declarations:declarations(m[2]),nodeIndex,order:order++});offset=rule.lastIndex;}return {rules,order};}
function matches(rule,node,a){return rule.type==='tag'?node.localName===rule.selector:rule.type==='id'?a.id===rule.selector.slice(1):(a.class||'').split(/[ \t\r\n\f]+/).includes(rule.selector.slice(1));}
function pathTokens(s){if(typeof s!=='string'||s.length>100000)throw Error('unsupported-path-text');const tokens=[],lex=new RegExp('[A-Za-z]|'+NUM,'gy');let offset=0,lastNumber=false;while(offset<s.length){while(offset<s.length&&/[ \t\r\n]/.test(s[offset]))offset++;if(offset===s.length)break;let comma=false;if(s[offset]===','){if(!lastNumber)throw Error('invalid-path-separator');comma=true;offset++;while(offset<s.length&&/[ \t\r\n]/.test(s[offset]))offset++;}lex.lastIndex=offset;const m=lex.exec(s);if(!m||comma&&/^[A-Za-z]$/.test(m[0]))throw Error('unparsed-path-text');tokens.push(m[0]);lastNumber=!/^[A-Za-z]$/.test(m[0]);offset=lex.lastIndex;}return tokens;}
function geometry(node,a,id){
 if(node.localName==='line'){const p=[a.x1,a.y1,a.x2,a.y2].map(numeric);return {a:p.slice(0,2),b:p.slice(2),segmentIds:[id],segmentProvenance:'native-line-original-id'};}
 if(node.localName!=='path')return {reason:'unsupported-strokable-owner',segmentIds:[]};
 let tokens;try{tokens=pathTokens(a.d);}catch(e){return {reason:e.message,segmentIds:[]};}
 let extracted=[];try{extracted=root.LayoutGeometry.linearPath(a.d,id,'stroke');}catch{}
 const segmentIds=extracted.map(e=>e.id),diagnostic={segmentIds,segmentProvenance:'actual-legacy-extractor-diagnostic-only'};
 const n=t=>numberRE.test(t||'');let end;
 if(tokens[0]==='M'&&n(tokens[1])&&n(tokens[2])){
  if(tokens.length===6&&tokens[3]==='L'&&n(tokens[4])&&n(tokens[5]))end=[numeric(tokens[4]),numeric(tokens[5])];
  if(tokens.length===5&&tokens[3]==='H'&&n(tokens[4]))end=[numeric(tokens[4]),numeric(tokens[2])];
  if(tokens.length===5&&tokens[3]==='V'&&n(tokens[4]))end=[numeric(tokens[1]),numeric(tokens[4])];
 }
 if(!end)return {reason:'whole-path-stroke-unsupported: single explicit absolute M+L/H/V edge required; no per-edge caps',...diagnostic};
 const start=[numeric(tokens[1]),numeric(tokens[2])];if(extracted.length!==1||extracted[0].id!==id+':0'||JSON.stringify(extracted[0].a)!==JSON.stringify(start)||JSON.stringify(extracted[0].b)!==JSON.stringify(end))return {reason:'extractor-proof-mismatch',...diagnostic};
 return {a:start,b:end,segmentIds,segmentProvenance:'strict-single-edge-and-actual-extractor-proof'};
}
function inspect(input,context){
 const owners=[],globalFindings=[],identityFindings=[],nodes=[],ids=new Map(),rules=[];let inventoryComplete=true,rootNode=input?.nodeType===9?input.documentElement:input,order=0;
 const result=()=>{const counts={candidates:owners.length,supported:0,unknown:0,excluded:0};for(const o of owners)counts[o.status]++;return {status:'inspected',inventoryComplete,strokeSupportComplete:inventoryComplete&&globalFindings.length===0&&counts.unknown===0&&identityFindings.length===0,counts,source:{sourceId:context?.sourceId??null,sourceHash:context?.sourceHash??null,frameId:context?.frameId??null},owners,globalFindings:[...new Set(globalFindings)],identityFindings,limitations:['Declared closed XML source model only; not computed browser CSS or verified XML/CSS parsing.','Complete inventory is distinct from complete stroke support.','Only normative opacity/vector-effect initial values are modeled with explicit evidence; no source attributes, IDs, geometry, permissions or physical facts are invented.']};};
 if(!rootNode||rootNode.nodeType!==1||rootNode.localName!=='svg'||rootNode.namespaceURI!==SVG){inventoryComplete=false;globalFindings.push('invalid-svg-root');return result();}
 if(!context||typeof context!=='object'||Array.isArray(context)||Reflect.ownKeys(context).length!==4||!['sourceId','sourceHash','frameId','closedSource'].every(k=>Object.hasOwn(context,k))||!text(context.sourceId)||!text(context.sourceHash)||!text(context.frameId)||context.closedSource!==true)globalFindings.push('missing-explicit-closed-source-frame');
 if(!root.StrokeFootprint?.line||!root.LayoutGeometry?.linearPath)globalFindings.push('missing-foundation-module');
 const doc=input?.nodeType===9?input:rootNode.ownerDocument;
 if(!doc||doc.documentElement!==rootNode||!['image/svg+xml','application/xml','text/xml'].includes(doc.contentType))globalFindings.push('unverified-or-ambient-document-context');
 if(doc?.adoptedStyleSheets?.length)globalFindings.push('ambient-adopted-stylesheet');
 for(const n of children(doc||{}))if(n.nodeType===7&&String(n.target||n.nodeName).toLowerCase()==='xml-stylesheet'||n.nodeType===10)globalFindings.push('external-stylesheet-or-doctype');
 function walk(node,ancestors,depth){if(depth>128||nodes.length>=5000){inventoryComplete=false;return;}if(node.nodeType===7&&String(node.target||node.nodeName).toLowerCase()==='xml-stylesheet'||node.nodeType===10)globalFindings.push('external-stylesheet-or-doctype');if(node.nodeType!==1)return;const a=attrs(node),entry={node,a,ancestors,index:nodes.length};nodes.push(entry);if(a.id!==undefined){if(!ids.has(a.id))ids.set(a.id,[]);ids.get(a.id).push(entry);}for(const child of children(node))walk(child,[entry,...ancestors],depth+1);}
 walk(rootNode,[],0);try{for(const sheet of Array.from(doc?.styleSheets||[])){if(sheet?.href!==null&&sheet?.href!==undefined)globalFindings.push('exposed-external-stylesheet');else if(!sheet?.ownerNode||!nodes.some(e=>e.node===sheet.ownerNode&&e.node.namespaceURI===SVG&&e.node.localName==='style'))globalFindings.push('unverified-or-ambient-stylesheet-owner');if(sheet?.disabled||sheet?.media?.mediaText)globalFindings.push('unsupported-stylesheet-state-or-media');}}catch{globalFindings.push('unverified-stylesheet-context');}for(const [id,list]of ids)if(list.length>1){identityFindings.push({code:'duplicate-original-id',id,nodeIndices:list.map(e=>e.index)});globalFindings.push('duplicate-original-id-in-source');}if(!inventoryComplete)globalFindings.push('incomplete-tree-or-id-index');
 for(const entry of nodes){const {node,a,index}=entry;if(dynamic.has(node.localName)||Object.keys(a).some(k=>/^on/i.test(k)))globalFindings.push('dynamic-source-content');if(node.localName==='link')globalFindings.push('external-link-stylesheet-or-resource');if(node.localName==='style')try{if(node.namespaceURI!==SVG||a.media!==undefined||a.type!==undefined&&a.type!=='text/css'||Object.keys(a).some(k=>!['id','type','xml:space'].includes(k)))throw Error('unsupported-style-element-context');const parsed=styles(node.textContent||'',index,order);rules.push(...parsed.rules);order=parsed.order;}catch(e){globalFindings.push(e.message);}}
 const cache=new Map();
 function ownStyle(entry){
  if(cache.has(entry))return cache.get(entry);
  const winners={hazards:[]};
  for(const property of core)if(entry.a[property]!==undefined)winners[property]={value:asciiTrim(entry.a[property]),source:'presentation-attribute',nodeIndex:entry.index,property,specificity:0,order:-1};
  for(const property of localHazards)if(entry.a[property]!==undefined)winners.hazards.push({value:entry.a[property],source:'presentation-attribute',nodeIndex:entry.index,property});
  for(const rule of rules)if(matches(rule,entry.node,entry.a))for(const [property,value]of rule.declarations){
   const evidence={value,source:'stylesheet-rule',nodeIndex:entry.index,stylesheetNodeIndex:rule.nodeIndex,selector:rule.selector,property,specificity:rule.specificity,order:rule.order};
   if(localHazards.includes(property)){winners.hazards.push(evidence);continue;}
   if(!core.includes(property))continue;
   const prev=winners[property];if(!prev||prev.source==='presentation-attribute'||prev.specificity<rule.specificity||prev.specificity===rule.specificity&&prev.order<=rule.order)winners[property]=evidence;
  }
  if(entry.a.style!==undefined)for(const [property,value]of declarations(entry.a.style)){
   const evidence={value,source:'inline-style',nodeIndex:entry.index,property};
   if(localHazards.includes(property))winners.hazards.push(evidence);
   else if(core.includes(property))winners[property]=evidence;
  }
  // These properties are not inherited. Absence is distinct from an explicit
  // unsupported winner; do not use initial values to recover from parse errors.
  if(!globalFindings.length)for(const [property,initial]of Object.entries(initialValues))if(!Object.hasOwn(winners,property))winners[property]={...initial,source:'svg-initial-value',property,nodeIndex:entry.index,inherited:false};
  cache.set(entry,winners);return winners;
 }
 function resolve(entry,property){for(const candidate of [entry,...entry.ancestors]){const value=ownStyle(candidate)[property];if(value)return {...value,inherited:candidate!==entry};if(!inherited.includes(property))break;}return null;}
 for(const entry of nodes){const {node,a,index,ancestors}=entry;if(node.namespaceURI===SVG&&containers.has(node.localName))continue;const originalId=a.id??null,record={nodeIndex:index,tagName:node.localName,namespaceURI:node.namespaceURI,originalId,ref:text(originalId)&&! /\s/.test(originalId)?'base:'+originalId:null,status:'unknown',reasons:[],segmentIds:[],styleEvidence:{},styleHazards:[],paintAncestors:[]};owners.push(record);record.reasons.push(...globalFindings);if(!text(originalId)||/\s/.test(originalId||''))record.reasons.push('missing-or-unsupported-original-id');else if(ids.get(originalId).length!==1)record.reasons.push('duplicate-original-id');if(node.namespaceURI!==SVG)record.reasons.push('foreign-namespace-owner');if(ancestors.some(e=>definitions.has(e.node.localName)&&e.node.namespaceURI===SVG)){if(!record.reasons.length){record.status='excluded';record.exclusion='definition-content-not-directly-painted; use instances remain unknown';}continue;}
  if(text(originalId))try{Object.assign(record,geometry(node,a,originalId));if(record.reason){record.reasons.push(record.reason);delete record.reason;}}catch(e){record.reasons.push(e.message);}
  try{
   for(const member of [entry,...ancestors]){if(member.node!==rootNode&&member.node.localName==='svg')record.reasons.push('nested-viewport');if(member.node.namespaceURI!==SVG||member!==entry&&!['svg','g'].includes(member.node.localName))record.reasons.push('unsupported-ancestor-context');if(Object.keys(member.a).some(k=>unhandledAttrs.has(k)))record.reasons.push('unsupported-transform-clipping-dash-paint-or-resource-context');if(member.node.localName==='svg'&&['x','y','dx','dy','rotate','scale','translate'].some(k=>member.a[k]!==undefined))record.reasons.push('unmapped-viewport-placement');if(member!==entry&&member.node!==rootNode&&['x','y','dx','dy','width','height','rotate','scale','translate','viewBox'].some(k=>member.a[k]!==undefined))record.reasons.push('unmapped-ancestor-coordinate-context');const own=ownStyle(member);for(const hazard of own.hazards){record.styleHazards.push({...hazard,ancestorContext:member!==entry});record.reasons.push('unsupported-local-stroke-style:'+hazard.property);}const op=own.opacity;record.paintAncestors.push({nodeIndex:member.index,opacity:op??null,vectorEffect:own['vector-effect']??null});if(!op||numeric(op.value)!==1)record.reasons.push('explicit-opaque-ancestor-required');if(own['vector-effect']&&own['vector-effect'].value.toLowerCase()!=='none')record.reasons.push('unsupported-vector-effect-context');}
   for(const property of core){const value=resolve(entry,property);if(value)record.styleEvidence[property]=value;}
   const evidence=record.styleEvidence,stroke=evidence.stroke?.value.toLowerCase();if(stroke==='none'&&!record.reasons.length){record.status='excluded';record.exclusion='explicit-stroke-none';continue;}
   for(const property of core)if(!evidence[property])record.reasons.push('missing-resolved-style:'+property);
   if(stroke&&!/^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|black|white)$/.test(stroke))record.reasons.push('unsupported-stroke-paint');
   if(evidence['stroke-opacity']&&numeric(evidence['stroke-opacity'].value)!==1)record.reasons.push('opaque-stroke-required');
   if(evidence['vector-effect']?.value.toLowerCase()!=='none')record.reasons.push('own-vector-effect-none-required');
   if(!record.reasons.length){const descriptor={kind:'line',a:record.a,b:record.b,frame:{id:context.frameId,units:'drawing',transform:'none'},style:{resolved:true,width:numeric(evidence['stroke-width'].value),cap:evidence['stroke-linecap'].value.toLowerCase(),vectorEffect:'none'},provenance:{geometry:context.sourceId+':'+context.sourceHash+':'+originalId,style:'declared-source style evidence, node '+index}};const footprint=root.StrokeFootprint.line(descriptor);if(footprint.status==='supported'){record.status='supported';record.descriptor=descriptor;record.footprint=footprint;}else record.reasons.push('stroke-foundation:'+footprint.reason);}
  }catch(e){record.reasons.push(e.message);}
 }
 // All original IDs (including text/definitions) and all extracted segment claims
 // participate in ambiguity checks. A geometry shadow never remaps an owner.
 const claims=new Map();for(const owner of owners)for(const id of owner.segmentIds){if(!claims.has(id))claims.set(id,[]);claims.get(id).push(owner);if(id!==owner.originalId&&ids.has(id)){owner.reasons.push('derived-segment-id-shadowed-by-original-id');identityFindings.push({code:'derived-segment-id-shadowed-by-original-id',id,ownerNodeIndex:owner.nodeIndex,nodeIndices:ids.get(id).map(e=>e.index)});for(const other of owners)if(other.originalId===id)other.reasons.push('original-id-shadows-derived-segment');}}
 for(const list of claims.values())if(list.length>1)for(const owner of list)owner.reasons.push('ambiguous-segment-id-claim');
 for(const owner of owners){owner.reasons=[...new Set(owner.reasons)];if(owner.reasons.length){owner.status='unknown';delete owner.descriptor;delete owner.footprint;delete owner.exclusion;}}
 return result();
}
root.SourceStrokeCoverage=Object.freeze({inspect});
})(typeof window==='undefined'?globalThis:window);
