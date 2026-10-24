import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import '../src/consistency-review.js';
const R=globalThis.ConsistencyReview,copy=structuredClone;
// Frozen fabricated output captured before the compatibility refactor.
const frozen={"schemaVersion":1,"checkerVersion":"schematic-1.3.0","revision":"v3","sourceHash":"synthetic-source","projectId":"synthetic-project","stateToken":"synthetic-token","runAt":"2026-01-01T00:00:00.000Z","anchoredReview":{"checked":1,"total":1,"status":"pass"},"chains":{"total":1,"checked":1,"status":"pass"},"status":"unknown","findings":[{"id":"finding-11a91c146d286f7e","code":"anchor:synthetic-anchor","status":"pass","severity":"info","affectedIds":["synthetic-anchor","synthetic-wall"],"measured":100,"expected":100,"unit":"mm","errorPercent":0,"evidence":["Anchor checker result: synthetic-comparison","{\"source\":\"synthetic-source\"}"]},{"id":"finding-aab080a4d3be628a","code":"chain:synthetic-chain","status":"pass","severity":"info","affectedIds":["synthetic-chain","synthetic-wall"],"measured":100,"expected":100,"unit":"mm","errorPercent":0,"evidence":["Chain checker result: synthetic-comparison","{\"source\":\"synthetic-source\"}"]}],"coverage":[{"id":"schematic-geometry","category":"automated-geometry","status":"pass","detail":"Semantic linear walls, explicit opening/window spans and rectangular fixtures only; wall thickness and full topology are unmodeled."},{"id":"dimension-line-scale","category":"automated-geometry","status":"not-checked","detail":"Declared dimensions compared to dimension-line spans using the supplied calibration and tolerance; spans are not anchored to walls."},{"id":"anchored-dimension-chains","category":"automated-geometry","status":"pass","detail":"Source-anchored endpoint spans only; dimension chains, totals, room relationships, axes and levels are not modeled."},{"id":"rooms-openings-doors","category":"automated-geometry","status":"not-checked","detail":"Closed room regions, areas, adjacency, hosted door relationships, swings and clearances are not modeled. Explicit opening segments receive schematic checks only."},{"id":"source-notation","category":"source-notation","status":"unknown","detail":"Original page provenance, notation, source distortion and missing or changed labels require source review."},{"id":"as-built-survey","category":"survey-dependent","status":"not-checked","detail":"No physical survey or as-built verification has been performed by this checker."},{"id":"structural-regulatory","category":"professional-code","status":"not-checked","detail":"No structural, safety or regulatory certification; no jurisdiction, rule edition or authoritative rule set is evaluated."},{"id":"dimension-chain-totals","category":"automated-geometry","status":"pass","detail":"User-selected contiguous endpoint-bound chains on one explicit axis only; complete source chains, cross-axis totals, rooms and levels are not modeled."}]};
const options={"revision":"v3","sourceHash":"synthetic-source","projectId":"synthetic-project","stateToken":"synthetic-token","runAt":"2026-01-01T00:00:00.000Z","geometryReport":{"segments":2,"walls":2,"fixtures":0,"issues":[],"unsupported":[],"dimensionAudit":[],"dimensionTolerancePercent":1},"anchoredReview":{"findings":[{"anchorId":"synthetic-anchor","code":"synthetic-comparison","status":"pass","severity":"info","affectedIds":["synthetic-wall"],"measured":100,"expected":100,"unit":"mm","errorPercent":0,"evidence":{"source":"synthetic-source"}}],"total":1,"checked":1,"status":"pass"},"chainReview":{"findings":[{"chainId":"synthetic-chain","code":"synthetic-comparison","status":"pass","severity":"info","affectedIds":["synthetic-wall"],"measured":100,"expected":100,"unit":"mm","errorPercent":0,"evidence":{"source":"synthetic-source"}}],"total":1,"checked":1,"status":"pass"}};
const expectedHash="179452aee81679207464fd1aa75eb397c0be74b4d737abd8606e4a52768da6b4";
assert.equal(R.CHECKER_VERSION,'schematic-1.3.0');
assert.equal(createHash('sha256').update(JSON.stringify(R.createReport(options))).digest('hex'),expectedHash,'Current output remains byte-for-byte compatible');
assert.deepEqual(R.createReport(options),frozen);
const historical=[];
for(const version of ['schematic-1.0.0','schematic-1.1.0','schematic-1.2.0','schematic-1.3.0']){
 const report=copy(frozen);report.checkerVersion=version;
 if(version!=='schematic-1.3.0'){delete report.chains;report.findings=report.findings.filter(f=>!f.code.startsWith('chain:'));report.coverage=report.coverage.slice(0,7);}
 if(['schematic-1.0.0','schematic-1.1.0'].includes(version)){delete report.anchoredReview;report.findings=report.findings.filter(f=>!f.code.startsWith('anchor:'));report.coverage[2].status='not-checked';report.coverage[2].detail='Anchored wall/opening dimensions, chains, totals, axes and levels are not modeled.';}
 historical.push(report);
}
for(const module of [R])assert.deepEqual(module.validateReports(JSON.parse(JSON.stringify(historical))),historical);
// Simulate only an emitter-version change in memory. Historical definitions must remain
// fixed even if a future slice moves the current emitter; this adds no runtime version.
const source=fs.readFileSync(new URL('../src/consistency-review.js',import.meta.url),'utf8');
assert.match(source,/CHECKER_VERSION='schematic-1\.3\.0'/);
const sandbox=vm.createContext({JSON,Object});
vm.runInContext(source.replace("CHECKER_VERSION='schematic-1.3.0'","CHECKER_VERSION='synthetic-future-emitter'"),sandbox);
const future=sandbox.ConsistencyReview;
assert.equal(future.CHECKER_VERSION,'synthetic-future-emitter');
for(const module of [R,future]){
 assert.deepEqual(module.validateReports(JSON.parse(JSON.stringify(historical))),historical,'Historical reports survive import regardless of current emitter');
 const detached=module.validateReports(historical);detached[3].findings[0].evidence[0]='Changed detached evidence';assert.notEqual(historical[3].findings[0].evidence[0],detached[3].findings[0].evidence[0]);
 for(const base of historical)for(const mutate of [r=>r.checkerVersion='schematic-1.4.0',r=>r.checkerVersion='synthetic-future-emitter',r=>r.coverage.reverse(),r=>r.coverage[0].detail+=' alleged certification',r=>r.coverage[3].status='pass',r=>r.openings={total:1,checked:1,status:'pass'},r=>r.coverage.push({id:'hosted-openings',category:'automated-geometry',status:'pass',detail:'spoofed'})]){const bad=copy(base);mutate(bad);assert.throws(()=>module.validateReports([bad]));}
 for(const old of historical.slice(0,2)){const spoof=copy(old);spoof.anchoredReview=copy(frozen.anchoredReview);spoof.findings.push(...copy(frozen.findings.filter(f=>f.code.startsWith('anchor:'))));assert.throws(()=>module.validateReports([spoof]));}
 for(const old of historical.slice(0,3)){const spoof=copy(old);spoof.chains=copy(frozen.chains);spoof.findings.push(...copy(frozen.findings.filter(f=>f.code.startsWith('chain:'))));assert.throws(()=>module.validateReports([spoof]));}
 const modern=R.createReport({...options,anchoredReview:undefined,chainReview:undefined,geometryReport:{...options.geometryReport,issues:[{code:'unsupported-dimension-unit',ids:['synthetic-dimension']}]}});modern.coverage[1].status='not-checked';assert.throws(()=>module.validateReports([modern]),'1.3 dimension coverage must not gain legacy fallback after emitter changes');
}
console.log('PASS: frozen 1.3 output unchanged; saved 1.0–1.3 reports retain exact historical capabilities/matrices even with a synthetic future emitter; spoofed versions/fields reject.');
