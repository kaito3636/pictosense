window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file'; i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0]; if(!f)return;
    let r=new FileReader();
    r.onload=ev=>{
      let img=document.createElement('img');
      img.src=ev.target.result;
      document.body.appendChild(img);

      // Cropper.jsでトリミングUI開始
      let cropper=new Cropper(img,{
        aspectRatio:NaN, // 自由
        viewMode:1,
        autoCropArea:1,
      });

      // 決定ボタン
      let btn=document.createElement('button');
      btn.innerText="決定";
      btn.onclick=()=>{
        let cvs=document.querySelector('canvas');
        let ctx=cvs.getContext('2d');
        ctx.clearRect(0,0,cvs.width,cvs.height);

        let cropped=cropper.getCroppedCanvas({width:cvs.width,height:cvs.height});
        ctx.drawImage(cropped,0,0,cvs.width,cvs.height);

        // UIを消す
        img.remove();
        btn.remove();
      };
      document.body.appendChild(btn);
    };
    r.readAsDataURL(f);
  };
  i.click();
};
