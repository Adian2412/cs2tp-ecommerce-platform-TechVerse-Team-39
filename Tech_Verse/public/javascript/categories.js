// categories.js
// Tries to load categories from the server API first.
// Falls back to the hardcoded list if the API is unavailable (local dev).
(function () {

    const FALLBACK_CATS = [
        { slug: 'audio',        name: 'Audio',                description: 'Headphones, speakers and earphones' },
        { slug: 'wearables',    name: 'Wearables',            description: 'Smartwatches and fitness trackers' },
        { slug: 'displays',     name: 'Displays',             description: 'Monitors and TVs' },
        { slug: 'computing',    name: 'Computing',            description: 'Laptops, desktops and components' },
        { slug: 'accessories',  name: 'Accessories',          description: 'Hubs, cables, keyboards, mice' },
        { slug: 'phones',       name: 'Phones & Mobile',      description: 'Smartphones and mobile accessories' },
        { slug: 'cameras',      name: 'Cameras',              description: 'Digital and action cameras plus lenses' },
        { slug: 'storage',      name: 'Storage & Memory',     description: 'SSDs, HDDs, memory cards and USB drives' },
        { slug: 'networking',   name: 'Networking',           description: 'Routers, mesh and network gear' },
        { slug: 'gaming',       name: 'Gaming',               description: 'Consoles, controllers and gaming peripherals' },
        { slug: 'smart-home',   name: 'Smart Home',           description: 'Smart bulbs, plugs and home automation' },
        { slug: 'office',       name: 'Office',               description: 'Printers, docking stations and office essentials' },
        { slug: 'software',     name: 'Software & Subscriptions', description: 'Software licenses and subscriptions' },
        { slug: 'refurbished',  name: 'Refurbished',          description: 'Certified refurbished products' },
        { slug: 'clearance',    name: 'Clearance',            description: 'Discounted or clearance items' },
    ];

    let cats = FALLBACK_CATS.slice();

    function list()        { return cats.slice(); }
    function find(slug)    { return cats.find(c => c.slug === slug) || null; }
    function nameFor(slug) { const f = find(slug); return f ? f.name : slug || ''; }

    window.TVCategories = { list, find, nameFor };

    function populateSellerSelect() {
        const sel = document.getElementById('item-category');
        if (!sel) return;
        sel.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'Select category';
        sel.appendChild(opt);
        list().forEach(c => {
            const o = document.createElement('option');
            o.value = c.slug; o.textContent = c.name;
            sel.appendChild(o);
        });
    }

    function dispatchReady() {
        populateSellerSelect();
        window.dispatchEvent(new Event('tvCategoriesReady'));
    }

    async function loadFromServer() {
        try {
            const res = await fetch('/api/categories', { credentials: 'include' });
            if (!res.ok) throw new Error('not ok');
            const data = await res.json();
            // API returns an array directly or a paginated {data:[...]} shape
            const items = Array.isArray(data) ? data : (data.data || []);
            if (items.length) {
                cats = items.map(c => ({
                    slug:        c.slug,
                    name:        c.name,
                    description: c.description || '',
                }));
            }
        } catch (e) {
            // Server not available — keep fallback list
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await loadFromServer();
        dispatchReady();
    });

})();
