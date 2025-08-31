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

        // 縦横比を維持して「キャンバス内に収まる」よう縮小
        let scale=Math.min(c.width/img.width, c.height/img.height);
        let w=img.width*scale;
        let h=img.height*scale;

        // 中央配置
        let x=(c.width-w)/2;
        let y=(c.height-h)/2;

        ctx.drawImage(img,x,y,w,h);
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  i.click();
};
``
