const fs=require("fs"); const path=require("path");
(async()=>{
  const sharp=require("sharp");
  const CUT=path.join(process.cwd(),"public","images","stage-cutouts");
  const ORIG=path.join(process.cwd(),"public","images","products");
  const files=fs.readdirSync(CUT).filter(f=>f.endsWith(".png"));
  let usedIds=new Set();
  try{const j=JSON.parse(fs.readFileSync("src/data/content/luminous-stage.json","utf8"));for(const s of j.slides||[])for(const p of s.products||[])if(p.id)usedIds.add(p.id);}catch{}
  const out=[];
  for(const f of files){
    const id=f.replace(/\.png$/,"");
    // find original (any ext)
    let origPath=null;
    for(const e of [".png",".jpg",".jpeg",".webp"]){const c=path.join(ORIG,id+e);if(fs.existsSync(c)){origPath=c;break;}}
    // also check summaries gallery path
    if(!origPath){
      try{const m=require("./src/data/product-summaries.ts");}catch{}
    }
    if(!origPath){out.push({id,status:"no-original"});continue;}
    try{
      // ORIGINAL product bbox = non-near-white pixels
      const o=await sharp(origPath).rotate().ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const ow=o.info.width,oh=o.info.height,oc=o.info.channels,od=o.data;
      const nw=(i)=>{const r=od[i],g=od[i+1],b=od[i+2];return r>=238&&g>=236&&b>=232&&Math.abs(r-g)<14&&Math.abs(g-b)<16&&Math.abs(r-b)<18;};
      let ox0=ow,oy0=oh,ox1=-1,oy1=-1;
      for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){if(!nw((y*ow+x)*oc)){if(x<ox0)ox0=x;if(x>ox1)ox1=x;if(y<oy0)oy0=y;if(y>oy1)oy1=y;}}
      if(ox1<0){out.push({id,status:"all-white-original"});continue;}
      const oW=ox1-ox0+1,oH=oy1-oy0+1;
      // CUTOUT solid bbox (alpha>=250)
      const c=await sharp(path.join(CUT,f)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const cw=c.info.width,ch=c.info.height,cc=c.info.channels,cd=c.data;
      let cx0=cw,cy0=ch,cx1=-1,cy1=-1;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(cd[(y*cw+x)*cc+3]>=250){if(x<cx0)cx0=x;if(x>cx1)cx1=x;if(y<cy0)cy0=y;if(y>cy1)cy1=y;}}
      if(cx1<0){out.push({id,status:"empty-cutout"});continue;}
      const cW=cx1-cx0+1,cH=cy1-cy0+1;
      // expected: cutout bbox ? product bbox + 6px padding each side (minus shaved edges)
      const shaveX=(oW+12)-cW, shaveY=(oH+12)-cH;
      const shaveXPct=+(shaveX/(oW)*100).toFixed(1), shaveYPct=+(shaveY/(oH)*100).toFixed(1);
      // feathered (dimmed) pixel count
      let dimmed=0;
      for(let p=0;p<cw*ch;p++){const a=cd[p*cc+3];if(a>12&&a<235)dimmed++;}
      out.push({id,status:"ok",oW,oH,cW,cH,shaveX,shaveY,shaveXPct,shaveYPct,dimmed,onStage:usedIds.has(id)});
    }catch(e){out.push({id,status:"err:"+e.message.slice(0,50)});}
  }
  fs.writeFileSync("edge-report.json",JSON.stringify(out,null,2));
  const ok=out.filter(r=>r.status==="ok");
  // damage: any dimension shaved >=4% relative to product size
  const damaged=ok.filter(r=>r.shaveXPct>=4||r.shaveYPct>=4);
  console.log("ok:",ok.length,"| damaged(shave>=4%):",damaged.length);
  console.log("--- DAMAGED ---");
  damaged.sort((a,b)=>Math.max(b.shaveXPct,b.shaveYPct)-Math.max(a.shaveXPct,a.shaveYPct)).forEach(r=>
    console.log(`${r.id} | X-${r.shaveXPct}% (${r.shaveX}px) Y-${r.shaveYPct}% (${r.shaveY}px) | dimmed:${r.dimmed}px | orig ${r.oW}x${r.oH} | stage:${r.onStage}`));
})();
