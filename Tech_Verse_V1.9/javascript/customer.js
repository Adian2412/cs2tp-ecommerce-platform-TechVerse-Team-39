document.addEventListener('DOMContentLoaded', ()=>{
  const wrap = document.getElementById('listings');
  const LISTINGS_KEY = 'techverse_listings_v1';

  function loadListings(){
    const raw = localStorage.getItem(LISTINGS_KEY);
    if(!raw) return [];
    try{return JSON.parse(raw);}catch(e){return []}
  }

  // If there are no listings, seed some sample products so browse page is usable locally
  function seedSampleListings(){
    const existing = loadListings();
    if(existing && existing.length) return;
    const sample = [
      { id: 'p-001', title: 'Wireless Headphones', price: 59.99, desc: 'Comfortable wireless headphones with 20h battery.', images: ['images/headphones.jpg'], category: 'audio' },
      { id: 'p-002', title: 'Bluetooth Speaker', price: 39.99, desc: 'Portable speaker with rich bass.', images: ['images/speaker.jpg'], category: 'audio' },
      { id: 'p-003', title: 'Mechanical Keyboard', price: 89.99, desc: 'RGB mechanical keyboard, tactile switches.', images: ['images/keyboard.jpg'], category: 'accessories' },
      { id: 'p-004', title: 'Smartwatch', price: 129.99, desc: 'Fitness tracking and notifications on your wrist.', images: ['images/watch.jpg'], category: 'wearables' },
      { id: 'p-005', title: 'USB-C Hub', price: 24.99, desc: 'Expand your laptop ports with HDMI and USB-A.', images: ['images/hub.jpg'], category: 'accessories' },
      { id: 'p-006', title: '4K Monitor', price: 279.99, desc: '27" 4K IPS display with HDR support.', images: ['images/monitor.jpg'], category: 'displays' }
    ];
    try{ localStorage.setItem(LISTINGS_KEY, JSON.stringify(sample)); }catch(e){}
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  function render(){
    const items = loadListings();
    wrap.innerHTML='';
    if(!items.length){ wrap.innerHTML = '<p style="color:#666">No products listed yet.</p>'; return; }
    const filtered = (window.__tv_currentCategory && window.__tv_currentCategory !== 'All') ? items.filter(it => it.category === window.__tv_currentCategory) : items;
    filtered.slice().reverse().forEach(it=>{
      const card = document.createElement('div');
      card.className='product-card';
      card.style.background='#fff'; card.style.borderRadius='8px'; card.style.padding='12px'; card.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';
      const img = document.createElement('img'); img.src = (it.images&&it.images[0])||'images/placeholder.png'; img.style.width='100%'; img.style.height='160px'; img.style.objectFit='cover'; img.style.borderRadius='6px';
      const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginTop='8px'; title.textContent = it.title;
      const price = document.createElement('div'); price.style.color='#156082'; price.style.fontWeight='600';
      const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
      price.textContent = fmt(it.price);
      const desc = document.createElement('div'); desc.style.fontSize='13px'; desc.style.color='#333'; desc.style.marginTop='6px'; desc.textContent = it.desc;
      // show category badge (map slug -> name when available)
      if(it.category){ const cat = document.createElement('div'); cat.style.fontSize='12px'; cat.style.color='#666'; cat.style.marginTop='6px'; const display = (window.TVCategories && typeof window.TVCategories.nameFor === 'function') ? window.TVCategories.nameFor(it.category) : it.category; cat.textContent = display; card.appendChild(cat); }
      // make entire card clickable and link to product page with id
      const a = document.createElement('a');
      a.href = `product_page.html?id=${encodeURIComponent(it.id)}`;
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';
      a.appendChild(img); a.appendChild(title); a.appendChild(price); a.appendChild(desc);
      card.appendChild(a);
      wrap.appendChild(card);
    });
  }

  // Build category filter UI
  function renderCategories(){
    const container = document.getElementById('categories');
    if(!container) return;
    container.innerHTML = '';
    const allBtn = document.createElement('button'); allBtn.className='btn-ghost'; allBtn.textContent='All'; allBtn.dataset.slug = 'All';
    allBtn.addEventListener('click', ()=>{ window.__tv_currentCategory='All'; render(); highlightCategory('All'); });
    container.appendChild(allBtn);

    // prefer canonical list when available
    const cats = (window.TVCategories && typeof window.TVCategories.list === 'function') ? window.TVCategories.list() : null;
    if(cats && cats.length){
      cats.forEach(c=>{
        const b = document.createElement('button'); b.className='btn-ghost'; b.textContent = c.name; b.dataset.slug = c.slug;
        b.addEventListener('click', ()=>{ window.__tv_currentCategory = c.slug; render(); highlightCategory(c.slug); });
        container.appendChild(b);
      });
    } else {
      // fallback: build from listings
      const items = loadListings();
      const set = new Set(items.map(i=>i.category).filter(Boolean));
      Array.from(set).sort().forEach(slug=>{
        const name = (window.TVCategories && window.TVCategories.nameFor) ? window.TVCategories.nameFor(slug) : slug;
        const b = document.createElement('button'); b.className='btn-ghost'; b.textContent = name; b.dataset.slug = slug;
        b.addEventListener('click', ()=>{ window.__tv_currentCategory = slug; render(); highlightCategory(slug); });
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

  // init: migrate and render when categories are ready
  function initWhenReady(){
    if(window.TVCategories && typeof window.TVCategories.list === 'function'){
      migrateCategories();
      renderCategories();
      render();
    } else {
      // wait for categories module
      window.addEventListener('tvCategoriesReady', ()=>{ migrateCategories(); renderCategories(); render(); }, { once: true });
      // fallback: if categories never arrive, ensure we still render
      document.addEventListener('DOMContentLoaded', ()=>{ if(!window.TVCategories) { renderCategories(); render(); } }, { once: true });
    }
  }

  initWhenReady();

  function highlightCategory(slug){
    const container = document.getElementById('categories'); if(!container) return;
    Array.from(container.children).forEach(ch=>{ const s = ch.dataset && ch.dataset.slug ? ch.dataset.slug : ch.textContent; ch.style.opacity = (s===slug) ? '1' : '0.65'; ch.style.transform = (s===slug)?'translateY(-1px)':''; });
  }

  // Seed sample data if needed then render categories + items
  seedSampleListings();
  renderCategories();
  render();
});