(function(){
  // Cropper.js の CSS 読み込み
  let css=document.createElement('link');
  css.rel='stylesheet';
  css.href='https://unpkg.com/cropperjs/dist/cropper.min.css';
  document.head.appendChild(css);

  // Cropper.js の JS 読み込み
  let js=document.createElement('script');
  js.src='https://unpkg.com/cropperjs/dist/cropper.min.js';
  js.onload=()=>{

    // 画像選択ダイアログ
    let i=document.createElement('input');
    i.type='file';
    i.accept='image/*';
    i.onchange=e=>{
      let f=e.target.files[0]; if(!f)return;
      let r=new FileReader();
      r.onload=ev=>{
        // 画像表示
        let img=document.createElement('img');
        img.src=ev.target.result;
        img.style.maxWidth="90%";
        img.style.maxHeight="70vh";
        img.style.display="block";
        img.style.margin="20px auto";
        img.id="crop-target";
        document.body.appendChild(img);

        // 決定ボタン
        let
