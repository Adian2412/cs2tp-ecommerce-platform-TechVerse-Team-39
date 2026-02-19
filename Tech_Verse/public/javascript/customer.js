document.addEventListener('DOMContentLoaded', async () => {
    const wrap        = document.getElementById('listings');
    const LISTINGS_KEY = 'techverse_listings_v1';

    // ── Helpers ───────────────────────────────────────────────────────────────
    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
    }

    function fmt(v) {
        if (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') {
            return window.tvCurrency.formatCurrency(v);
        }
        return '£' + Number(v).toFixed(2);
    }

    // ── Fetch from server ─────────────────────────────────────────────────────
    async function fetchProductsFromServer() {
        const res = await fetch('/api/products', { credentials: 'include' });
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        // Laravel paginator returns { data: [...] } or plain array
        return Array.isArray(data) ? data : (data.data || []);
    }

    // Normalise a server product into the same shape the render function expects
    function normaliseServerProduct(p) {
        return {
            id:       p.id,
            title:    p.name,
            price:    parseFloat(p.price || 0),
            desc:     p.description || '',
            images:   p.image_url ? [p.image_url] : [],
            category: p.category ? (p.category.slug || p.category_id) : null,
            _source:  'server',
        };
    }

    // ── LocalStorage fallback ─────────────────────────────────────────────────
    function loadLocalListings() {
        try { return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]'); } catch (e) { return []; }
    }

    function seedSampleListings() {
        if (loadLocalListings().length) return;
        const sample = [
            { id: 'p-001', title: 'Wireless Headphones',  price: 59.99,  desc: 'Comfortable wireless headphones with 20h battery.',      images: ['images/headphones.jpg'], category: 'audio' },
            { id: 'p-002', title: 'Bluetooth Speaker',     price: 39.99,  desc: 'Portable speaker with rich bass.',                       images: ['images/speaker.jpg'],    category: 'audio' },
            { id: 'p-003', title: 'Mechanical Keyboard',   price: 89.99,  desc: 'RGB mechanical keyboard, tactile switches.',              images: ['images/keyboard.jpg'],   category: 'accessories' },
            { id: 'p-004', title: 'Smartwatch',            price: 129.99, desc: 'Fitness tracking and notifications on your wrist.',       images: ['images/watch.jpg'],      category: 'wearables' },
            { id: 'p-005', title: 'USB-C Hub',             price: 24.99,  desc: 'Expand your laptop ports with HDMI and USB-A.',          images: ['images/hub.jpg'],        category: 'accessories' },
            { id: 'p-006', title: '4K Monitor',            price: 279.99, desc: '27" 4K IPS display with HDR support.',                   images: ['images/monitor.jpg'],    category: 'displays' },
        ];
        try { localStorage.setItem(LISTINGS_KEY, JSON.stringify(sample)); } catch (e) {}
    }

    // ── Render ────────────────────────────────────────────────────────────────
    let allProducts = [];

    function render(searchTerm) {
        wrap.innerHTML = '';
        if (!allProducts.length) {
            wrap.innerHTML = '<p style="color:#666">No products listed yet.</p>';
            return;
        }

        let filtered = allProducts;

        // Category filter
        if (window.__tv_currentCategory && window.__tv_currentCategory !== 'All') {
            filtered = filtered.filter(it => it.category === window.__tv_currentCategory);
        }

        // Search filter
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(it =>
                (it.title  && it.title.toLowerCase().includes(term)) ||
                (it.desc   && it.desc.toLowerCase().includes(term))
            );
        }

        if (!filtered.length) {
            wrap.innerHTML = '<p style="color:#666">No products match your search.</p>';
            return;
        }

        filtered.forEach(it => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = 'background:#fff;border-radius:8px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)';

            const img = document.createElement('img');
            img.src = (it.images && it.images[0]) || 'images/placeholder.png';
            img.style.cssText = 'width:100%;height:160px;object-fit:cover;border-radius:6px';

            const title = document.createElement('div');
            title.style.cssText = 'font-weight:700;margin-top:8px';
            title.textContent = it.title;

            const price = document.createElement('div');
            price.style.cssText = 'color:#156082;font-weight:600';
            price.textContent = fmt(it.price);

            const desc = document.createElement('div');
            desc.style.cssText = 'font-size:13px;color:#333;margin-top:6px';
            desc.textContent = it.desc;

            const a = document.createElement('a');
            a.href = `product_page.html?id=${encodeURIComponent(it.id)}`;
            a.style.cssText = 'text-decoration:none;color:inherit';
            a.appendChild(img); a.appendChild(title); a.appendChild(price); a.appendChild(desc);

            if (it.category) {
                const cat = document.createElement('div');
                cat.style.cssText = 'font-size:12px;color:#666;margin-top:6px';
                cat.textContent = (window.TVCategories && window.TVCategories.nameFor)
                    ? window.TVCategories.nameFor(it.category) : it.category;
                a.appendChild(cat);
            }

            card.appendChild(a);
            wrap.appendChild(card);
        });
    }

    // ── Search bar wiring ─────────────────────────────────────────────────────
    function wireSearchBar() {
        // Find any search input in the page (midnav or otherwise)
        const searchInputs = Array.from(document.querySelectorAll('input[type="text"]'))
            .filter(el => /search/i.test(el.placeholder || '') || /search/i.test(el.id || ''));

        searchInputs.forEach(input => {
            let debounceTimer;
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => render(input.value), 250);
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { clearTimeout(debounceTimer); render(input.value); }
            });
        });
    }

    // ── Category UI ───────────────────────────────────────────────────────────
    function renderCategories() {
        const container = document.getElementById('categories');
        if (!container) return;
        container.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'btn-ghost'; allBtn.textContent = 'All'; allBtn.dataset.slug = 'All';
        allBtn.addEventListener('click', () => { window.__tv_currentCategory = 'All'; render(); highlightCategory('All'); });
        container.appendChild(allBtn);

        const cats = (window.TVCategories && typeof window.TVCategories.list === 'function')
            ? window.TVCategories.list()
            : [...new Set(allProducts.map(p => p.category).filter(Boolean))].map(s => ({ slug: s, name: s }));

        cats.forEach(c => {
            const b = document.createElement('button');
            b.className = 'btn-ghost'; b.textContent = c.name; b.dataset.slug = c.slug;
            b.addEventListener('click', () => { window.__tv_currentCategory = c.slug; render(); highlightCategory(c.slug); });
            container.appendChild(b);
        });

        if (!window.__tv_currentCategory) window.__tv_currentCategory = 'All';
        highlightCategory(window.__tv_currentCategory);
    }

    function highlightCategory(slug) {
        const container = document.getElementById('categories');
        if (!container) return;
        Array.from(container.children).forEach(ch => {
            const s = ch.dataset.slug || ch.textContent;
            ch.style.opacity   = s === slug ? '1' : '0.65';
            ch.style.transform = s === slug ? 'translateY(-1px)' : '';
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    wrap.innerHTML = '<p style="color:#666">Loading products…</p>';

    try {
        const serverProducts = await fetchProductsFromServer();
        allProducts = serverProducts.map(normaliseServerProduct);
    } catch (e) {
        // Server not available — fall back to localStorage
        seedSampleListings();
        allProducts = loadLocalListings();
    }

    // Wait for categories module before rendering so category names resolve correctly
    function initWhenReady() {
        renderCategories();
        render();
        wireSearchBar();
    }

    if (window.TVCategories && typeof window.TVCategories.list === 'function') {
        initWhenReady();
    } else {
        window.addEventListener('tvCategoriesReady', initWhenReady, { once: true });
        // Fallback if categories never arrive
        setTimeout(() => { if (!window.TVCategories) initWhenReady(); }, 1500);
    }

    // Re-render with converted prices when exchange rates load
    window.addEventListener('tvCurrencyRatesReady', () => { try { render(); } catch (e) {} });
});
