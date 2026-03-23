document.addEventListener('DOMContentLoaded',function(){
  // reveal more details when a payment method is clicked
  document.querySelectorAll('.method').forEach(function(m){
    m.addEventListener('click',function(){
      const open = m.classList.toggle('active');
      if(open){
        m.style.borderColor = '#cfe8ff';
      } else {
        m.style.borderColor = '';
      }
    });
  });
  // This page uses native <details>/<summary> accordions; no JS toggle required.
});
