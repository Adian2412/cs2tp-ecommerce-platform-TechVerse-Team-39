document.addEventListener('DOMContentLoaded', function () {
  // Accessible collapsible panels: collapsed by default
  document.querySelectorAll('.collapsible').forEach(function (block) {
    const h3 = block.querySelector('h3');
    if (!h3) return;

    // make heading focusable and expose as a button to assistive tech
    h3.tabIndex = 0;
    h3.setAttribute('role', 'button');
    h3.setAttribute('aria-expanded', 'false');

    // hide content initially (everything except the heading)
    const contentElems = Array.from(block.children).filter(function (c) { return c !== h3; });
    contentElems.forEach(function (e) { e.style.display = 'none'; });

    function toggle() {
      const open = block.classList.toggle('open');
      h3.setAttribute('aria-expanded', open ? 'true' : 'false');
      contentElems.forEach(function (e) { e.style.display = open ? '' : 'none'; });
    }

    h3.addEventListener('click', toggle);
    h3.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        toggle();
      }
    });
  });

  // Add quick contact button
  const btn = document.createElement('button');
  btn.className = 'support-contact';
  btn.textContent = 'Contact Support';
  btn.addEventListener('click', function () {
    window.location.href = 'mailto:support@techverse.example';
  });
  document.body.appendChild(btn);
});
