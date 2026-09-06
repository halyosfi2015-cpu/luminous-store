const fs=require("fs"); const path=require("path");
(async()=>{
  const sharp=require("sharp");
  const CUT=path.join(process.cwd(),"public","images","stage-cutouts");
  const ORIG=path.join(process.cwd(),"public","images","products");
  const OUT=path.join(process.cwd(),"cutout-evidence");
  fs.mkdirSync(OUT,{recursive:true});
  const ids=["yq-2759","yq-2008","yq-2380","yq-2556","yq-2788","yq-1524"];
  for(const id of ids){
    let origPath=null;
    for(const e of [".png",".jpg",".jpeg",".webp"]){const c=path.join(ORIG,id+e);if(fs.existsSync(c)){origPath=c;break;}}
    if(!origPath)continue;
    const H=420;
    const origBuf=await sharp(origPath).rotate().resize({height:H,fit:"inside"}).toBuffer();
    const om=await sharp(origBuf).metadata();
    // cutout composited over mid-gray to reveal shaved white edges clearly
    const cutBuf=await sharp(path.join(CUT,id+".png")).resize({height:H-20,fit:"inside"}).toBuffer();
    const cm=await sharp(cutBuf).metadata();
    const gap=24,labelH=28;
    const W=om.width+cm.width+gap*3;
    const canvas=sharp({create:{width:W,height:H+labelH+20,channels:3,background:"#f0eee9"}});
    const comp=canvas.composite([
      {input:origBuf,left:gap,top:labelH},
      {input:cutBuf,left:gap*2+om.width,top:labelH+10},
      {input:{text:{text:`ORIGINAL | CUTOUT (on gray)  ${id}`,font:"sans",dpi:100}},left:gap,top:4},
    ]);
    await comp.png().toFile(path.join(OUT,id+"-before-after.png"));
    console.log("wrote",id+"-before-after.png");
  }
})();
