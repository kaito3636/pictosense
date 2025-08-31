window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0];
    if(!f){ alert("❌ ファイルなし"); return; }

    let r=new FileReader();
    r.onload=ev=>{
      let img=new Image();
      img.onload=()=>{
        alert(`✅ 読み込めた: ${img.width}x${img.height}`);
      };
      img.onerror=()=>alert("❌ Image 読み込み失敗");
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  i.click();
};
