window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0];
    if(!f){ alert("❌ ファイルなし"); return; }

    // HEIC判定
    if(f.type==="image/heic" || f.name.endsWith(".heic")){
      let s=document.createElement('script');
      s.src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload=()=>{
        heic2any({blob:f,toType:"image/jpeg"}).then(outBlob=>{
          let r=new FileReader();
          r.onload=ev=>drawToCanvas(ev.target.result);
          r.readAsDataURL(outBlob);
        });
      };
      document.body.appendChild(s);
    } else {
      let r=new FileReader();
      r.onload=ev=>drawToCanvas(ev.target.result);
      r.readAsDataURL(f);
    }
  };
  i.click();
};

function drawToCanvas(src){
  let img=new Image();
  img.onload=()=>{
    let c=document.querySelector('canvas');
    if(!c){alert("キャンバスなし");return;}
    let ctx=c.getContext('2d');
    ctx
