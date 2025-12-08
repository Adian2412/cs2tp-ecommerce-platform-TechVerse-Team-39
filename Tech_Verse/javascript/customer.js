document.addEventListener('DOMContentLoaded', ()=>{
  // Prevent this script from initializing more than once (protects against duplicate script injection / reload loops)
  if(window.__tv_customer_init_done) return;
  window.__tv_customer_init_done = true;

  // Resolve API base for deployed environments (meta tag or global override)
  function tvApiBase(){
    try{
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    }catch(e){}
    return '';
  }
  const API_BASE = tvApiBase();

  const wrap = document.getElementById('listings');
  if(!wrap) {
    return;
  }

  // Search functionality
  window.__tv_searchTerm = '';
  const searchInput = document.getElementById('search-input');
  
  // Check for search query in URL (from other pages redirecting here)
  function getSearchFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  }
  
  // Initialize search from URL if present
  const urlSearchTerm = getSearchFromURL();
  if(urlSearchTerm) {
    window.__tv_searchTerm = urlSearchTerm.trim().toLowerCase();
    if(searchInput) {
      searchInput.value = urlSearchTerm; // Show the search term in the input
    }
  }
  
  if(searchInput) {
    // Prevent form submission on Enter
    searchInput.addEventListener('keydown', function(e) {
      if(e.key === 'Enter') {
        e.preventDefault();
        // Update URL with search term (without page reload)
        const term = searchInput.value.trim();
        const newUrl = term ? 
          `${window.location.pathname}?search=${encodeURIComponent(term)}` : 
          window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    });
    
    // Real-time search as user types
    searchInput.addEventListener('input', function(e) {
      window.__tv_searchTerm = e.target.value.trim().toLowerCase();
      render();
    });
  }

  const LISTINGS_KEY = 'techverse_listings_v1';
  const CACHE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes - products should be fresh for e-commerce
  const STALE_THRESHOLD_MS = 30 * 1000; // 30 seconds - refresh in background if older than this
  
  // Check if we should force refresh (e.g., coming from seller page after creating product)
  function shouldForceRefresh() {
    const params = new URLSearchParams(window.location.search);
    return params.get('refresh') === '1';
  }

  // Check if cached data is stale (needs refresh)
  function isCacheStale(cacheData) {
    if (!cacheData || !cacheData.timestamp) return true;
    const age = Date.now() - cacheData.timestamp;
    return age > CACHE_EXPIRY_MS;
  }

  // Check if cache should trigger background refresh (still valid but getting old)
  function shouldRefreshInBackground(cacheData) {
    if (!cacheData || !cacheData.timestamp) return true;
    const age = Date.now() - cacheData.timestamp;
    return age > STALE_THRESHOLD_MS;
  }

  // Try to fetch listings from a backend API. We don't modify backend; try a few common endpoints.
  async function tryFetchListingsFromServer(forceRefresh = false){
    // prevent concurrent or repeated fetches
    if(window.__tv_fetch_listings_in_progress) return false;
    window.__tv_fetch_listings_in_progress = true;

    const apiBase = API_BASE;
    const endpoints = [`${apiBase}/api/products`];
    const timeout = 5000; // 5 second timeout

    for(const ep of endpoints){
      try{

        const isCrossOrigin = /^https?:\/\//i.test(ep);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOpts = {
          signal: controller.signal
        };
        if(!isCrossOrigin) fetchOpts.credentials = 'same-origin'; else fetchOpts.credentials = 'include';

        const resp = await fetch(ep, fetchOpts);
        clearTimeout(timeoutId);

        if(!resp.ok) {
          continue;
        }

        const json = await resp.json();
        let list = null;
        // detect common structures
        if(Array.isArray(json)) list = json;
        else if(json && Array.isArray(json.data)) list = json.data;
        else if(json && Array.isArray(json.products)) list = json.products;
        else if(json && Array.isArray(json.items)) list = json.items;

        if(!list || !list.length) {
          continue;
        }

        // Normalize each item to our listing shape: { id, title, price, desc, images, category, user_id }
        const normalized = list.map(it => {
          const id = it.id || it._id || it.sku || it.slug || (it.title ? String(it.title).toLowerCase().replace(/\s+/g,'-') : undefined) || Math.random().toString(36).slice(2,9);
          const title = it.title || it.name || it.product_name || it.label || (`Product ${id}`);
          const price = (typeof it.price !== 'undefined') ? it.price : (typeof it.price_cents !== 'undefined' ? Number(it.price_cents)/100 : (it.price_str || null));
          const desc = it.desc || it.description || it.details || '';
          let images = [];
          if(Array.isArray(it.images)) images = it.images;
          else if(it.image) images = [it.image];
          else if(it.image_url) images = [it.image_url];
          const category = it.category || it.category_slug || it.cat || null;
          // Include user_id for ownership tracking (so users can only manage their own listings)
          const user_id = it.user_id || (it.user && it.user.id) || null;
          // Include updated_at if available for better sync tracking
          const updated_at = it.updated_at || it.updatedAt || null;
          return { id, title, price, desc, images, category, user_id, updated_at };
        });

        // Store with timestamp and metadata for freshness tracking
        const cacheData = {
          data: normalized,
          timestamp: Date.now(),
          version: '1.1' // version for future migrations
        };

        try{ 
          localStorage.setItem(LISTINGS_KEY, JSON.stringify(cacheData));
        }catch(e){
          // Silent failure
        }
        window.__tv_fetch_listings_in_progress = false;
        return true;
      } catch(e){
        window.__tv_fetch_listings_in_progress = false;
        continue;
      }
    }
    window.__tv_fetch_listings_in_progress = false;
    return false;
  }

  function loadListings(){
    try {
      const raw = localStorage.getItem(LISTINGS_KEY);
      if(!raw) return [];
      
      const parsed = JSON.parse(raw);
      
      // Handle legacy format (array directly) - migrate to new format
      if(Array.isArray(parsed)) {
        const cacheData = {
          data: parsed,
          timestamp: Date.now(),
          version: '1.1'
        };
        try {
          localStorage.setItem(LISTINGS_KEY, JSON.stringify(cacheData));
        } catch(e) {
          console.warn('Customer.js: Failed to migrate cache', e);
        }
        return parsed;
      }
      
      // New format with timestamp
      if(parsed && parsed.data && Array.isArray(parsed.data)) {
        // Always return cached data - let caller decide if refresh is needed
        // This prevents "No products" flash while fetching fresh data
        return parsed.data;
      }
      
      return [];
    } catch(e) {
      console.warn('Customer.js: Error loading listings from localStorage', e);
      return [];
    }
  }

  function saveListings(items){
    try {
      if(items && Array.isArray(items)) {
        const cacheData = {
          data: items,
          timestamp: Date.now(),
          version: '1.1'
        };
        localStorage.setItem(LISTINGS_KEY, JSON.stringify(cacheData));
      }
    } catch(e) {
      console.warn('Customer.js: Error saving listings to localStorage', e);
    }
  }

  // If there are no listings, seed some sample products so browse page is usable locally
  function seedSampleListings(){
    const sample = [
      { id: 'p-001', title: 'Wireless Headphones', price: 59.99, desc: 'Comfortable wireless headphones with 20h battery.', images: ['images/headphones.jpg'], category: 'audio' },
      { id: 'p-002', title: 'Bluetooth Speaker', price: 39.99, desc: 'Portable speaker with rich bass.', images: ['images/speaker.jpg'], category: 'audio' },
      { id: 'p-003', title: 'Mechanical Keyboard', price: 89.99, desc: 'RGB mechanical keyboard, tactile switches.', images: ['images/keyboard.jpg'], category: 'accessories' },
      { id: 'p-004', title: 'Smartwatch', price: 129.99, desc: 'Fitness tracking and notifications on your wrist.', images: ['images/watch.jpg'], category: 'wearables' },
      { id: 'p-005', title: 'USB-C Hub', price: 24.99, desc: 'Expand your laptop ports with HDMI and USB-A.', images: ['images/hub.jpg'], category: 'accessories' },
      { id: 'p-006', title: '4K Monitor', price: 279.99, desc: '27" 4K IPS display with HDR support.', images: ['images/monitor.jpg'], category: 'displays' }
    ];
    try {
      localStorage.setItem(LISTINGS_KEY, JSON.stringify(sample));
    } catch(e) {
      // Silent failure
    }
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  function render(){
    try {
      const items = loadListings();
      wrap.innerHTML='';

      if(!items || !items.length){
        wrap.innerHTML = '<p style="color:#666">No products listed yet.</p>';
        return;
      }

      // Filter by category
      let filtered = (window.__tv_currentCategory && window.__tv_currentCategory !== 'All') ?
        items.filter(it => it && it.category === window.__tv_currentCategory) : items;

      // Filter by search term
      if(window.__tv_searchTerm && window.__tv_searchTerm.length > 0) {
        const term = window.__tv_searchTerm;
        filtered = filtered.filter(it => {
          if(!it) return false;
          const title = (it.title || '').toLowerCase();
          const desc = (it.desc || '').toLowerCase();
          const category = (it.category || '').toLowerCase();
          return title.includes(term) || desc.includes(term) || category.includes(term);
        });
      }

      if(!filtered.length){
        const message = window.__tv_searchTerm ? 
          `No products found matching "${window.__tv_searchTerm}".` : 
          'No products in this category.';
        wrap.innerHTML = `<p style="color:#666">${message}</p>`;
        return;
      }

      filtered.slice().reverse().forEach(it=>{
        if(!it) return; // skip invalid items

        const card = document.createElement('div');
        card.className='product-card';
        card.style.background='#fff';
        card.style.borderRadius='8px';
        card.style.padding='12px';
        card.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';

        const img = document.createElement('img');
        img.src = (it.images && it.images[0] && it.images[0].image_path) ? it.images[0].image_path : 'images/placeholder.png';
        img.style.width='100%';
        img.style.height='160px';
        img.style.objectFit='cover';
        img.style.borderRadius='6px';
        img.onerror = function() { 
          this.onerror = null; // Prevent infinite loop if placeholder also fails
          this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="160" viewBox="0 0 200 160"%3E%3Crect fill="%23f0f0f0" width="200" height="160"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
        };

        const title = document.createElement('div');
        title.style.fontWeight='700';
        title.style.marginTop='8px';
        title.textContent = escapeHtml(it.title || 'Untitled Product');

        const price = document.createElement('div');
        price.style.color='#156082';
        price.style.fontWeight='600';
        const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ?
          window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
        price.textContent = fmt(it.price);

        const desc = document.createElement('div');
        desc.style.fontSize='13px';
        desc.style.color='#333';
        desc.style.marginTop='6px';
        desc.textContent = escapeHtml(it.desc || '');

        // show category badge (map slug -> name when available)
        if(it.category){
          const cat = document.createElement('div');
          cat.style.fontSize='12px';
          cat.style.color='#666';
          cat.style.marginTop='6px';
          const display = (window.TVCategories && typeof window.TVCategories.nameFor === 'function') ?
            window.TVCategories.nameFor(it.category) : it.category;
          cat.textContent = escapeHtml(display);
          card.appendChild(cat);
        }

        // make entire card clickable and link to product page with id
        const a = document.createElement('a');
        a.href = `product_page.html?id=${encodeURIComponent(it.id || 'unknown')}`;
        a.style.textDecoration = 'none';
        a.style.color = 'inherit';
        a.appendChild(img);
        a.appendChild(title);
        a.appendChild(price);
        a.appendChild(desc);

        // Add owner actions if user owns this product
        const currentUser = window.TechVerseAuth ? window.TechVerseAuth.getCurrentUser() : null;
        if(currentUser && it.user_id === currentUser.id){
          const actionsDiv = document.createElement('div');
          actionsDiv.style.display = 'flex';
          actionsDiv.style.gap = '4px';
          actionsDiv.style.marginTop = '8px';

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.style.fontSize = '12px';
          editBtn.style.padding = '4px 8px';
          editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirect to seller page or open edit modal
            window.location.href = 'seller.html';
          });
          actionsDiv.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.style.fontSize = '12px';
          deleteBtn.style.padding = '4px 8px';
          deleteBtn.style.backgroundColor = '#d00';
          deleteBtn.style.color = '#fff';
          deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if(!confirm('Delete this product? This will permanently remove it from the database.')) return;

            try{
              const apiBase = API_BASE;
              const resp = await fetch(`${apiBase}/api/products/${it.id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              if(resp.ok){
                alert('Product deleted successfully!');
                // Refresh the page to show updated listings
                location.reload();
              } else {
                const data = await resp.json();
                alert(data.error || 'Failed to delete product. You can only delete your own listings.');
              }
            }catch(err){
              alert('Network error: Failed to delete product');
            }
          });
          actionsDiv.appendChild(deleteBtn);

          card.appendChild(actionsDiv);
        }

        card.appendChild(a);
        wrap.appendChild(card);
      });
    } catch(e) {
      console.error('Customer.js: Error in render function', e);
      wrap.innerHTML = '<p style="color:#666">Error loading products. Please refresh the page.</p>';
    }
  }

  // Build category filter UI
  function renderCategories(){
    const container = document.getElementById('categories');
    if(!container) {
      console.warn('Customer.js: categories container not found');
      return;
    }
    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className='btn-ghost';
    allBtn.textContent='All';
    allBtn.dataset.slug = 'All';
    allBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.__tv_currentCategory='All';
      render();
      highlightCategory('All');
    });
    container.appendChild(allBtn);

    // prefer canonical list when available
    const cats = (window.TVCategories && typeof window.TVCategories.list === 'function') ? window.TVCategories.list() : null;
    if(cats && cats.length){
      cats.forEach(c=>{
        const b = document.createElement('button');
        b.className='btn-ghost';
        b.textContent = c.name;
        b.dataset.slug = c.slug;
        b.addEventListener('click', (e)=>{
          e.preventDefault();
          window.__tv_currentCategory = c.slug;
          render();
          highlightCategory(c.slug);
        });
        container.appendChild(b);
      });
    } else {
      // fallback: build from listings
      const items = loadListings();
      const set = new Set(items.map(i=>i.category).filter(Boolean));
      Array.from(set).sort().forEach(slug=>{
        const name = (window.TVCategories && window.TVCategories.nameFor) ? window.TVCategories.nameFor(slug) : slug;
        const b = document.createElement('button');
        b.className='btn-ghost';
        b.textContent = name;
        b.dataset.slug = slug;
        b.addEventListener('click', (e)=>{
          e.preventDefault();
          window.__tv_currentCategory = slug;
          render();
          highlightCategory(slug);
        });
        container.appendChild(b);
      });
    }

    // initial highlight
    if(!window.__tv_currentCategory) window.__tv_currentCategory = 'All';
    highlightCategory(window.__tv_currentCategory);
  }

  // migrate human-readable category names to canonical slugs when possible
  function migrateCategories(){
    try{
      const items = loadListings();
      if(!items || !items.length) return;
      if(!(window.TVCategories && typeof window.TVCategories.list === 'function')) return;
      const cats = window.TVCategories.list();
      let changed = false;
      items.forEach(it=>{
        if(!it.category) return;
        const found = window.TVCategories.find(it.category) || cats.find(c=>c.name && c.name.toLowerCase() === String(it.category).toLowerCase());
        if(found && found.slug !== it.category){ it.category = found.slug; changed = true; }
      });
      if(changed) saveListings(items);
    }catch(e){ console.warn('category migration failed', e); }
  }

  function highlightCategory(slug){
    const container = document.getElementById('categories'); if(!container) return;
    Array.from(container.children).forEach(ch=>{ const s = ch.dataset && ch.dataset.slug ? ch.dataset.slug : ch.textContent; ch.style.opacity = (s===slug) ? '1' : '0.65'; ch.style.transform = (s===slug)?'translateY(-1px)':''; });
  }

  // Background refresh function - updates cache without blocking UI
  async function backgroundRefresh() {
    if(window.__tv_fetch_listings_in_progress) return;
    
    try {
      const raw = localStorage.getItem(LISTINGS_KEY);
      if(raw) {
        const parsed = JSON.parse(raw);
        if(parsed && parsed.data && shouldRefreshInBackground(parsed)) {
          const refreshed = await tryFetchListingsFromServer();
          if(refreshed) {
            // Re-render with fresh data
            render();
          }
        }
      }
    } catch(e) {
      console.warn('Customer.js: Background refresh error', e);
    }
  }

  // Try to sync listings from server on load (best-effort)
  (async function initCustomerSync(){
    try{
      // Check if we should force refresh (e.g., new product created)
      const forceRefresh = shouldForceRefresh();
      if(forceRefresh) {
        try {
          localStorage.removeItem(LISTINGS_KEY);
        } catch(e) {}
        // Clean up the URL parameter
        const cleanUrl = window.location.pathname + (urlSearchTerm ? `?search=${encodeURIComponent(urlSearchTerm)}` : '');
        window.history.replaceState({}, '', cleanUrl);
      }
      
      // Check if we have cached data
      const cached = loadListings();
      const hasCachedData = cached && cached.length > 0;
      
      // Always try to fetch fresh data, but use cache immediately if available
      if(hasCachedData && !forceRefresh) {
        renderCategories();
        render();
        // Refresh in background without blocking
        tryFetchListingsFromServer().then(refreshed => {
          if(refreshed) {
            render(); // Re-render with fresh data
          }
        });
      } else {
        // No cache, stale cache, or force refresh - fetch immediately
        const ok = await tryFetchListingsFromServer();
        if(!ok) {
          seedSampleListings();
        }
        renderCategories();
        render();
      }
      
      // Set up periodic background refresh (every 2 minutes)
      setInterval(() => {
        backgroundRefresh();
      }, 2 * 60 * 1000);
      
      // Also refresh when page becomes visible (user returns to tab)
      document.addEventListener('visibilitychange', () => {
        if(!document.hidden) {
          backgroundRefresh();
        }
      });
      
    }catch(e){
      console.warn('Customer.js: Error during initialization, using sample data', e);
      seedSampleListings();
      renderCategories();
      render();
    }
  })();
});