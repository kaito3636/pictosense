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
        if(!c){alert("キャンバスが見つかりません");return;}
        let ctx=c.getContext('2d');
        ctx.clearRect(0,0,c.width,c.height);

        // スケール計算
        let scale=Math.min(c.width/img.width, c.height/img.height);
        let w=img.width*scale;
        let h=img.heigh
