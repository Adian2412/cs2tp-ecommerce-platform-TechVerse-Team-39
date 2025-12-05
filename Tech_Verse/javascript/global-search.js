/**
 * Global Search - Works from any page with a search bar
 * Redirects to customer.html (browse page) with search query
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Find all search inputs (by placeholder text pattern or common selectors)
    const searchInputs = document.querySelectorAll(
      'input[placeholder*="Search"], input#search-input, input.search-input, input[type="search"]'
    );

    const isCustomerPage = window.location.pathname.includes('customer.html');

    searchInputs.forEach(function(input) {
      // Skip if this input already has customer.js handling it (on customer.html)
      if (isCustomerPage && input.id === 'search-input') {
        return; // Let customer.js handle this one
      }

      // Prevent form submission on Enter and redirect to browse page
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const term = input.value.trim();
          if (term) {
            // Redirect to customer.html with search parameter
            window.location.href = 'customer.html?search=' + encodeURIComponent(term);
          } else {
            // Empty search, just go to browse page
            window.location.href = 'customer.html';
          }
        }
      });

      // Optional: Add a visual cue that Enter will search
      input.setAttribute('title', 'Press Enter to search');
    });
  });
})();
