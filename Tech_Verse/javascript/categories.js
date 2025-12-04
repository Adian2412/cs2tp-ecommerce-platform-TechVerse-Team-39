// Client-side canonical category list (frontend seed)
(function(){
  const CATS = [
    { slug: 'audio', name: 'Audio', description: 'Headphones, speakers and earphones' },
    { slug: 'wearables', name: 'Wearables', description: 'Smartwatches and fitness trackers' },
    { slug: 'displays', name: 'Displays', description: 'Monitors and TVs' },
    { slug: 'computing', name: 'Computing', description: 'Laptops, desktops and components' },
    { slug: 'accessories', name: 'Accessories', description: 'Hubs, cables, keyboards, mice' },
    { slug: 'phones', name: 'Phones & Mobile', description: 'Smartphones and mobile accessories' },
    { slug: 'cameras', name: 'Cameras', description: 'Digital and action cameras plus lenses' },
    { slug: 'storage', name: 'Storage & Memory', description: 'SSDs, HDDs, memory cards and USB drives' },
    { slug: 'networking', name: 'Networking', description: 'Routers, mesh and network gear' },
    { slug: 'gaming', name: 'Gaming', description: 'Consoles, controllers and gaming peripherals' },
    { slug: 'smart-home', name: 'Smart Home', description: 'Smart bulbs, plugs and home automation' },
    { slug: 'office', name: 'Office', description: 'Printers, docking stations and office essentials' },
    { slug: 'software', name: 'Software & Subscriptions', description: 'Software licenses and subscriptions' },
    { slug: 'refurbished', name: 'Refurbished', description: 'Certified refurbished products' },
    { slug: 'clearance', name: 'Clearance', description: 'Discounted or clearance items' }
  ];

  function list(){ return CATS.slice(); }
  function find(slug){ return CATS.find(c=>c.slug===slug) || null; }
  function nameFor(slug){ const f = find(slug); return f ? f.name : slug || ''; }

  // expose
  window.TVCategories = { list, find, nameFor };

  // populate seller select if present
  function populateSellerSelect(){
    const sel = document.getElementById('item-category');
    if(!sel) return;
    // clear
    sel.innerHTML = '';
    const opt = document.createElement('option'); opt.value=''; opt.textContent='Select category'; sel.appendChild(opt);
    list().forEach(c=>{
      const o = document.createElement('option'); o.value = c.slug; o.textContent = c.name; sel.appendChild(o);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    populateSellerSelect();
    // dispatch ready event for other scripts
    const ev = new Event('tvCategoriesReady');
    window.dispatchEvent(ev);
  });
})();
