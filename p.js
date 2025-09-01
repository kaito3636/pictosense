(function(){
  var d=document,i=d.createElement('input');
  i.type='file'; i.accept='image/*';
  i.onchange=function(e){
    var f=e.target.files&&e.target.files[0]; if(!f)return;
    var r=new FileReader();
    r.onload=function(v){
      window.__PX_DATAURL=v.target.result;
      var s=d.createElement('script');
      s.src='https://kaito3636.github.io/pd.js?'+Date.now();
      (d.body||d.documentElement).appendChild(s);
    };
    r.readAsDataURL(f);
  };
  i.click();
})();
