document.addEventListener('DOMContentLoaded',function(){
  // progressive reveal for steps
  document.querySelectorAll('.step').forEach((s,i)=>{
    s.style.transition = 'transform 220ms ease, box-shadow 220ms ease';
    s.addEventListener('mouseover',()=>{s.style.transform='translateY(-4px)';s.style.boxShadow='0 10px 30px rgba(16,24,40,0.08)'});
    s.addEventListener('mouseout',()=>{s.style.transform='';s.style.boxShadow='none'});
  });
  // This page uses native <details>/<summary> accordions; no JS toggle required.
});

