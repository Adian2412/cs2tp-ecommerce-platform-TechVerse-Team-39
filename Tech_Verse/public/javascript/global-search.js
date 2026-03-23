// global-search.js
// Wires the navbar search input (placeholder "Search..🔍") to navigate to
// customer.html with the search term pre-filled so customer.js can pick it up.

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'))
      .filter(el => /search/i.test(el.placeholder || ''));

    inputs.forEach(function (input) {
      function doSearch() {
        const term = (input.value || '').trim();
        if (!term) return;
        window.location.href = 'customer.html?search=' + encodeURIComponent(term);
      }

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
      });
    });

    // If we're already on customer.html, pull the param and apply it
    if (/customer\.html/.test(location.pathname) || location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const term = params.get('search');
      if (term) {
        inputs.forEach(function (input) { input.value = term; });
        // Let customer.js initialise first, then trigger search
        setTimeout(function () {
          if (window.TechVerseListings && typeof window.TechVerseListings.setSearch === 'function') {
            window.TechVerseListings.setSearch(term);
          }
        }, 300);
      }
    }
  });
})();
