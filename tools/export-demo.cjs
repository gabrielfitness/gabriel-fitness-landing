// Optional delivery tool, not part of the deployed application.
// npm install --prefix /tmp/gfit-build esbuild
// NODE_PATH=/tmp/gfit-build/node_modules node tools/export-demo.cjs /absolute/output.html
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('Pass an absolute output HTML path');
(async () => {
  const model = fs.readFileSync(path.join(root, 'models/body-male-parametric.glb')).toString('base64');
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'modelo-3d.js')], bundle:true, write:false, format:'iife', minify:true,
    target:['es2020'], legalComments:'inline',
    plugins:[{name:'offline-demo',setup(build){
      build.onResolve({filter:/^three$/},()=>({path:path.join(root,'vendor/three/three.module.min.js')}));
      build.onResolve({filter:/^three\/addons\//},args=>({path:path.join(root,'vendor/three/addons',args.path.slice('three/addons/'.length))}));
      build.onLoad({filter:/modelo-3d\.js$/},args=>({loader:'js',resolveDir:root,
        contents:fs.readFileSync(args.path,'utf8').replace(
          "new URL('./models/body-male-parametric.glb', import.meta.url)",
          JSON.stringify('data:model/gltf-binary;base64,'+model))
      }));
    }}]
  });
  let html = fs.readFileSync(path.join(root,'modelo-3d.html'),'utf8');
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'')
    .replace(/<script type="module" src="\.\/modelo-3d.js"><\/script>/,'')
    .replace('<link rel="stylesheet" href="./modelo-3d.css">','<style>'+fs.readFileSync(path.join(root,'modelo-3d.css'),'utf8')+'</style>')
    .replaceAll('href="./index.html"','href="https://gabrielgfitness.com"');
  const licenses = fs.readFileSync(path.join(root,'vendor/three/LICENSE'),'utf8')+'\n\n'+
    fs.readFileSync(path.join(root,'THIRD_PARTY_ASSETS.md'),'utf8')+'\n\n'+
    fs.readFileSync(path.join(root,'models/licenses/MAKEHUMAN-CC0.md'),'utf8');
  html=html.replace('</body>',()=>'<script>'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>\n<!-- Third-party notices\n'+licenses.replaceAll('--','—')+'\n-->\n</body>');
  fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,html);
  console.log(`Offline demo: ${destination} (${Buffer.byteLength(html)} bytes)`);
})();
