window.startUpload = function(){
  let i=document.createElement('input');
  i.type='file'; 
  i.accept='image/*';
  i.onchange=e=>{
    let f=e.target.files[0]; if(!f)return;
    let r=new FileReader();
    r.onload=ev=>{
      // 画像表示用の要素
      let img=document.createElement('img');
      img.src=ev.target.result;
      img.style.maxWidth="90%";
      img.style.maxHeight="80vh";
      img.style.display="block";
      img.style.margin="20px auto";
      document.body.appendChild(img);

      // 決定ボタン
      let btn=document.createElement('button');
      btn.innerText="決定";
      btn.style.display="block";
      btn.style.margin="10px auto";
      document.body.appendChild(btn);

      // Cropper有効化
      let cropper=new Cropper(img,{
        aspectRatio:NaN,
        viewMode:1,
        autoCropArea:1
      });

      btn.onclick=()=>{
        let cvs=document.querySelector('canvas');
        if(!cvs){alert("キャンバスがありません");return;}
        let ctx=cvs.getContext('2d');
        ctx.clearRect(0,0,cvs.width,cvs.height);

        let cropped=cropper.getCroppedCanvas({width:cvs.width,height:cvs.height});
        ctx.drawImage(cropped,0,0,cvs.width,cvs.height);

        // UIを消す
        img.remove();
        btn.remove();
      };
    };
    r.readAsDataURL(f);
  };
  i.click();
};
