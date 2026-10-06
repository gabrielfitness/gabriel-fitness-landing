// Development-only: npm install --prefix /tmp/gfit-qa three@0.180.0 three-mesh-bvh gltf-validator
// NODE_PATH=/tmp/gfit-qa/node_modules node tools/verify-geometry.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const THREE = require('three');
const { MeshBVH } = require('three-mesh-bvh');
const validator = require('gltf-validator');
const root = path.resolve(__dirname, '..');
function readGLB(name) {
  const bytes = fs.readFileSync(path.join(root, 'models', name));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length));
  const binary = bytes.subarray(28 + length);
  const raw = i => {
    const v = json.bufferViews[json.accessors[i].bufferView];
    return binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  };
  const attr = i => {
    const b = raw(i), copy = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    return json.accessors[i].componentType === 5126 ? new Float32Array(copy) : new Uint16Array(copy);
  };
  return { bytes, json, raw, attr };
}
(async () => {
  const { morphWeights, sliderToParameter } = await import(pathToFileURL(path.join(root, 'modelo-3d-morphs.js')));
  const original = readGLB('body-male.glb'), model = readGLB('body-male-parametric.glb');
  for (const i of [0, 1, 2]) assert(original.raw(i).equals(model.raw(i)), 'M1 buffer unchanged: ' + i);
  const gltfReport = await validator.validateBytes(new Uint8Array(model.bytes));
  assert.equal(gltfReport.issues.numErrors, 0); assert.equal(gltfReport.issues.numWarnings, 0);
  const pos = model.attr(0), indices = model.attr(2);
  const targets = model.json.meshes[0].primitives[0].targets.map(t => model.attr(t.POSITION));
  assert.equal(targets.length, 8);
  assert.equal(pos.length / 3, 13380); assert.equal(indices.length / 3, 26756);
  function shape(fat, muscle) {
    const result = pos.slice(), weights = morphWeights(fat, muscle);
    assert(weights.every(w => w >= 0 && w <= 1));
    assert(weights.reduce((a,b) => a+b, 0) <= 1.000001);
    weights.forEach((w,k) => { if (w) for (let i=0;i<pos.length;i++) result[i] += targets[k][i]*w; });
    assert(result.every(Number.isFinite));
    return result;
  }
  assert.deepEqual(shape(0.5,0.5),pos, 'Neutral is exactly M1');
  function intersections(p) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(p,3));
    geometry.setIndex(new THREE.BufferAttribute(indices.slice(),1));
    const tree = new MeshBVH(geometry,{indirect:true});
    const hits=[];
    tree.bvhcast(tree,new THREE.Matrix4(),{intersectsTriangles:(a,b,ia,ib)=>{
      const i=tree.resolveTriangleIndex(ia),j=tree.resolveTriangleIndex(ib);
      if(i>=j)return false;
      const ai=[indices[i*3],indices[i*3+1],indices[i*3+2]],bi=[indices[j*3],indices[j*3+1],indices[j*3+2]];
      if(ai.some(id=>bi.includes(id)))return false; // shared edges/vertices are expected
      if(a.intersectsTriangle(b))hits.push(i+':'+j);
      return false;
    }});
    geometry.dispose(); return hits.sort();
  }
  const baseline=intersections(pos), baselineSet=new Set(baseline);
  const rows=[]; let minArea=Infinity, maxEdgeRatio=0, minEdgeRatio=Infinity;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3();
  for(let f=0;f<=100;f+=10)for(let m=0;m<=100;m+=10){
    const p=shape(sliderToParameter(f),sliderToParameter(m));
    const hits=intersections(p), added=hits.filter(pair=>!baselineSet.has(pair));
    assert.equal(added.length,0,`New self-intersections at sliders ${f}/${m}: ${added}`);
    let maxDelta=0;
    for(let i=0;i<p.length;i+=3)maxDelta=Math.max(maxDelta,Math.hypot(p[i]-pos[i],p[i+1]-pos[i+1],p[i+2]-pos[i+2]));
    for(let t=0;t<indices.length;t+=3){
      const i=indices[t]*3,j=indices[t+1]*3,k=indices[t+2]*3;
      a.fromArray(p,i);b.fromArray(p,j);c.fromArray(p,k);
      const area=cross.crossVectors(b.clone().sub(a),c.clone().sub(a)).length()/2;
      assert(area>1e-12,`Collapsed triangle ${t/3} at ${f}/${m}`);minArea=Math.min(minArea,area);
      for(const [u,v] of [[i,j],[j,k],[k,i]]){
        const before=Math.hypot(pos[u]-pos[v],pos[u+1]-pos[v+1],pos[u+2]-pos[v+2]);
        const after=Math.hypot(p[u]-p[v],p[u+1]-p[v+1],p[u+2]-p[v+2]);
        maxEdgeRatio=Math.max(maxEdgeRatio,after/before);minEdgeRatio=Math.min(minEdgeRatio,after/before);
      }
    }
    rows.push({fatSlider:f,muscleSlider:m,maxDeltaMeters:maxDelta,selfIntersectionPairs:hits.length,newIntersections:added.length});
  }
  let maxStep=0;
  for(const other of [0,50,100])for(const axis of ['fat','muscle']){
    let previous;
    for(let i=0;i<=100;i++){
      const p=shape(sliderToParameter(axis==='fat'?i:other),sliderToParameter(axis==='muscle'?i:other));
      if(previous)for(let j=0;j<p.length;j+=3)maxStep=Math.max(maxStep,Math.hypot(p[j]-previous[j],p[j+1]-previous[j+1],p[j+2]-previous[j+2]));
      previous=p;
    }
  }
  assert(maxStep<0.01,'No vertex jumps >1cm per slider tick');
  const report={date:'2026-10-06',vertices:pos.length/3,triangles:indices.length/3,morphTargets:targets.length,
    exactM1BaseBuffers:true,gltfValidator:gltfReport.issues,
    sampledCombinations:rows.length,baselineContactTrianglePairs:baseline,
    baselineNote:'Eight internal mouth contact pairs already present in M1; no new non-adjacent triangle intersections in 121 sampled combinations. Not a mathematical proof over all real-valued states.',
    minTriangleAreaSquareMeters:minArea,minEdgeLengthRatio:minEdgeRatio,maxEdgeLengthRatio:maxEdgeRatio,
    maxVertexDisplacementPerSliderTickMeters:maxStep,states:rows};
  fs.writeFileSync(path.join(root,'docs/milestone-2-geometry.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,states:undefined},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
