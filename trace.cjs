const fs=require("fs");const path=require("path");const crypto=require("crypto");
(async()=>{
 const sharp=require("sharp");
 const ids=["yq-2759","yq-2008","yq-2380"];
 const md5=(b)=>crypto.createHash("md5").update(b).digest("hex");
 for(const id of ids){
   console.log("=== "+id+" ===");
   // 1) original asset
   let origPath=null;
   for(const e of [".png",".jpg",".jpeg",".webp"]){const c=path.join(process.cwd(),"public","images","products",id+e);if(fs.existsSync(c)){origPath=c;break;}}
   const origBuf=fs.readFileSync(origPath);
   const om=await sharp(origBuf).metadata();
   console.log("original:",path.basename(origPath),om.width+"x"+om.height,"md5:",md5(origBuf).slice(0,10));
   // 2) direct stage API
   let r=await fetch("http://localhost:3001/api/stage/cutout/"+id);
   const apiBuf=Buffer.from(await r.arrayBuffer());
   const am=await sharp(apiBuf).metadata();
   console.log("direct /api/stage/cutout:",r.status,r.headers.get("cache-control"),am.width+"x"+am.height,"md5:",md5(apiBuf).slice(0,10));
   // pixel-equal to original?
   const opix=await sharp(origBuf).rotate().ensureAlpha().raw().toBuffer();
   const apix=await sharp(apiBuf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const same=apix.info.width===om.width&&apix.info.height===om.height&&Buffer.compare(Buffer.from(opix),Buffer.from(apix.data))===0;
   console.log("  pixels identical to rotated original:",same?"YES":"NO");
   // 3) next/image optimized URL (the actual browser request)
   const url="/_next/image?url="+encodeURIComponent("/api/stage/cutout/"+id)+"&w=640&q=75";
   r=await fetch("http://localhost:3001"+url);
   const nBuf=Buffer.from(await r.arrayBuffer());
   const nm=await sharp(nBuf).metadata();
   console.log("_next/image:",r.status,r.headers.get("cache-control"),"content-type:",r.headers.get("content-type"),nm.width+"x"+nm.height,"md5:",md5(nBuf).slice(0,10));
 }
 // 4) next image cache entries for cutouts
 const ci=path.join(process.cwd(),".next","cache","images");
 if(fs.existsSync(ci)){
   let count=0,old=0;
   const walk=(d)=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk(p);else{count++;}}};
   walk(ci);console.log(".next/cache/images entries:",count);
 } else console.log("no .next/cache/images dir");
})();
