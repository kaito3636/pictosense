(function(){
  var i=document.createElement('input');
  i.type='file';
  i.accept='image/*';
  i.style.position='fixed';
  i.style.left='-9999px';
  document.body.appendChild(i);

  i.onchange=function(e){
    var f=e.target.files[0];
    if(!f){document.body.removeChild(i);return;}
    var r=new FileReader();
    r.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var cvs=[].slice.call(document.querySelectorAll('canvas'));
        if(!cvs.length){alert("キャンバスが見つかりません");document.body.removeChild(i);return;}
        cvs.sort(function(a,b){return(b.width*b.height)-(a.width*a.height)});
        var c=cvs[0],ctx=c.getContext('2d');
        var s=Math.min(c.width/img.width,c.height/img.height);
        var w=img.width*s,h=img.height*s;
        var x=(c.width-w)/2,y=(c.height-h)/2;
        ctx.drawImage(img,x,y,w,h);
        document.body.removeChild(i);
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  i.click();
})();
