/* Provider-neutral, bounded schematic review records. No source documents are stored. */
(function(root){
'use strict';
const SCHEMA_VERSION=1,CHECKER_VERSION='schematic-1.1.0';
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
function identity(code,ids){return 'finding-'+stable(JSON.stringify([code,[...ids].sort()]));}
function coverage(geometryStatus,dimensionStatus){return [
 {id:'schematic-geometry',category:'automated-geometry',status:geometryStatus,detail:'Semantic linear walls, explicit opening/window spans and rectangular fixtures only; wall thickness and full topology are unmodeled.'},
 {id:'dimension-line-scale',category:'automated-geometry',status:dimensionStatus,detail:'Declared dimensions compared to dimension-line spans using the supplied calibration and tolerance; spans are not anchored to walls.'},
 {id:'anchored-dimension-chains',category:'automated-geometry',status:'not-checked',detail:'Anchored wall/opening dimensions, chains, totals, axes and levels are not modeled.'},
 {id:'rooms-openings-doors',category:'automated-geometry',status:'not-checked',detail:'Closed room regions, areas, adjacency, hosted door relationships, swings and clearances are not modeled. Explicit opening segments receive schematic checks only.'},
 {id:'source-notation',category:'source-notation',status:'unknown',detail:'Original page provenance, notation, source distortion and missing or changed labels require source review.'},
 {id:'as-built-survey',category:'survey-dependent',status:'not-checked',detail:'No physical survey or as-built verification has been performed by this checker.'},
 {id:'structural-regulatory',category:'professional-code',status:'not-checked',detail:'No structural, safety or regulatory certification; no jurisdiction, rule edition or authoritative rule set is evaluated.'}
 ];}
function severity(status){return status==='fail'?'error':['warning','unknown'].includes(status)?'warning':'info';}
function worst(statuses){return statuses.includes('fail')?'fail':statuses.some(s=>s==='warning')?'warning':statuses.includes('unknown')?'unknown':statuses.includes('pass')?'pass':'not-checked';}
function createReport({revision,sourceHash,geometryReport=null,measurementAudit,projectId,stateToken,runAt=new Date().toISOString()}={}){
 need(text(revision,200)&&text(sourceHash,200),'revision and source hash required');need(date(runAt),'run time must be an ISO UTC timestamp');
 for(const v of [projectId,stateToken])need(v===undefined||text(v,200),'project or state identity');
 const findings=[],seen=new Set(),notices=[];
 function bounded(records,limit,label){need(Array.isArray(records),label+' array');if(records.length>limit)notices.push(label+': retained first '+limit+' of '+records.length+' input records; remaining records not evaluated for this saved report.');return records.slice(0,limit);}
 function evidence(values){need(Array.isArray(values),'evidence array');if(values.length>100)notices.push('Source evidence list truncated to 100 entries.');return values.slice(0,100).map(v=>{need(typeof v==='string'&&v.length>0,'source evidence text');const clean=v.replace(/[\u0000-\u001f\u007f]/g,' ');if(clean!==v||v.length>MAX_TEXT)notices.push('Source evidence text shortened or control characters replaced.');return clean.length>MAX_TEXT?clean.slice(0,MAX_TEXT-1)+'…':clean;});}
 function add(code,status,ids=[],values={}){need(text(code,300)&&strings(ids,MAX_IDS,200),'finding code or affected IDs');ids=[...new Set(ids)].sort();const f={id:identity(code,ids),code,status,severity:severity(status),affectedIds:ids,measured:null,expected:null,unit:null,errorPercent:null,evidence:[],...values};f.evidence=evidence(f.evidence);need(!seen.has(f.id),'duplicate finding identity');seen.add(f.id);findings.push(f);}
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
 if(!geometryReport)add('geometry-unavailable','unknown');
 if(notices.length)add('review-incomplete','unknown',[],{evidence:[...new Set(notices)].slice(0,100)});
 findings.sort((a,b)=>a.id.localeCompare(b.id));
 const geometryStatus=notices.length||!geometryReport?'unknown':!geometryReport.walls?'unknown':worst(['pass',...findings.filter(f=>f.code.startsWith('geometry:')||f.code.startsWith('unsupported:')).map(f=>f.status)]);
 const dimensions=findings.filter(isDimensionFinding);
 const report={schemaVersion:SCHEMA_VERSION,checkerVersion:CHECKER_VERSION,revision,sourceHash,...(projectId===undefined?{}:{projectId}),...(stateToken===undefined?{}:{stateToken}),runAt,status:worst(['unknown',...findings.map(f=>f.status)]),findings,coverage:coverage(geometryStatus,notices.length?'unknown':dimensions.length?worst(dimensions.map(f=>f.status)):'not-checked')};
 return validateReports([report])[0];
}
function isDimensionFinding(f){return f.code.startsWith('dimension-line:')||['geometry:unsupported-dimension-unit','geometry:invalid-dimension','geometry:dimension-unit-unverified','geometry:dimension-scale-mismatch'].includes(f.code);}
function validateReports(reports){
 need(Array.isArray(reports)&&reports.length<=MAX_REPORTS,'report array limit');
 for(const r of reports){
  keys(r,['schemaVersion','checkerVersion','revision','sourceHash','runAt','status','findings','coverage'],['projectId','stateToken']);
  for(const k of ['projectId','stateToken'])need(!Object.hasOwn(r,k)||text(r[k],200),'project or state identity');
  need(r.schemaVersion===SCHEMA_VERSION&&[CHECKER_VERSION,'schematic-1.0.0'].includes(r.checkerVersion),'unsupported schema or checker version');
  need(text(r.revision,200)&&text(r.sourceHash,200)&&date(r.runAt)&&STATUSES.includes(r.status),'report metadata');
  need(Array.isArray(r.findings)&&r.findings.length<=MAX_FINDINGS,'finding limit');
  const seen=new Set();
  for(const f of r.findings){
   keys(f,['id','code','status','severity','affectedIds','measured','expected','unit','errorPercent','evidence']);
   need(text(f.code,300)&&strings(f.affectedIds,MAX_IDS,200)&&new Set(f.affectedIds).size===f.affectedIds.length,'finding identity');
   need(f.id===identity(f.code,f.affectedIds)&&!seen.has(f.id),'invalid or duplicate finding ID');seen.add(f.id);
   need(STATUSES.includes(f.status)&&SEVERITIES.includes(f.severity)&&f.severity===severity(f.status),'finding status or severity');
   need(finite(f.measured)&&finite(f.expected)&&finite(f.errorPercent)&&(f.unit===null||text(f.unit,20))&&strings(f.evidence,100),'finding measurements or evidence');
   if(f.code.startsWith('dimension-line:'))need(f.expected>0&&(!(f.status==='pass'||f.status==='fail')||(['mm','cm','m'].includes(f.unit)&&f.measured!==null&&f.errorPercent!==null)),'dimension result requires measurements');
  }
  need(r.status===worst(['unknown',...r.findings.map(f=>f.status)]),'overall status');
  const expected=coverage('unknown','not-checked');need(Array.isArray(r.coverage)&&r.coverage.length===expected.length,'coverage matrix');
  for(let i=0;i<expected.length;i++){
   const c=r.coverage[i],e=expected[i];keys(c,['id','category','status','detail']);
   need(c.id===e.id&&c.category===e.category&&c.detail===e.detail&&STATUSES.includes(c.status),'coverage definition');
   if(i>=2)need(c.status===e.status,'unsupported checks cannot pass');
  }
  const gs=!r.findings.some(f=>f.code==='geometry-unavailable')?worst(['pass',...r.findings.filter(f=>f.code.startsWith('geometry:')||f.code.startsWith('unsupported:')).map(f=>f.status)]):'unknown';
  const incomplete=r.findings.some(f=>f.code==='review-incomplete');
  if(incomplete){const f=r.findings.find(f=>f.code==='review-incomplete');need(f.status==='unknown'&&f.evidence.length>0&&r.coverage[0].status==='unknown','incomplete review must disclose unknown coverage');}
  need(r.coverage[0].status===gs||r.coverage[0].status==='unknown','schematic coverage status');
  const ds=r.findings.filter(isDimensionFinding);need(r.coverage[1].status===(incomplete?'unknown':ds.length?worst(ds.map(f=>f.status)):'not-checked'),'dimension coverage status');
 }
 return JSON.parse(JSON.stringify(reports));
}
function isStale(report,{revision,sourceHash,projectId,stateToken}={}){validateReports([report]);need(text(revision,200)&&text(sourceHash,200),'current revision and source hash required');return report.revision!==revision||report.sourceHash!==sourceHash||['projectId','stateToken'].some(k=>Object.hasOwn(report,k)&&report[k]!==({projectId,stateToken})[k]);}
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
root.ConsistencyReview={SCHEMA_VERSION,CHECKER_VERSION,createReport,validateReports,isStale,compareReports};
})(typeof window==='undefined'?globalThis:window);
