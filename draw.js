window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0]; 
    if(!f){ alert("❌ ファイルが選択されませんでした"); return; }
    alert("✅ ファイル選択できた: " + f.name);
  };
  i.click();
};
