window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0];
    if(!f){ alert("❌ ファイルなし"); return; }

    // HEICはJPEGへ変換
    if(f.type==="image/heic" || f.name.toLowerCase().endsWith(".heic")){
      let s=document.createElement('script');
      s.src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload=()=>{
        heic2any({blob:f,toType:"image/jpeg"}).then(outBlob=>{
          let r=new FileReader();
          r.onload=ev=>showImage(ev.target.result);
          r.readAsDataURL(outBlob);
        });
      };
      document.body.appendChild(s);
    } else {
      let r=new FileReader();
      r.onload=ev=>showImage(ev.target.result);
      r.readAsDataURL(f);
    }
  };
  i.click();
};

function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // キャンバスに収まるよう縮小（拡大禁止）
    let scale=Math.min(c.width/img.width, c.height/img.height, 1);
    let w=img.width*scale, h=img.height*scale;
    let x=(c.width-w)/2, y=(c.height-h)/2;

    ctx.drawImage(img,x,y,w,h);
  };
  img.src=src;
}
