window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0]; if(!f)return;
    let r=new FileReader();
    r.onload=ev=>{
      let img=new Image();
      img.onload=()=>{
        let c=document.querySelector('canvas');
        if(!c)return alert('キャンバスが見つかりません');
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  i.click();
};
