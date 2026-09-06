const fs = require("fs");
const path = require("path");
(async () => {
  const sharp = require("sharp");
  const CUT_DIR = path.join(process.cwd(), "public", "images", "stage-cutouts");
  const files = fs.readdirSync(CUT_DIR).filter((f) => f.endsWith(".png"));
  let usedIds = new Set();
  try { const j = JSON.parse(fs.readFileSync("src/data/content/luminous-stage.json","utf8")); for (const s of j.slides||[]) for (const p of s.products||[]) if (p.id) usedIds.add(p.id); } catch {}
  const out = [];
  for (const f of files) {
    const id = f.replace(/\.png$/,"");
    const raw = await sharp(path.join(CUT_DIR,f)).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
    const {width:w,height:h,channels:c} = raw.info; const d = raw.data;
    const total=w*h;
    const A=(p)=>d[p*c+3];
    // flood transparent from border
    const vis=new Uint8Array(total); const st=[];
    const push=(p)=>{ if(!vis[p]&&A(p)<12){vis[p]=1;st.push(p);} };
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(st.length){const p=st.pop();const x=p%w,y=(p/w)|0;
      if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w);}
    // enclosed holes = transparent & !vis
    let holePx=0; const labels=new Int32Array(total).fill(-1); let comp=0;
    const sizes=[];
    for(let p=0;p<total;p++){
      if(A(p)<12 && !vis[p] && labels[p]===-1){
        let size=0; const q=[p]; labels[p]=comp;
        while(q.length){const cur=q.pop();size++;
          const x=cur%w,y=(cur/w)|0;
          const nb=[cur-1,cur+1,cur-w,cur+w];
          for(const n of nb){ if(n<0||n>=total)continue;
            const nx=n%w; if(Math.abs(nx-x)>1)continue;
            if(A(n)<12&&labels[n]===-1){labels[n]=comp;q.push(n);} } }
        sizes.push(size); holePx+=size; comp++;
      }
    }
    sizes.sort((a,b)=>b-a);
    out.push({ id, w, h, holePx, holePct:+(holePx/total*100).toFixed(2), holes:comp, biggest:sizes[0]||0, onStage:usedIds.has(id) });
  }
  fs.writeFileSync("hole-report.json", JSON.stringify(out,null,2));
  const affected=out.filter(o=>o.holePx>0);
  const significant=out.filter(o=>o.biggest>=40 || o.holePct>=0.3);
  console.log("cutouts:",out.length,"| with enclosed holes:",affected.length,"| significant damage:",significant.length);
  console.log("--- SIGNIFICANT ---");
  significant.sort((a,b)=>b.biggest-a.biggest).forEach(o=>console.log(`${o.id} | biggest-hole:${o.biggest}px | total:${o.holePx}px (${o.holePct}%) | holes:${o.holes} | ${o.w}x${o.h} | stage:${o.onStage}`));
})();
