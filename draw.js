(function(){
  // --- Cropper.css 読み込み ---
  let css=document.createElement('link');
  css.rel='stylesheet';
  css.href='https://unpkg.com/cropperjs/dist/cropper.min.css';
  document.head.appendChild(css);

  // --- Cropper.js 読み込み ---
  let js=document.createElement('script');
  js.src='https://unpkg.com/cropperjs/dist/cropper.min.js';
  js.onload=()=>{

    // ✅ Cropperロード完了後に実行する関数
    function startUpload(){
      let i=document.createElement('input');
      i.type='file';
      i.accept='image/*';
      i.onchange=e=>{
        let f=e.target.files[0]; if(!f)return;
        let r=new FileReader();
        r.onload=ev=>{
          // 元画像を表示
          let img=document.createElement('img');
          img.src=ev.target.result;
          img.style.maxWidth="90%";
          img.style.maxHeight="70vh";
          img.style.display="block";
          img.style.margin="20px auto";
          document.body.appendChild(img);

          // 決定ボタン
          let btn=document.createElement('button');
          btn.innerText="決定";
          btn.style.display="block";
          btn.style.margin="10px auto";
          document.body.appendChild(btn);

          // Cropper起動
          let cropper=new Cropper(img,{aspectRatio:NaN,viewMode:1,autoCropArea:1});

          btn.onclick=()=>{
            let cvs=document.querySelector('canvas');
            if(!cvs){alert("キャンバスが見つかりません");return;}
            let ctx=cvs.getContext('2d');
            ctx.clearRect(0,0,cvs.width,cvs.height);

            // トリミング結果をキャンバスへ描画
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
    }

    // 🚀 Cropper準備完了 → 画像選択を開始
    startUpload();
  };
  document.body.appendChild(js);
})();
