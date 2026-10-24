import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const scope=vm.createContext({validatePhotos:()=>{}});
vm.runInContext(fs.readFileSync(new URL('../src/original-overlay.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/layer-items.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/consistency-review.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/asset-records.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/measurement-anchors.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/measurement-chains.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/overlay-footprint.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/item-adjustments.js',import.meta.url),'utf8'),scope);
vm.runInContext(fs.readFileSync(new URL('../src/opening-bindings.js',import.meta.url),'utf8'),scope);
vm.runInContext(app.split('\n').find(line=>line.startsWith('function validProject(')),scope);
const project={schemaVersion:1,name:'Synthetic studio',revision:'v1',note:'',items:[],comments:[]};
assert.doesNotThrow(()=>scope.validProject(project),'Older projects do not require a brush setting');
const stroke={id:'sample-stroke',kind:'paint',x:10,y:20,points:[[0,0],[5,-5],[10,10]],color:'#2979d3',width:4};
const restored=JSON.parse(JSON.stringify({...project,items:[stroke],drawingStyle:{color:'#2979d3',width:4}}));
assert.doesNotThrow(()=>scope.validProject(restored));
for(const invalid of [{points:[]},{points:[[0,0]]},{points:[[0,0],[Infinity,2]]},{points:[[0,0],[1,2,3]]},{points:Array(6001).fill([0,0])},{color:'url(https://example.invalid)'},{color:undefined},{width:0},{width:21}]){
 assert.throws(()=>scope.validProject({...project,items:[{...stroke,...invalid}]}));
}
assert.throws(()=>scope.validProject({...project,drawingStyle:{color:'#2979d3',width:Infinity}}));
console.log('PASS: legacy imports, paint round trip, point limits, finite geometry, safe colors and brush bounds.');
