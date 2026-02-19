document.addEventListener('DOMContentLoaded',function(){
  // small enhancement: highlight features on hover
  document.querySelectorAll('.feature').forEach(function(f){
    f.addEventListener('mouseover',()=>f.style.boxShadow='0 10px 30px rgba(16,24,40,0.08)');
    f.addEventListener('mouseout',()=>f.style.boxShadow='none');
  });
  // Using native <details>/<summary> for this page's accordions — no JS toggle required.
});
