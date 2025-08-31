window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0];
    if(!f){ alert("❌ ファイルなし"); return; }

    // HEIC なら変換
    if(f.type==="image/heic" || f.name.toLowerCase().endsWith(".heic")){
      let s=document.createElement('script');
      s.src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload=()=>{
        heic2any({blob:f,toType:"image/jpeg"}).then(outBlob=>{
          let r=new FileReader();
          r.onload=ev=>showImage(ev.target.result);
          r.readAsDataURL(outBlob);
        }).catch(err=>alert("❌ HEIC変換失敗: "+err));
      };
      document.body.appendChild(s);
    } else {
      // JPEG / PNG はそのまま
      let r=new FileReader();
      r.onload=ev=>showImage(ev.target.result);
      r.readAsDataURL(f);
    }
  };
  i.click();
};

// 実際にキャンバスへ描画
function showImage(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);

    // 縦横比を維持して中央表示
    let scale=Math.min(c.width/img.width, c.height/img.height);
    let w=img.width*scale, h=img.height*scale;
    let x=(c.width-w)/2, y=(c.height-h)/2;

    alert(`✅ 読み込めた: ${img.width}x${img.height}, draw=${w}x${h}`);
    ctx.drawImage(img,x,y,w,h);
  };
  img.onerror=()=>alert("❌ 画像の読み込みに失敗しました");
  img.src=src;
}
