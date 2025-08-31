window.startUpload = function(){
  var i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.style.display='none';
  document.body.appendChild(i);

  i.onchange=function(ev){
    var f=ev.target.files[0];
    if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var cvs=document.querySelector('canvas');
        if(!cvs){alert('キャンバスが見つかりません');return;}
        var ctx=cvs.getContext('2d');
        ctx.drawImage(img,0,0,cvs.width,cvs.height);
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };

  i.click();
};
