import assert from 'node:assert/strict';
import '../src/geometry.js';
import '../src/consistency-review.js';
import '../src/measurement-anchors.js';
const R=globalThis.ConsistencyReview,G=globalThis.LayoutGeometry;
const square=[[[0,0],[100,0]],[[100,0],[100,100]],[[100,100],[0,100]],[[0,100],[0,0]]].map(([a,b],i)=>({id:'wall-'+i,kind:'wall',a,b}));
const dimension={id:'dimension-1',a:[0,0],b:[100,0],value:100,unit:'mm',unitStatus:'verified'};
const geometryReport=G.validate({segments:square,calibration:{drawingUnits:1,realMillimetres:1,status:'verified'},dimensions:[dimension]});
const options={revision:'v1',sourceHash:'fabricated-source',projectId:'project-demo',stateToken:'state-one',runAt:'2026-01-01T00:00:00.000Z',geometryReport};
const first=R.createReport(options);
assert.equal(first.schemaVersion,1);
assert.equal(first.checkerVersion,R.CHECKER_VERSION);
assert.equal(first.status,'unknown','Limited schematic success cannot imply full review success');
assert.equal(first.coverage[0].status,'pass');
assert.equal(first.coverage[1].status,'pass');
for(const id of ['anchored-dimension-chains','rooms-openings-doors','as-built-survey','structural-regulatory'])assert.equal(first.coverage.find(c=>c.id===id).status,'not-checked');
const dim=first.findings.find(f=>f.code==='dimension-line:dimension-1');
assert.equal(dim.measured,100);assert.equal(dim.expected,100);assert.equal(dim.unit,'mm');assert.deepEqual(dim.affectedIds,['dimension-1']);
assert.deepEqual(R.validateReports(JSON.parse(JSON.stringify([first]))),[first]);
const copy=R.validateReports([first]);copy[0].findings[0].expected=10;assert.equal(first.findings[0].expected,100,'validated imports are detached');
assert.equal(R.isStale(first,options),false);
assert.equal(R.isStale(first,{...options,revision:'v2'}),true);
assert.equal(R.isStale(first,{...options,sourceHash:'other'}),true);
assert.equal(R.isStale(first,{...options,stateToken:'state-other'}),true,'Undo-branch revision reuse cannot refresh an old report');
assert.equal(R.isStale(first,{...options,projectId:'other-project'}),true);
assert.equal(R.isStale(first,{revision:'v1',sourceHash:'fabricated-source'}),true);
const changed=R.createReport({...options,geometryReport:G.validate({segments:square,calibration:{drawingUnits:1,realMillimetres:2,status:'verified'},dimensions:[dimension]})});
assert.equal(changed.status,'fail');
assert.equal(changed.findings.find(f=>f.id===dim.id).status,'fail','Dimension identity survives value changes');
const comparison=R.compareReports(first,changed);
assert.deepEqual(comparison.changed,[dim.id]);assert.equal(comparison.added.length,1);assert.equal(comparison.removed.length,0);
assert.deepEqual(R.compareReports(changed,first).removed,comparison.added);
assert.deepEqual(R.compareReports(first,R.createReport({...options,runAt:'2026-01-02T00:00:00.000Z'})),{added:[],removed:[],changed:[],unchanged:[dim.id]});
const reordered=JSON.parse(JSON.stringify(first));reordered.findings=reordered.findings.map(f=>Object.fromEntries(Object.entries(f).reverse()));
assert.deepEqual(R.compareReports(first,reordered).changed,[],'Import key order is not a finding change');
const missing=R.createReport({revision:'v1',sourceHash:'source',runAt:options.runAt});
assert.equal(missing.status,'unknown');assert.equal(missing.coverage[0].status,'unknown');assert.equal(missing.coverage[1].status,'not-checked');
const provisional=R.createReport({...options,geometryReport:G.validate({segments:square,calibration:{drawingUnits:1,realMillimetres:1,status:'manual'},dimensions:[dimension]})});
assert.equal(provisional.findings.find(f=>f.id===dim.id).status,'warning','A matching dimension with provisional calibration cannot pass');
const unscaled=R.createReport({...options,geometryReport:G.validate({segments:square,dimensions:[dimension]})});
assert.equal(unscaled.findings.find(f=>f.id===dim.id).status,'unknown');
const evidence=R.createReport({...options,measurementAudit:[{...geometryReport.dimensionAudit[0],evidence:['source span dimension-1']}]});
assert.deepEqual(evidence.findings.find(f=>f.id===dim.id).evidence,['source span dimension-1']);
const unsupported=R.createReport({...options,geometryReport:{...geometryReport,unsupported:['curve: unsupported path']}});
assert.equal(unsupported.coverage[0].status,'unknown');
const issue={code:'wall-crossing',ids:['wall-2','wall-1'],measured:2,expected:0,unit:'mm',evidence:['synthetic span']};
const duplicate=R.createReport({...options,geometryReport:{...geometryReport,issues:[issue,{...issue,ids:[...issue.ids].reverse()}]}});
assert.equal(duplicate.findings.find(f=>f.code==='geometry:wall-crossing').measured,2);
assert.deepEqual(duplicate.findings.find(f=>f.code==='geometry:wall-crossing').evidence,['synthetic span']);
const unknownIssue=R.createReport({...options,geometryReport:{...geometryReport,issues:[{code:'future-check',ids:[]}]}});assert.equal(unknownIssue.findings.find(f=>f.code==='geometry:future-check').status,'unknown');
assert.equal(duplicate.findings.filter(f=>f.code==='geometry:wall-crossing').length,1,'Duplicate ordering cannot duplicate findings');
for(const mutate of [
 r=>r.schemaVersion=99,r=>r.checkerVersion='unknown',r=>r.runAt='yesterday',r=>r.runAt='2026-02-30T00:00:00.000Z',
 r=>r.extra='untrusted',r=>r.projectId='',r=>r.findings[0].extra='untrusted',r=>r.findings[0].id='forged',
 r=>r.findings[0].measured=Infinity,r=>r.findings[0].evidence=['x'.repeat(2001)],r=>r.findings.push(r.findings[0]),
 r=>r.coverage[2].status='pass',r=>r.coverage[0].detail='certified',r=>r.status='pass',r=>r.findings[0].severity='error',
 r=>r.findings[0].affectedIds=['x'.repeat(301)],r=>r.stateToken={},r=>r.revision='x'.repeat(201)
]){const bad=structuredClone(first);mutate(bad);assert.throws(()=>R.validateReports([bad]));}
assert.throws(()=>R.validateReports(Array(51).fill(first)));
assert.throws(()=>R.createReport({...options,geometryReport:{}}));
assert.throws(()=>R.createReport({...options,measurementAudit:[{...geometryReport.dimensionAudit[0],measured:undefined}]}));
for(const unit of [null,'in','jo']){
 const unsupportedDimension={...dimension,unit};
 const report=R.createReport({...options,geometryReport:G.validate({segments:square,dimensions:[unsupportedDimension],calibration:{drawingUnits:1,realMillimetres:1,status:'verified'}})});
 assert.equal(report.status,'unknown');
 assert.equal(report.findings.find(f=>f.code==='geometry:unsupported-dimension-unit').status,'unknown');
 assert.equal(report.coverage[1].status,'unknown','Missing dimension semantics cannot disappear from coverage');
 const explicit=R.createReport({...options,measurementAudit:[{...geometryReport.dimensionAudit[0],unit}]});
 assert.equal(explicit.findings.find(f=>f.id===dim.id).status,'unknown');
 assert.equal(explicit.findings.find(f=>f.id===dim.id).unit,unit);
 assert.deepEqual(R.validateReports([explicit]),[explicit]);
}
const noWalls=R.createReport({...options,geometryReport:G.validate({segments:[],calibration:{drawingUnits:1,realMillimetres:1,status:'verified'}})});
assert.equal(noWalls.findings.find(f=>f.code==='geometry:no-semantic-walls').status,'unknown');
const inferredUnit=R.createReport({...options,measurementAudit:[{...geometryReport.dimensionAudit[0],unitStatus:'unverified'}]});
assert.equal(inferredUnit.findings.find(f=>f.id===dim.id).status,'unknown');
assert.throws(()=>R.createReport({...options,measurementAudit:Array(1001).fill(geometryReport.dimensionAudit[0])}));
assert.throws(()=>R.createReport({...options,measurementAudit:[geometryReport.dimensionAudit[0],geometryReport.dimensionAudit[0]]}));
const manyIssues=Array.from({length:1100},(_,i)=>({code:'future-check',ids:['synthetic-'+i]}));
const manyUnsupported=Array.from({length:1200},(_,i)=>'synthetic-unsupported-'+i);
const expanded=R.createReport({...options,geometryReport:{...geometryReport,issues:manyIssues,unsupported:manyUnsupported}});
assert.equal(expanded.findings.length,2301,'More than 1000 valid issue/unsupported inputs no longer abort');
assert.equal(expanded.findings.some(f=>f.code==='review-incomplete'),false);
const largeOptions={...options,geometryReport:{...geometryReport,issues:Array.from({length:6000},(_,i)=>({code:'future-check',ids:['synthetic-'+i]})),unsupported:Array.from({length:6000},(_,i)=>'synthetic-unsupported-'+i)},measurementAudit:Array.from({length:1200},(_,i)=>({...geometryReport.dimensionAudit[0],id:'synthetic-dimension-'+i}))};
const large=R.createReport(largeOptions);
assert.equal(large.findings.length,4901);
assert.equal(large.findings.find(f=>f.code==='review-incomplete').status,'unknown');
assert.equal(large.coverage[0].status,'unknown');assert.equal(large.coverage[1].status,'unknown');assert.equal(large.status,'unknown');
assert.deepEqual(R.createReport(largeOptions),large,'Capped selection and omission notices are deterministic');
assert.deepEqual(R.validateReports([large]),[large]);
const shortened=R.createReport({...options,geometryReport:{...geometryReport,unsupported:['synthetic:'+('x'.repeat(3000))]}});
assert.equal(shortened.findings.find(f=>f.code.startsWith('unsupported:')).evidence[0].length,2000);
assert.equal(shortened.findings.some(f=>f.code==='review-incomplete'),true);
assert.equal(shortened.coverage[0].status,'unknown');assert.equal(shortened.coverage[1].status,'unknown');
const invalidComplete=structuredClone(large);invalidComplete.coverage[1].status='pass';assert.throws(()=>R.validateReports([invalidComplete]));
const previousVersion=structuredClone(first);previousVersion.checkerVersion='schematic-1.0.0';previousVersion.coverage[2].detail='Anchored wall/opening dimensions, chains, totals, axes and levels are not modeled.';assert.deepEqual(R.validateReports([previousVersion]),[previousVersion]);
const A=globalThis.MeasurementAnchors;
const binding=A.createBinding({id:'synthetic-anchor',projectId:options.projectId,dimensionId:dimension.id,start:{segmentId:square[0].id,endpoint:'a'},end:{segmentId:square[0].id,endpoint:'b'},sourceHash:options.sourceHash});
const anchoredInput={anchors:[binding],projectId:options.projectId,segments:square,dimensions:[dimension],calibration:{drawingUnits:1,realMillimetres:1,status:'verified'},tolerancePercent:1,sourceHash:options.sourceHash};
const anchoredRaw=A.review(anchoredInput),anchored=R.createReport({...options,anchoredReview:anchoredRaw});
assert.equal(anchored.checkerVersion,'schematic-1.2.0');
assert.deepEqual(anchored.anchoredReview,{checked:1,total:1,status:'pass'});
assert.equal(anchored.coverage[2].status,'pass');assert.match(anchored.coverage[2].detail,/endpoint spans only/);assert.match(anchored.coverage[2].detail,/chains.*not modeled/);
assert.equal(anchored.status,'unknown','Passing endpoint spans do not certify the full project');
const anchorFinding=anchored.findings.find(f=>f.code==='anchor:synthetic-anchor');
assert.equal(anchorFinding.measured,100);assert.equal(anchorFinding.expected,100);assert.ok(anchorFinding.affectedIds.includes(dimension.id));
assert.equal(JSON.parse(anchorFinding.evidence[1]).bindingSourceHash,options.sourceHash);
const mismatch=R.createReport({...options,anchoredReview:A.review({...anchoredInput,dimensions:[{...dimension,value:80}]})});
assert.equal(mismatch.coverage[2].status,'fail');assert.equal(mismatch.findings.find(f=>f.id===anchorFinding.id).status,'fail','Anchor identity survives original checker code/status changes');
assert.ok(R.compareReports(anchored,mismatch).changed.includes(anchorFinding.id));
for(const patch of [{segments:[]},{sourceHash:'fabricated-new-source'},{tolerancePercent:undefined},{calibration:{drawingUnits:1,realMillimetres:1,status:'manual'}},{dimensions:[{...dimension,unit:null}]}]){
 const report=R.createReport({...options,anchoredReview:A.review({...anchoredInput,...patch})});assert.equal(report.coverage[2].status,'unknown');assert.equal(report.findings.find(f=>f.code==='anchor:synthetic-anchor').status,'unknown');assert.equal(report.anchoredReview.checked,0);assert.deepEqual(R.validateReports([report]),[report]);
}
const unusualUnit=R.createReport({...options,anchoredReview:A.review({...anchoredInput,dimensions:[{...dimension,unit:'unsupported-printed-unit-description'}]})});assert.equal(unusualUnit.coverage[2].status,'unknown');assert.equal(unusualUnit.findings.find(f=>f.code==='anchor:synthetic-anchor').unit,null);assert.ok(unusualUnit.findings.some(f=>f.code==='review-incomplete'));
const unbound=R.createReport({...options,anchoredReview:A.review({...anchoredInput,dimensions:[dimension,{...dimension,id:'synthetic-unbound'}]})});
assert.equal(unbound.coverage[2].status,'unknown','Bound subset pass cannot hide unbound source dimensions');assert.equal(unbound.anchoredReview.status,'unknown');
assert.ok(unbound.findings.find(f=>f.code==='anchor-coverage-unbound').affectedIds.includes('synthetic-unbound'));
const none=R.createReport({...options,anchoredReview:A.review({...anchoredInput,anchors:[]})});assert.equal(none.coverage[2].status,'unknown');assert.equal(none.anchoredReview.checked,0);
const longId='a'.repeat(300),longBinding=A.createBinding({id:longId,projectId:options.projectId,dimensionId:dimension.id,start:binding.start,end:binding.end,sourceHash:options.sourceHash});


const longReport=R.createReport({...options,anchoredReview:A.review({...anchoredInput,anchors:[longBinding]})});assert.ok(longReport.findings.some(f=>f.code==='anchor:'+longId&&f.affectedIds.includes(longId)));
const manyAnchors=Array.from({length:5000},(_,i)=>({...anchoredRaw.findings[0],anchorId:'synthetic-anchor-'+i,affectedIds:['synthetic-anchor-'+i,dimension.id,square[0].id]}));
const anchoredLarge=R.createReport({...largeOptions,anchoredReview:{...anchoredRaw,findings:manyAnchors,total:5000,checked:5000,coverage:{bindings:5000,comparisons:5000,verifiedComparisons:5000,unknown:0,unboundDimensions:[]}}});
assert.ok(anchoredLarge.findings.length<=5000);assert.equal(anchoredLarge.coverage[2].status,'unknown');assert.ok(anchoredLarge.findings.find(f=>f.code==='review-incomplete').evidence.some(e=>e.includes('Anchored endpoint results')));
assert.deepEqual(R.createReport({...largeOptions,anchoredReview:{...anchoredRaw,findings:manyAnchors,total:5000,checked:5000,coverage:{bindings:5000,comparisons:5000,verifiedComparisons:5000,unknown:0,unboundDimensions:[]}}}),anchoredLarge);
const evidenceLong=R.createReport({...options,anchoredReview:{...anchoredRaw,findings:[{...anchoredRaw.findings[0],evidence:{...anchoredRaw.findings[0].evidence,note:'x'.repeat(3000)}}]}});assert.equal(evidenceLong.coverage[2].status,'unknown');assert.ok(evidenceLong.findings.some(f=>f.code==='review-incomplete'));
assert.throws(()=>R.createReport({...options,anchoredReview:{...anchoredRaw,checked:0}}));
assert.throws(()=>R.createReport({...options,anchoredReview:{...anchoredRaw,findings:[{...anchoredRaw.findings[0],extra:'untrusted'}]}}));
const forged=structuredClone(unbound);forged.anchoredReview.status='pass';forged.coverage[2].status='pass';assert.throws(()=>R.validateReports([forged]));
const dropped=structuredClone(anchored);dropped.findings=dropped.findings.filter(f=>!f.code.startsWith('anchor:'));assert.throws(()=>R.validateReports([dropped]));
const previousMinor=structuredClone(previousVersion);previousMinor.checkerVersion='schematic-1.1.0';assert.deepEqual(R.validateReports([previousMinor]),[previousMinor]);
const legacyAnchored=structuredClone(anchored);legacyAnchored.checkerVersion='schematic-1.1.0';assert.throws(()=>R.validateReports([legacyAnchored]));
console.log('PASS: bounded saved reviews, strict imports, honest coverage, stable anchor comparisons, source evidence, missing bindings and legacy checker compatibility.');
