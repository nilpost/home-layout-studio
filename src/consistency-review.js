/* Provider-neutral, bounded schematic review records. No source documents are stored. */
(function(root){
'use strict';
const SCHEMA_VERSION=1,CHECKER_VERSION='schematic-1.5.0';
const STATUSES=['pass','fail','warning','unknown','not-checked'],SEVERITIES=['info','warning','error'];
const MAX_REPORTS=50,MAX_FINDINGS=5000,MAX_TEXT=2000,MAX_IDS=100;
function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));}
function text(v,max=MAX_TEXT){return typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);}
function need(ok,message){if(!ok)throw Error('Invalid consistency review: '+message);}
function keys(v,expected,optional=[]){need(object(v),'object required');need(expected.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>expected.includes(k)||optional.includes(k)),'unexpected or missing fields');}
function strings(v,max=100,size=MAX_TEXT){return Array.isArray(v)&&v.length<=max&&v.every(s=>text(s,size));}
function finite(v){return v===null||typeof v==='number'&&Number.isFinite(v);}
function date(v){return text(v,40)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;}
function stable(value){let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
function identity(code,ids,boundaries=false){return 'finding-'+stable(JSON.stringify([code,code.startsWith('opening:')?[code.slice(8)]:boundaries&&code.startsWith('boundary:')?[code.slice(9)]:[...ids].sort()]));}
function coverage(geometryStatus,dimensionStatus,anchorStatus='not-checked',legacy=false,chainStatus='not-checked',includeChains=true,openingStatus='not-checked',includeOpenings=false,boundaryStatus='unknown',includeBoundaries=false){return [
 {id:'schematic-geometry',category:'automated-geometry',status:geometryStatus,detail:'Semantic linear walls, explicit opening/window spans and rectangular fixtures only; wall thickness and full topology are unmodeled.'},
 {id:'dimension-line-scale',category:'automated-geometry',status:dimensionStatus,detail:'Declared dimensions compared to dimension-line spans using the supplied calibration and tolerance; spans are not anchored to walls.'},
 {id:'anchored-dimension-chains',category:'automated-geometry',status:legacy?'not-checked':anchorStatus,detail:legacy?'Anchored wall/opening dimensions, chains, totals, axes and levels are not modeled.':'Source-anchored endpoint spans only; dimension chains, totals, room relationships, axes and levels are not modeled.'},
 {id:'rooms-openings-doors',category:'automated-geometry',status:'not-checked',detail:'Closed room regions, areas, adjacency, hosted door relationships, swings and clearances are not modeled. Explicit opening segments receive schematic checks only.'},
 {id:'source-notation',category:'source-notation',status:'unknown',detail:'Original page provenance, notation, source distortion and missing or changed labels require source review.'},
 {id:'as-built-survey',category:'survey-dependent',status:'not-checked',detail:'No physical survey or as-built verification has been performed by this checker.'},
 {id:'structural-regulatory',category:'professional-code',status:'not-checked',detail:'No structural, safety or regulatory certification; no jurisdiction, rule edition or authoritative rule set is evaluated.'},
 ...(includeChains?[{id:'dimension-chain-totals',category:'automated-geometry',status:chainStatus,detail:'User-selected contiguous endpoint-bound chains on one explicit axis only; complete source chains, cross-axis totals, rooms and levels are not modeled.'}]:[]),
 ...(includeOpenings?[{id:'opening-jamb-bindings',category:'automated-geometry',status:openingStatus,detail:'Explicit opening segment endpoint bindings to collinear wall jambs and conflicting linear walls only; numerical schematic alignment is not physical verification. Rooms, hosted doors, swings and clearances remain unchecked.'}]:[]),
 ...(includeBoundaries?[{id:'declared-boundary-rings',category:'automated-geometry',status:boundaryStatus,detail:'Explicit declared schematic orthogonal rings only; no room discovery, physical enclosure, area, adjacency, hosted doors or whole-house coverage.'}]:[])
 ];}
// Persisted checker contracts are independent of the current report emitter. Keep
// these historical matrices and capabilities intact when adding another version.
function checkerContract(anchors,chains,legacyDimensionCoverage,openings=false,boundaries=false){return Object.freeze({anchors,chains,legacyDimensionCoverage,openings,boundaries,coverage:Object.freeze(coverage('unknown','not-checked','not-checked',!anchors,'not-checked',chains,'not-checked',openings,'unknown',boundaries).map(row=>Object.freeze(row)))});}
const CHECKER_CONTRACTS=Object.freeze({
 'schematic-1.0.0':checkerContract(false,false,true),
 'schematic-1.1.0':checkerContract(false,false,true),
 'schematic-1.2.0':checkerContract(true,false,true),
 'schematic-1.3.0':checkerContract(true,true,false),
 'schematic-1.4.0':checkerContract(true,true,false,true),
 'schematic-1.4.1':checkerContract(true,true,false,true),
 'schematic-1.5.0':checkerContract(true,true,false,true,true)
});
function contractFor(version){return typeof version==='string'&&Object.hasOwn(CHECKER_CONTRACTS,version)?CHECKER_CONTRACTS[version]:null;}
function severity(status){return status==='fail'?'error':['warning','unknown'].includes(status)?'warning':'info';}
function worst(statuses){return statuses.includes('fail')?'fail':statuses.some(s=>s==='warning')?'warning':statuses.includes('unknown')?'unknown':statuses.includes('pass')?'pass':'not-checked';}
function createReport({revision,sourceHash,geometryReport=null,measurementAudit,anchoredReview,chainReview,openingReview,boundaryReview,projectId,stateToken,runAt=new Date().toISOString()}={}){
 need(text(revision,200)&&text(sourceHash,200),'revision and source hash required');need(date(runAt),'run time must be an ISO UTC timestamp');
 for(const v of [projectId,stateToken])need(v===undefined||text(v,200),'project or state identity');
 const findings=[],seen=new Set(),notices=[],boundaryCapable=contractFor(CHECKER_VERSION)?.boundaries===true;
 function bounded(records,limit,label){need(Array.isArray(records),label+' array');if(records.length>limit)notices.push(label+': retained first '+limit+' of '+records.length+' input records; remaining records not evaluated for this saved report.');return records.slice(0,limit);}
 function evidence(values){need(Array.isArray(values),'evidence array');if(values.length>100)notices.push('Source evidence list truncated to 100 entries.');return values.slice(0,100).map(v=>{need(typeof v==='string'&&v.length>0,'source evidence text');const clean=v.replace(/[\u0000-\u001f\u007f]/g,' ');if(clean!==v||v.length>MAX_TEXT)notices.push('Source evidence text shortened or control characters replaced.');return clean.length>MAX_TEXT?clean.slice(0,MAX_TEXT-1)+'…':clean;});}
 function add(code,status,ids=[],values={}){need(text(code,400)&&strings(ids,MAX_IDS,300),'finding code or affected IDs');ids=[...new Set(ids)].sort();const f={id:identity(code,ids,boundaryCapable),code,status,severity:severity(status),affectedIds:ids,measured:null,expected:null,unit:null,errorPercent:null,evidence:[],...values};f.evidence=evidence(f.evidence);need(!seen.has(f.id),'duplicate finding identity');seen.add(f.id);findings.push(f);}
 if(geometryReport!==null){
  need(object(geometryReport)&&Array.isArray(geometryReport.issues)&&Array.isArray(geometryReport.unsupported),'geometry report shape');
  for(const k of ['segments','walls','fixtures'])need(Number.isSafeInteger(geometryReport[k])&&geometryReport[k]>=0,'geometry counts');
  for(const issue of bounded(geometryReport.issues,2500,'Geometry issues')){need(object(issue)&&text(issue.code,200)&&strings(issue.ids,MAX_IDS,200),'geometry issue');const status=['scale-unverified','dimension-unit-unverified','no-semantic-walls','unsupported-dimension-unit'].includes(issue.code)?'unknown':['scale-provisional','open-wall-end','unjoined-window','unjoined-opening'].includes(issue.code)?'warning':['degenerate-segment','duplicate-wall-span','wall-crossing','wall-through-window','wall-through-opening','wall-through-fixture','invalid-dimension','dimension-scale-mismatch','overlay-outside-plan'].includes(issue.code)?'fail':'unknown';const ids=[...new Set(issue.ids)].sort();const code='geometry:'+issue.code;
   if(!seen.has(identity(code,ids)))add(code,status,ids,{measured:issue.measured??null,expected:issue.expected??null,unit:issue.unit??null,errorPercent:issue.errorPercent??null,evidence:issue.evidence===undefined?[]:issue.evidence});
  }
  for(const item of [...new Set(bounded(geometryReport.unsupported,1400,'Unsupported geometry'))].sort()){need(typeof item==='string'&&item.length>0,'unsupported geometry evidence');add('unsupported:'+stable(item),'unknown',[],{evidence:[item]});}
 }
 const audit=measurementAudit===undefined?(geometryReport?.dimensionAudit||[]):measurementAudit;
 need(Array.isArray(audit),'measurement audit must be an array');
 const calibrationProvisional=geometryReport?.issues.slice(0,2500).some(i=>['scale-provisional','scale-unverified'].includes(i.code));
 const tolerance=geometryReport?.dimensionTolerancePercent;
 need(tolerance===undefined||typeof tolerance==='number'&&Number.isFinite(tolerance)&&tolerance>=0,'dimension tolerance');
 for(const d of bounded(audit,1000,'Dimension audit')){need(object(d)&&text(d.id,200)&&typeof d.value==='number'&&Number.isFinite(d.value)&&d.value>0&&(d.unit===null||text(d.unit,20))&&finite(d.measured)&&finite(d.errorPercent)&&text(d.unitStatus,100),'dimension audit entry');
  const status=!['mm','cm','m'].includes(d.unit)||d.unitStatus!=='verified'||d.measured===null||d.errorPercent===null||tolerance===undefined?'unknown':Math.abs(d.errorPercent)>tolerance?'fail':calibrationProvisional?'warning':'pass';
  add('dimension-line:'+d.id,status,[d.id],{measured:d.measured,expected:d.value,unit:d.unit,errorPercent:d.errorPercent,evidence:d.evidence===undefined?[]:d.evidence});
 }
 let anchorSummary;
 if(anchoredReview!==undefined){
  keys(anchoredReview,['findings','checked','total','status'],['coverage']);
  need(Array.isArray(anchoredReview.findings)&&Number.isSafeInteger(anchoredReview.total)&&anchoredReview.total>=0&&Number.isSafeInteger(anchoredReview.checked)&&anchoredReview.checked>=0&&anchoredReview.checked<=anchoredReview.total&&STATUSES.includes(anchoredReview.status),'anchored review metadata');
  need(anchoredReview.findings.length===anchoredReview.total,'anchored review requires one result per binding');
  need(anchoredReview.checked===anchoredReview.findings.filter(f=>f&&['pass','fail'].includes(f.status)).length,'verified anchored comparison count');
  if(anchoredReview.coverage!==undefined){keys(anchoredReview.coverage,['bindings','comparisons','verifiedComparisons','unknown','unboundDimensions']);for(const k of ['bindings','comparisons','verifiedComparisons','unknown'])need(Number.isSafeInteger(anchoredReview.coverage[k])&&anchoredReview.coverage[k]>=0,'anchored coverage counts');need(strings(anchoredReview.coverage.unboundDimensions,100000,300),'unbound dimension identifiers');}
  const retained=bounded(anchoredReview.findings,Math.max(0,MAX_FINDINGS-(boundaryCapable?4:3)-findings.length),'Anchored endpoint results');
  for(const f of retained){
   keys(f,['anchorId','code','status','severity','affectedIds','measured','expected','unit','errorPercent','evidence']);
   need(text(f.anchorId,300)&&text(f.code,200)&&STATUSES.includes(f.status)&&f.severity===severity(f.status)&&strings(f.affectedIds,MAX_IDS,300),'anchored finding');
   need(finite(f.measured)&&finite(f.expected)&&finite(f.errorPercent)&&(f.unit===null||typeof f.unit==='string'),'anchored measurements');
   const savedUnit=f.unit===null||text(f.unit,20)?f.unit:null;if(savedUnit!==f.unit)notices.push('Unsupported anchored unit text could not be represented in the bounded unit field; retained in source evidence.');
   need(!['pass','fail'].includes(f.status)||(f.expected>0&&f.measured!==null&&f.errorPercent!==null&&['mm','cm','m'].includes(f.unit)),'anchored comparison needs verified measurements');
   let details=f.evidence;
   if(object(details))details=[JSON.stringify(details,(_key,value)=>{need(value!==undefined&&typeof value!=='function'&&typeof value!=='symbol'&&(typeof value!=='number'||Number.isFinite(value)),'anchored evidence must be JSON data');return value;})];
   need(Array.isArray(details),'anchored evidence');
   add('anchor:'+f.anchorId,f.status,[...new Set([f.anchorId,...f.affectedIds])],{measured:f.measured,expected:f.expected,unit:savedUnit,errorPercent:f.errorPercent,evidence:['Anchor checker result: '+f.code,...details]});
  }
  const unbound=anchoredReview.coverage?.unboundDimensions||[];
  if(unbound.length)add('anchor-coverage-unbound','unknown',unbound.slice(0,MAX_IDS),{evidence:['Missing source endpoint bindings for '+unbound.length+' declared dimensions. Bound spans do not establish complete dimension coverage.']});
  if(unbound.length>MAX_IDS)notices.push('Unbound source dimension identifiers truncated to '+MAX_IDS+' of '+unbound.length+'.');
  const anchors=findings.filter(f=>f.code.startsWith('anchor:'));
  anchorSummary={checked:anchoredReview.checked,total:anchoredReview.total,status:worst([anchoredReview.status,...anchors.map(f=>f.status),...(anchoredReview.checked<anchoredReview.total||!anchoredReview.total||unbound.length?['unknown']:[])])};
  need(anchorSummary.status!=='pass'||anchorSummary.checked===anchorSummary.total&&anchors.length>0&&anchors.every(f=>f.status==='pass'),'anchored pass requires all bindings checked');
 }
 let chainSummary;
 if(chainReview!==undefined){
  keys(chainReview,['findings','checked','total','status']);
  need(Array.isArray(chainReview.findings)&&Number.isSafeInteger(chainReview.total)&&chainReview.total>=0&&Number.isSafeInteger(chainReview.checked)&&chainReview.checked>=0&&chainReview.checked<=chainReview.total&&STATUSES.includes(chainReview.status),'chain review metadata');
  need(chainReview.findings.length===chainReview.total,'chain review requires one result per chain');
  need(chainReview.checked===chainReview.findings.filter(f=>f&&['pass','fail'].includes(f.status)).length,'verified chain comparison count');
  const retained=bounded(chainReview.findings,Math.max(0,MAX_FINDINGS-(boundaryCapable?3:2)-findings.length),'Dimension chain results');
  for(const f of retained){
   keys(f,['chainId','code','status','severity','affectedIds','measured','expected','unit','errorPercent','evidence']);
   need(text(f.chainId,300)&&text(f.code,200)&&STATUSES.includes(f.status)&&f.severity===severity(f.status)&&strings(f.affectedIds,100000,300),'chain finding');
   need(finite(f.measured)&&finite(f.expected)&&finite(f.errorPercent)&&(f.unit===null||typeof f.unit==='string'),'chain measurements');
   const savedUnit=f.unit===null||text(f.unit,20)?f.unit:null;if(savedUnit!==f.unit)notices.push('Unsupported chain unit text could not be represented in the bounded unit field; retained in source evidence.');
   need(!['pass','fail'].includes(f.status)||(f.expected>0&&f.measured!==null&&f.errorPercent!==null&&['mm','cm','m'].includes(f.unit)),'chain comparison needs verified measurements');
   let details=f.evidence;
   if(object(details)){
    const encode=value=>JSON.stringify(value,(_key,item)=>{need(item!==undefined&&typeof item!=='function'&&typeof item!=='symbol'&&(typeof item!=='number'||Number.isFinite(item)),'chain evidence must be JSON data');return item;});
    const full=encode(details);
    // Ordinary chain evidence contains nested provenance for every participating anchor.
    // Keep complete indexed records instead of clipping a normal multi-anchor JSON blob.
    if(full.length>MAX_TEXT&&Array.isArray(details.anchors)){const {anchors,...context}=details;details=[encode(context),...anchors.map((anchor,anchorIndex)=>encode({anchorIndex,anchor}))];}
    else details=[full];
   }
   need(Array.isArray(details),'chain evidence');
   const refs=[...new Set([f.chainId,...f.affectedIds])];if(refs.length>MAX_IDS)notices.push('Chain affected identifiers truncated to '+MAX_IDS+' of '+refs.length+'.');
   add('chain:'+f.chainId,f.status,refs.slice(0,MAX_IDS),{measured:f.measured,expected:f.expected,unit:savedUnit,errorPercent:f.errorPercent,evidence:['Chain checker result: '+f.code,...details]});
  }
  const chains=findings.filter(f=>f.code.startsWith('chain:'));
  chainSummary={total:chainReview.total,checked:chainReview.checked,status:worst([chainReview.status,...chains.map(f=>f.status),...(chainReview.checked<chainReview.total||!chainReview.total||!chains.length?['unknown']:[])])};
  need(chainSummary.status!=='pass'||chainSummary.checked===chainSummary.total&&chains.length>0&&chains.every(f=>f.status==='pass'),'chain pass requires all selected chains checked');
 }
 let openingSummary;
 if(openingReview!==undefined){
  need(contractFor(CHECKER_VERSION)?.openings,'checker cannot emit opening review');
  keys(openingReview,['findings','checked','total','status']);
  need(Array.isArray(openingReview.findings)&&Number.isSafeInteger(openingReview.total)&&openingReview.total>=0&&openingReview.total<=1000&&Number.isSafeInteger(openingReview.checked)&&openingReview.checked>=0&&openingReview.checked<=openingReview.total&&['pass','fail','unknown'].includes(openingReview.status),'opening review metadata');
  need(openingReview.findings.length===openingReview.total,'opening review requires one result per binding');
  need(openingReview.checked===openingReview.findings.filter(f=>f&&['pass','fail'].includes(f.status)).length,'checked opening result count');
  need(openingReview.status===(!openingReview.total?'unknown':worst(openingReview.findings.map(f=>f.status))),'opening review status');
  const retained=bounded(openingReview.findings,Math.max(0,MAX_FINDINGS-(boundaryCapable?3:2)-findings.length),'Opening endpoint results');
  for(const f of retained){
   keys(f,['bindingId','code','status','severity','affectedIds','measured','expected','unit','errorPercent','evidence']);
   need(text(f.bindingId,300)&&text(f.code,200)&&['pass','fail','unknown'].includes(f.status)&&f.severity===severity(f.status)&&strings(f.affectedIds,MAX_IDS,300)&&new Set(f.affectedIds).size===f.affectedIds.length,'opening finding');
   need(finite(f.measured)&&(f.measured===null||f.measured>=0)&&f.expected===0&&f.unit==='drawing-units'&&f.errorPercent===null,'opening measurements');
   need(f.status==='unknown'||f.measured!==null,'checked opening needs endpoint measurements');
   const details=openingEvidence(f.evidence);validateOpeningContext(f,JSON.parse(details[0]).openingSourceContext,{projectId,sourceHash});const refs=[...new Set([f.bindingId,...f.affectedIds])];
   if(refs.length>MAX_IDS)notices.push('Opening affected identifiers truncated to '+MAX_IDS+' of '+refs.length+'.');
   add('opening:'+f.bindingId,f.status,refs.slice(0,MAX_IDS),{measured:f.measured,expected:0,unit:'drawing-units',errorPercent:null,evidence:['Opening checker result: '+f.code,...details]});
  }
  const openings=findings.filter(f=>f.code.startsWith('opening:'));
  openingSummary={total:openingReview.total,checked:openingReview.checked,status:worst([...openings.map(f=>f.status),...(notices.length||!openingReview.total||openings.length!==openingReview.total?['unknown']:[])])};
 }
 let boundarySummary;
 if(boundaryCapable){
  let total=0,retained=0,checked=0,knownViolationCount=0,unknown=false,failed=false,budget=0,edgeBudget=0;
  if(boundaryReview===undefined){unknown=true;add('boundary-review-unavailable','unknown',[],{evidence:['Declared boundary review is unavailable. No room discovery or physical enclosure was checked.']});}
  else{
   keys(boundaryReview,['coverage','status','total','checked','knownViolationCount','reasons','findings','upstream']);
   need(Number.isSafeInteger(boundaryReview.total)&&boundaryReview.total>=0&&boundaryReview.total<=1000&&Array.isArray(boundaryReview.findings)&&boundaryReview.findings.length===boundaryReview.total,'boundary review results');
   need(JSON.stringify(boundaryReview.coverage)===JSON.stringify({scope:'explicit-declared-schematic-rings-only',roomDiscoveryPerformed:false,physicalEnclosureVerified:false}),'boundary scope');
   need(strings(boundaryReview.reasons,100,200),'boundary review reasons');validateBoundaryUpstream(boundaryReview.upstream);total=boundaryReview.total;const reviewed=[];
   for(const f of boundaryReview.findings){
    const context=boundaryContext(f,boundaryReview.upstream,{projectId,sourceHash}),json=JSON.stringify({boundarySourceContext:context});
    reviewed.push(f);
    if(retained>=100||findings.length>=MAX_FINDINGS-2||budget+json.length>2_000_000||edgeBudget+context.declaration.edges.length>4096){notices.push('Declared boundary results or evidence exceeded the saved report budget; omitted declarations remain unevaluated in this saved report.');unknown=true;continue;}
    const proof=replayBoundary(context,{projectId,sourceHash});need(f.status===proof.status&&f.evidence.numericalViolationCount===proof.evidence.numericalViolationCount,'boundary result must match replayed current evidence');
    need(json.length<=188100,'boundary source evidence size');const pieces=[];for(let i=0;i<json.length;i+=1900)pieces.push(json.slice(i,i+1900));
    add('boundary:'+f.declarationId,proof.status,[f.declarationId,...f.declaration.edges.map(e=>e.segmentId)],{evidence:['Boundary checker result: '+context.resultCode,...pieces]});
    retained++;budget+=json.length;edgeBudget+=context.declaration.edges.length;checked+=proof.status!=='unknown'?1:0;knownViolationCount+=proof.evidence.numericalViolationCount;unknown ||= proof.status==='unknown';failed ||= proof.status==='fail';
   }
   need(boundaryReview.checked===reviewed.filter(f=>f.status!=='unknown').length&&boundaryReview.knownViolationCount===reviewed.reduce((sum,f)=>sum+f.evidence.numericalViolationCount,0),'boundary input counts');
   need(boundaryReview.status===(!total||reviewed.some(f=>f.status==='unknown')?'unknown':reviewed.some(f=>f.status==='fail')?'fail':'pass'),'boundary input status');
  }
  boundarySummary={total,retained,checked,status:!total||unknown||notices.length?'unknown':failed?'fail':'pass',knownViolationCount};
 }
 if(!geometryReport)add('geometry-unavailable','unknown');
 if(notices.length)add('review-incomplete','unknown',[],{evidence:[...new Set(notices)].slice(0,100)});
 findings.sort((a,b)=>a.id.localeCompare(b.id));
 const geometryStatus=notices.length||!geometryReport?'unknown':!geometryReport.walls?'unknown':worst(['pass',...findings.filter(f=>f.code.startsWith('geometry:')||f.code.startsWith('unsupported:')).map(f=>f.status)]);
 const dimensions=findings.filter(isDimensionFinding);
 const report={schemaVersion:SCHEMA_VERSION,checkerVersion:CHECKER_VERSION,revision,sourceHash,...(projectId===undefined?{}:{projectId}),...(stateToken===undefined?{}:{stateToken}),runAt,...(anchorSummary?{anchoredReview:anchorSummary}:{}),...(chainSummary?{chains:chainSummary}:{}),...(openingSummary?{openings:openingSummary}:{}),...(boundarySummary?{boundaries:boundarySummary}:{}),status:worst(['unknown',...(anchorSummary?[anchorSummary.status]:[]),...(chainSummary?[chainSummary.status]:[]),...(openingSummary?[openingSummary.status]:[]),...(boundarySummary?[boundarySummary.status]:[]),...findings.map(f=>f.status)]),findings,coverage:coverage(geometryStatus,notices.length?'unknown':dimensions.length?worst(dimensions.map(f=>f.status)):'not-checked',anchorSummary?(notices.length?'unknown':anchorSummary.status):'not-checked',false,chainSummary?(notices.length?'unknown':chainSummary.status):'not-checked',contractFor(CHECKER_VERSION).chains,openingSummary?(notices.length?'unknown':openingSummary.status):'not-checked',contractFor(CHECKER_VERSION).openings,boundarySummary?boundarySummary.status:'unknown',boundaryCapable)};
 return validateReports([report])[0];
}
function boundaryContext(f,upstream,report){
 keys(f,['declarationId','status','code','affectedIds','declaration','evidence']);need(text(f.declarationId,300)&&['pass','fail','unknown'].includes(f.status)&&text(f.code,200),'boundary finding');
 const e=f.evidence;need(object(e)&&strings(e.unknownReasons,100,200)&&Number.isSafeInteger(e.numericalViolationCount)&&e.numericalViolationCount>=0&&e.numericalViolationCount<=2081&&Array.isArray(e.resolvedEdges)&&e.resolvedEdges.length<=64,'boundary evidence');
 need(typeof root.RoomBoundaries?.validate==='function','boundary checker unavailable');const declaration=root.RoomBoundaries.validate([f.declaration],report.projectId===undefined?{}:{projectId:report.projectId})[0];need(declaration.id===f.declarationId,'boundary declaration identity');
 const resolvedEdges=e.resolvedEdges.map(edge=>{keys(edge,['edgeIndex','segmentId','kind','startEndpoint','a','b','sourceHash','frameId']);need(edge.sourceHash===e.currentSourceHash&&edge.frameId===e.currentFrameId,'boundary resolved edge source/frame');return {edgeIndex:edge.edgeIndex,segmentId:edge.segmentId,kind:edge.kind,startEndpoint:edge.startEndpoint,a:edge.a,b:edge.b};});
 return checkedBoundaryContext({declaration,currentSourceHash:e.currentSourceHash,currentFrameId:e.currentFrameId,unknownReasons:e.unknownReasons,resultCode:f.code,resolvedEdges,upstream},report);
}
function validateBoundaryUpstream(u){keys(u,['unsupportedProvided','unsupportedCount','unsupportedSample','unsupportedTruncated','sampleLimit','sampleCharacterLimit']);need(typeof u.unsupportedProvided==='boolean'&&typeof u.unsupportedTruncated==='boolean'&&u.sampleLimit===10&&u.sampleCharacterLimit===200&&Array.isArray(u.unsupportedSample)&&u.unsupportedSample.length<=10&&u.unsupportedSample.every(v=>typeof v==='string'&&v.length>0&&v.length<=200),'boundary upstream evidence');need(u.unsupportedProvided?Number.isSafeInteger(u.unsupportedCount)&&u.unsupportedCount>=0&&u.unsupportedCount<=20000:u.unsupportedCount===null,'boundary upstream count');need(u.unsupportedSample.length===(u.unsupportedProvided?Math.min(10,u.unsupportedCount):0)&&(!u.unsupportedTruncated||u.unsupportedCount>0)&&(!(u.unsupportedCount>10)||u.unsupportedTruncated),'boundary upstream sample');return u;}
function checkedBoundaryContext(c,report){
 keys(c,['declaration','currentSourceHash','currentFrameId','unknownReasons','resultCode','resolvedEdges','upstream']);
 need(typeof root.RoomBoundaries?.validate==='function'&&typeof root.RoomBoundaries?.evaluate==='function','boundary checker unavailable');
 const declaration=root.RoomBoundaries.validate([c.declaration],report.projectId===undefined?{}:{projectId:report.projectId})[0];need(c.currentSourceHash===null||c.currentSourceHash===report.sourceHash,'boundary current source must match saved report');need(c.currentFrameId===null||text(c.currentFrameId,300),'boundary current frame');need(strings(c.unknownReasons,100,200)&&new Set(c.unknownReasons).size===c.unknownReasons.length&&text(c.resultCode,200),'boundary reasons');
 validateBoundaryUpstream(c.upstream);
 need(Array.isArray(c.resolvedEdges)&&c.resolvedEdges.length<=declaration.edges.length,'boundary resolved evidence');const indices=new Set();for(const edge of c.resolvedEdges){keys(edge,['edgeIndex','segmentId','kind','startEndpoint','a','b']);need(Number.isSafeInteger(edge.edgeIndex)&&edge.edgeIndex>=0&&edge.edgeIndex<declaration.edges.length&&!indices.has(edge.edgeIndex),'boundary edge index');indices.add(edge.edgeIndex);const declared=declaration.edges[edge.edgeIndex];need(edge.segmentId===declared.segmentId&&edge.startEndpoint===declared.startEndpoint&&['wall','window','opening'].includes(edge.kind),'boundary edge identity');need(Array.isArray(edge.a)&&Array.isArray(edge.b)&&edge.a.length===2&&edge.b.length===2&&[...edge.a,...edge.b].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e9),'boundary edge coordinates');}
 need(!c.resolvedEdges.length||c.currentSourceHash!==null&&c.currentFrameId!==null,'resolved boundary needs current coordinate context');return JSON.parse(JSON.stringify({...c,declaration}));
}
function replayBoundary(context,report){
 const c=checkedBoundaryContext(context,report),input={records:[c.declaration],...(report.projectId===undefined?{}:{projectId:report.projectId}),...(c.currentSourceHash===null?{}:{sourceHash:c.currentSourceHash}),...(c.currentFrameId===null?{}:{frameId:c.currentFrameId}),segments:c.resolvedEdges.map(edge=>({id:edge.segmentId,kind:edge.kind,a:edge.startEndpoint==='a'?edge.a:edge.b,b:edge.startEndpoint==='a'?edge.b:edge.a,sourceHash:c.currentSourceHash,frameId:c.currentFrameId,coordinateStatus:'supported'})),...(c.upstream.unsupportedProvided?{unsupported:c.upstream.unsupportedCount?['Persisted unsupported source evidence is present.']:[]}: {})};
 const proof=root.RoomBoundaries.evaluate(input).findings[0];need(proof.evidence.resolvedEdgeCount===c.resolvedEdges.length,'boundary proof cannot promote unsupported coordinates');need(proof.status==='unknown'?c.unknownReasons.length>0:c.unknownReasons.length===0,'boundary unknown reasons');need(c.resultCode===(c.unknownReasons[0]||proof.code),'boundary result code');return proof;
}
function validateBoundaryFinding(f,report){
 need(text(f.code,400)&&text(f.code.slice(9),300)&&['pass','fail','unknown'].includes(f.status)&&f.severity===severity(f.status)&&f.measured===null&&f.expected===null&&f.unit===null&&f.errorPercent===null&&strings(f.evidence,100)&&f.evidence.length>=2,'saved boundary finding');
 let wrapper;try{wrapper=JSON.parse(f.evidence.slice(1).join(''));}catch{need(false,'boundary source context JSON');}keys(wrapper,['boundarySourceContext']);const context=checkedBoundaryContext(wrapper.boundarySourceContext,report),proof=replayBoundary(context,report),refs=[...new Set([context.declaration.id,...context.declaration.edges.map(edge=>edge.segmentId)])].sort();
 need(f.code==='boundary:'+context.declaration.id&&JSON.stringify([...f.affectedIds].sort())===JSON.stringify(refs)&&f.status===proof.status&&f.evidence[0]==='Boundary checker result: '+context.resultCode,'saved boundary identity/status');return proof;
}
function boundaryDetails(f,report){
 need(contractFor(report.checkerVersion)?.boundaries,'boundary details require boundary-capable report');const proof=validateBoundaryFinding(f,report),context=JSON.parse(f.evidence.slice(1).join('')).boundarySourceContext;
 return {declaration:proof.declaration,status:proof.status,code:context.resultCode,unknownReasons:[...context.unknownReasons],knownViolationCount:proof.evidence.numericalViolationCount,violations:proof.evidence.violations,violationsTruncated:proof.evidence.violationsTruncated,resolvedEdges:proof.evidence.resolvedEdges,upstream:JSON.parse(JSON.stringify(context.upstream))};
}
function openingEvidence(value){
 const seen=new Set();
 function check(v,depth=0){need(depth<=30,'opening evidence nesting');if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'){need(Number.isFinite(v),'opening evidence finite number');return;}need(Array.isArray(v)||object(v),'opening evidence must be plain JSON data');need(!seen.has(v),'opening evidence cycle');seen.add(v);for(const item of Object.values(v))check(item,depth+1);seen.delete(v);}
 check(value);need(object(value),'opening evidence object');
 const context={projectId:value.projectId,bindingSourceHash:value.bindingSourceHash,currentSourceHash:value.currentSourceHash,epsilonDrawingUnits:value.epsilonDrawingUnits,startGap:value.startJamb?.gapDrawingUnits,endGap:value.endJamb?.gapDrawingUnits,reasons:value.reasons,violations:value.violations,unsupportedCount:value.unsupportedCount,conflictingWallCount:value.conflictingWallCount};check(context);
 const encoded=JSON.stringify({openingSourceContext:context});need(encoded.length<=MAX_TEXT,'opening source context limit');const full=JSON.stringify(value);
 if(full.length<=MAX_TEXT)return [encoded,full];
 return [encoded,...Object.entries(value).flatMap(([key,item])=>Array.isArray(item)?item.map((entry,index)=>JSON.stringify({field:key,index,value:entry})):[JSON.stringify({field:key,value:item})])];
}
function validateOpeningContext(f,c,report){
 keys(c,['projectId','bindingSourceHash','currentSourceHash','epsilonDrawingUnits','startGap','endGap','reasons','violations','unsupportedCount','conflictingWallCount']);
 need((c.projectId===null||text(c.projectId,300))&&text(c.bindingSourceHash,300)&&(c.currentSourceHash===null||text(c.currentSourceHash,300))&&c.epsilonDrawingUnits===1e-7,'opening source identities or numerical epsilon');
 need(finite(c.startGap)&&finite(c.endGap)&&(c.startGap===null||c.startGap>=0)&&(c.endGap===null||c.endGap>=0)&&strings(c.reasons,100,200)&&strings(c.violations,100,200),'opening source gaps and reasons');
 for(const k of ['unsupportedCount','conflictingWallCount'])need(Number.isSafeInteger(c[k])&&c[k]>=0&&c[k]<=20000,'opening source evidence counts');
 need(f.measured===(c.startGap===null||c.endGap===null?null:Math.max(c.startGap,c.endGap)),'opening measured endpoint gap');
 if(f.status==='unknown')need(c.reasons.length>0,'unknown opening needs source reasons');
 else {need(c.projectId===report.projectId&&c.bindingSourceHash===report.sourceHash&&c.currentSourceHash===report.sourceHash&&!c.reasons.length&&!c.unsupportedCount,'checked opening requires current project source');
  need(f.status==='pass'?!c.violations.length&&!c.conflictingWallCount&&f.measured!==null&&f.measured<=c.epsilonDrawingUnits:c.violations.length>0,'opening numerical result evidence');}
}
function isDimensionFinding(f){return f.code.startsWith('dimension-line:')||['geometry:unsupported-dimension-unit','geometry:invalid-dimension','geometry:dimension-unit-unverified','geometry:dimension-scale-mismatch'].includes(f.code);}
function validateReports(reports){
 need(Array.isArray(reports)&&reports.length<=MAX_REPORTS,'report array limit');
 for(const r of reports){
  keys(r,['schemaVersion','checkerVersion','revision','sourceHash','runAt','status','findings','coverage'],['projectId','stateToken','anchoredReview','chains','openings','boundaries']);
  for(const k of ['projectId','stateToken'])need(!Object.hasOwn(r,k)||text(r[k],200),'project or state identity');
  const contract=contractFor(r.checkerVersion);need(r.schemaVersion===SCHEMA_VERSION&&contract!==null,'unsupported schema or checker version');
  need(text(r.revision,200)&&text(r.sourceHash,200)&&date(r.runAt)&&STATUSES.includes(r.status),'report metadata');
  need(Array.isArray(r.findings)&&r.findings.length<=MAX_FINDINGS,'finding limit');
  const seen=new Set(),boundaryProofs=[];let boundaryEvidenceBytes=0,boundaryEdgeCount=0;
  for(const f of r.findings){
   keys(f,['id','code','status','severity','affectedIds','measured','expected','unit','errorPercent','evidence']);
   need(text(f.code,contract.anchors?400:300)&&strings(f.affectedIds,MAX_IDS,300)&&new Set(f.affectedIds).size===f.affectedIds.length,'finding identity');
   need(f.id===identity(f.code,f.affectedIds,contract.boundaries)&&!seen.has(f.id),'invalid or duplicate finding ID');seen.add(f.id);
   need(STATUSES.includes(f.status)&&SEVERITIES.includes(f.severity)&&f.severity===severity(f.status),'finding status or severity');
   need(finite(f.measured)&&finite(f.expected)&&finite(f.errorPercent)&&(f.unit===null||text(f.unit,20))&&strings(f.evidence,100),'finding measurements or evidence');
   if(f.code==='anchor-coverage-unbound')need(f.status==='unknown'&&f.evidence.length>0,'unbound dimension coverage must remain unknown');
   if(f.code.startsWith('anchor:')||f.code.startsWith('chain:'))need(!['pass','fail'].includes(f.status)||(f.expected>0&&f.measured!==null&&f.errorPercent!==null&&['mm','cm','m'].includes(f.unit)),'saved anchored comparison requires measurements');
   if(f.code.startsWith('opening:')){
    need(contract.openings&&text(f.code.slice(8),300)&&f.affectedIds.includes(f.code.slice(8))&&['pass','fail','unknown'].includes(f.status)&&f.expected===0&&f.unit==='drawing-units'&&f.errorPercent===null&&(f.measured===null||f.measured>=0)&&(f.status==='unknown'||f.measured!==null)&&f.evidence.length>=2&&f.evidence[0].startsWith('Opening checker result: '),'saved opening numerical alignment');
    let context;try{context=JSON.parse(f.evidence[1]);}catch{need(false,'opening source context JSON');}keys(context,['openingSourceContext']);validateOpeningContext(f,context.openingSourceContext,r);
   }
   if(contract.boundaries&&f.code.startsWith('boundary:')){const proof=validateBoundaryFinding(f,r);boundaryProofs.push(proof);boundaryEvidenceBytes+=f.evidence.slice(1).join('').length;boundaryEdgeCount+=proof.declaration.edges.length;need(boundaryProofs.length<=100&&boundaryEvidenceBytes<=2_000_000&&boundaryEdgeCount<=4096,'saved boundary budget');}
   if(f.code.startsWith('dimension-line:'))need(f.expected>0&&(!(f.status==='pass'||f.status==='fail')||(['mm','cm','m'].includes(f.unit)&&f.measured!==null&&f.errorPercent!==null)),'dimension result requires measurements');
  }
  const anchorFindings=r.findings.filter(f=>f.code.startsWith('anchor:'));
  if(r.anchoredReview!==undefined){
   need(contract.anchors,'legacy checker cannot contain anchored endpoint review');keys(r.anchoredReview,['checked','total','status']);const a=r.anchoredReview;
   need(Number.isSafeInteger(a.total)&&a.total>=0&&Number.isSafeInteger(a.checked)&&a.checked>=0&&a.checked<=a.total&&STATUSES.includes(a.status)&&anchorFindings.length<=a.total,'saved anchor summary');
   need(anchorFindings.length===a.total||r.findings.some(f=>f.code==='review-incomplete'),'omitted anchored findings require disclosure');
   if(anchorFindings.length===a.total)need(a.checked===anchorFindings.filter(f=>['pass','fail'].includes(f.status)).length,'saved verified anchor count');
   need(a.status!== 'pass'||a.total>0&&a.checked===a.total&&anchorFindings.length>0&&anchorFindings.every(f=>f.status==='pass'),'saved anchored pass needs checked results');
   need(a.status===worst([a.status,...anchorFindings.map(f=>f.status),...(a.checked<a.total||!a.total||r.findings.some(f=>f.code==='anchor-coverage-unbound')?['unknown']:[])]),'saved anchored status');
  }else need(!anchorFindings.length,'anchored findings require summary');
  const chainFindings=r.findings.filter(f=>f.code.startsWith('chain:'));
  if(r.chains!==undefined){
   need(contract.chains,'legacy checker cannot contain chain review');keys(r.chains,['total','checked','status']);const c=r.chains;
   need(Number.isSafeInteger(c.total)&&c.total>=0&&Number.isSafeInteger(c.checked)&&c.checked>=0&&c.checked<=c.total&&STATUSES.includes(c.status)&&chainFindings.length<=c.total,'saved chain summary');
   need(chainFindings.length===c.total||r.findings.some(f=>f.code==='review-incomplete'),'omitted chain findings require disclosure');
   if(chainFindings.length===c.total)need(c.checked===chainFindings.filter(f=>['pass','fail'].includes(f.status)).length,'saved verified chain count');
   need(c.status!=='pass'||c.total>0&&c.checked===c.total&&chainFindings.length>0&&chainFindings.every(f=>f.status==='pass'),'saved chain pass needs checked results');
   need(c.status===worst([c.status,...chainFindings.map(f=>f.status),...(c.checked<c.total||!c.total||!chainFindings.length?['unknown']:[])]),'saved chain status');
  }else need(!chainFindings.length,'chain findings require summary');
  const openingFindings=r.findings.filter(f=>f.code.startsWith('opening:'));
  if(r.openings!==undefined){
   need(contract.openings,'legacy checker cannot contain opening review');keys(r.openings,['total','checked','status']);const o=r.openings,incomplete=r.findings.some(f=>f.code==='review-incomplete');
   need(Number.isSafeInteger(o.total)&&o.total>=0&&o.total<=1000&&Number.isSafeInteger(o.checked)&&o.checked>=0&&o.checked<=o.total&&['pass','fail','unknown'].includes(o.status)&&openingFindings.length<=o.total,'saved opening summary');
   need(openingFindings.length===o.total||incomplete,'omitted opening findings require disclosure');
   const retainedChecked=openingFindings.filter(f=>['pass','fail'].includes(f.status)).length;need(o.checked>=retainedChecked&&o.checked<=retainedChecked+o.total-openingFindings.length,'saved checked opening count');
   need(o.status!=='pass'||!incomplete&&o.total>0&&o.checked===o.total&&openingFindings.length===o.total&&openingFindings.every(f=>f.status==='pass'),'saved opening pass needs complete checked results');
   need(o.status===worst([...openingFindings.map(f=>f.status),...(incomplete||!o.total||openingFindings.length!==o.total||o.checked<o.total?['unknown']:[])]),'saved opening status');
  }else need(!openingFindings.length,'opening findings require summary');
  const boundaryFindings=contract.boundaries?r.findings.filter(f=>f.code.startsWith('boundary:')):[];
  if(r.boundaries!==undefined){
   need(contract.boundaries,'historical checker cannot contain boundary review');keys(r.boundaries,['total','retained','checked','status','knownViolationCount']);const b=r.boundaries,incomplete=r.findings.some(f=>f.code==='review-incomplete');
   for(const key of ['total','retained','checked','knownViolationCount'])need(Number.isSafeInteger(b[key])&&b[key]>=0,'saved boundary counts');need(b.total<=1000&&b.retained===boundaryFindings.length&&b.retained<=100&&b.retained<=b.total,'saved boundary retention');
   const proofs=boundaryProofs;need(b.checked===proofs.filter(f=>f.status!=='unknown').length&&b.knownViolationCount===proofs.reduce((sum,f)=>sum+f.evidence.numericalViolationCount,0),'saved boundary proof counts');
   need(b.retained===b.total||incomplete,'omitted boundaries require incomplete disclosure');const status=!b.total||incomplete||proofs.some(f=>f.status==='unknown')?'unknown':proofs.some(f=>f.status==='fail')?'fail':'pass';need(b.status===status,'saved boundary status');
  }else need(!contract.boundaries&&!boundaryFindings.length,'current boundary summary required');
  need(r.status===worst(['unknown',...(r.anchoredReview?[r.anchoredReview.status]:[]),...(r.chains?[r.chains.status]:[]),...(r.openings?[r.openings.status]:[]),...(r.boundaries?[r.boundaries.status]:[]),...r.findings.map(f=>f.status)]),'overall status');
  const expected=contract.coverage;need(Array.isArray(r.coverage)&&r.coverage.length===expected.length,'coverage matrix');
  for(let i=0;i<expected.length;i++){
   const c=r.coverage[i],e=expected[i];keys(c,['id','category','status','detail']);
   need(c.id===e.id&&c.category===e.category&&c.detail===e.detail&&STATUSES.includes(c.status),'coverage definition');
   if(i>=2&&(i!==2||!contract.anchors)&&i!==7&&(i!==8||!contract.openings)&&(i!==9||!contract.boundaries))need(c.status===e.status,'unsupported checks cannot pass');
  }
  const gs=!r.findings.some(f=>f.code==='geometry-unavailable')?worst(['pass',...r.findings.filter(f=>f.code.startsWith('geometry:')||f.code.startsWith('unsupported:')).map(f=>f.status)]):'unknown';
  const incomplete=r.findings.some(f=>f.code==='review-incomplete');
  if(incomplete){const f=r.findings.find(f=>f.code==='review-incomplete');need(f.status==='unknown'&&f.evidence.length>0&&r.coverage[0].status==='unknown','incomplete review must disclose unknown coverage');}
  need(r.coverage[0].status===gs||r.coverage[0].status==='unknown','schematic coverage status');
  if(contract.anchors)need(r.coverage[2].status===(r.anchoredReview?(incomplete?'unknown':r.anchoredReview.status):'not-checked'),'anchored endpoint coverage status');
  if(contract.chains)need(r.coverage[7].status===(r.chains?(incomplete?'unknown':r.chains.status):'not-checked'),'dimension chain coverage status');
  if(contract.openings)need(r.coverage[8].status===(r.openings?(incomplete?'unknown':r.openings.status):'not-checked'),'opening endpoint coverage status');
  if(contract.boundaries)need(r.coverage[9].status===r.boundaries.status,'declared boundary coverage status');
  const ds=r.findings.filter(isDimensionFinding),dimensionStatus=incomplete?'unknown':ds.length?worst(ds.map(f=>f.status)):'not-checked';need(r.coverage[1].status===dimensionStatus||(contract.legacyDimensionCoverage&&r.coverage[1].status==='not-checked'&&!r.findings.some(f=>f.code.startsWith('dimension-line:'))),'dimension coverage status');
 }
 return JSON.parse(JSON.stringify(reports));
}
function isStale(report,{revision,sourceHash,projectId,stateToken}={}){validateReports([report]);need(text(revision,200)&&text(sourceHash,200),'current revision and source hash required');return report.checkerVersion!==CHECKER_VERSION||report.revision!==revision||report.sourceHash!==sourceHash||['projectId','stateToken'].some(k=>Object.hasOwn(report,k)&&report[k]!==({projectId,stateToken})[k]);}
function signature(f){return JSON.stringify(Object.keys(f).sort().map(k=>[k,k==='affectedIds'?[...f[k]].sort():f[k]]));}
function compareReports(previous,current){
 [previous,current]=validateReports([previous,current]);
 const old=new Map(previous.findings.map(f=>[f.id,f])),now=new Map(current.findings.map(f=>[f.id,f]));
 const result={added:[],removed:[],changed:[],unchanged:[]};
 for(const id of [...new Set([...old.keys(),...now.keys()])].sort()){
  if(!old.has(id))result.added.push(id);else if(!now.has(id))result.removed.push(id);else if(signature(old.get(id))!==signature(now.get(id)))result.changed.push(id);else result.unchanged.push(id);
 }
 return result;
}
root.ConsistencyReview={SCHEMA_VERSION,CHECKER_VERSION,createReport,validateReports,isStale,compareReports,boundaryDetails};
})(typeof window==='undefined'?globalThis:window);
