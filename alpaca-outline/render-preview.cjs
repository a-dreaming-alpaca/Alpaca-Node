// Render this authored Canvas study locally without a browser or wallpaper process.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const runtime=path.join(process.env.USERPROFILE,'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','@napi-rs','canvas');
const {createCanvas,GlobalFonts}=require(runtime);
GlobalFonts.registerFromPath(path.join(process.env.SystemRoot,'Fonts','consola.ttf'),'Consolas');
const html=fs.readFileSync(path.join(__dirname,'preview.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const character=createCanvas(420,560);
character.getBoundingClientRect=()=>({width:420,height:560});
const controls={};
for(const id of ['binary','symbols','background','export'])controls[id]={setAttribute(){}};
let exported;
const document={
  getElementById:id=>id==='character'?character:controls[id],
  createElement:tag=>tag==='canvas'?createCanvas(420,560):{click(){exported=this.href;}},
  body:{classList:{toggle(){}}},
  fonts:{ready:{then(){}}}
};
vm.runInNewContext(code,{document,window:{devicePixelRatio:2},ResizeObserver:class{observe(){}},console});
function save(filename){
  controls.export.onclick();
  fs.writeFileSync(path.join(__dirname,filename),Buffer.from(exported.split(',')[1],'base64'));
  console.log(filename);
}
save('alpaca-binary-dark.png');
controls.background.onclick();save('alpaca-binary-light.png');
controls.background.onclick();controls.symbols.onclick();save('alpaca-symbols-dark.png');
