// pictosense/draw.js
// ========== エントリ（ブクマから onload 後に呼ばれる） ==========
window.startUpload = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isHEIC = (file.type === 'image/heic') || /\.heic$/i.test(file.name) || file.type === 'application/octet-stream';
    if (isHEIC) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => heic2any({ blob: file, toType: 'image/jpeg' })
        .then(out => blobToDataURL(out).then(showOnOverlay))
        .catch(() => alert('HEIC変換に失敗しました'));
      document.body.appendChild(s);
    } else {
      const r = new FileReader();
      r.onload = ev => showOnOverlay(ev.target.result);
      r.readAsDataURL(file);
    }
  };
  input.click();
};

// ========== ユーティリティ ==========
function blobToDataURL(blob){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ev => res(ev.target.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function pickVisibleCanvas(){
  const cs = Array.from(document.querySelectorAll('canvas'));
  const visibles = cs.map(c=>{
    const r=c.getBoundingClientRect();
    return {c, area: Math.max(0,r.width)*Math.max(0,r.height), r};
  }).filter(x=>x.area>50*50);
  if(!visibles.length) return null;
  visibles.sort((a,b)=>b.area-a.area);
  return visibles
