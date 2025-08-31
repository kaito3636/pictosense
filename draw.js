(function(){
    var i=document.createElement('input');
    i.type='file'; i.accept='image/*';
    i.style.position='fixed'; i.style.left='-9999px';
    document.body.appendChild(i);

    i.onchange=function(ev){
        var f=ev.target.files[0];
        if(!f){document.body.removeChild(i);return;}
        var r=new FileReader();
        r.onload=function(ev){
            var img=new Image();
            img.onload=function(){
                var cvs=document.querySelector('#cvs');
                if(!cvs){alert('キャンバスがありません');return;}
                var ctx=cvs.getContext('2d');
                ctx.drawImage(img,0,0,cvs.width,cvs.height);
            };
            img.src=ev.target.result;
        };
        r.readAsDataURL(f);
    };
    i.click();
})();
