// account.js - wired to Laravel backend
document.addEventListener('DOMContentLoaded', async () => {

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // ── Load current user from session and populate profile fields ────────────
    const nameEl  = document.getElementById('acc-name');
    const emailEl = document.getElementById('acc-email');

    let currentUser = null;

    try {
        const res = await fetch('/api/auth/me', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
            },
        });
        if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
                currentUser = data.user;
                if (nameEl)  nameEl.value  = currentUser.name  || '';
                if (emailEl) emailEl.value = currentUser.email || '';
            }
        }
    } catch (e) {
        console.warn('Could not load user session:', e);
    }

    // If not logged in, redirect to sign in
    if (!currentUser) {
        location.href = 'signin.html';
        return;
    }

    // ── Save profile (placeholder - backend endpoint not yet implemented) ─────
    document.getElementById('save-account').addEventListener('click', () => {
        // TODO: wire to PUT /api/user when that endpoint is built
        alert('Profile saving is not yet connected to the backend.');
    });

    // ── Change password (placeholder) ─────────────────────────────────────────
    document.getElementById('change-pass').addEventListener('click', () => {
        const cur = document.getElementById('acc-curpass').value;
        const nw  = document.getElementById('acc-newpass').value;
        if (!nw) { alert('Enter a new password.'); return; }
        // TODO: wire to password change endpoint when built
        alert('Password change is not yet connected to the backend.');
        document.getElementById('acc-curpass').value = '';
        document.getElementById('acc-newpass').value = '';
    });

    // ── Sign out ──────────────────────────────────────────────────────────────
    const signoutBtn = document.getElementById('signout');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                });
            } catch (e) { /* ignore */ }
            location.href = 'index.html';
        });
    }

    // ── Sell a product ────────────────────────────────────────────────────────
    const sellBtn = document.getElementById('sell-product');
    if (sellBtn) sellBtn.addEventListener('click', () => { location.href = 'seller.html'; });

    // ── My Listings (localStorage - seller backend not yet built) ─────────────
    const LISTINGS_KEY   = 'techverse_listings_v1';
    const accountListWrap = document.getElementById('account-listings');

    function loadListings() {
        try { return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveListings(items) {
        localStorage.setItem(LISTINGS_KEY, JSON.stringify(items));
    }

    function renderAccountListings() {
        const items = loadListings();
        accountListWrap.innerHTML = '';
        if (!items.length) {
            accountListWrap.innerHTML = '<p class="muted">You have no listings yet.</p>';
            return;
        }
        items.slice().reverse().forEach(it => {
            const card    = document.createElement('div'); card.className = 'listing-card';
            const img     = document.createElement('img'); img.className = 'listing-thumb'; img.src = (it.images && it.images[0]) || '';
            const info    = document.createElement('div'); info.className = 'listing-info';
            const title   = document.createElement('div'); title.className = 'listing-title'; title.textContent = it.title;
            const price   = document.createElement('div'); price.className = 'listing-price'; price.textContent = it.price;
            const meta    = document.createElement('div'); meta.className  = 'listing-meta';  meta.textContent  = it.desc || '';
            const actions = document.createElement('div'); actions.className = 'listing-actions';

            if (it.sold) {
                const soldLabel   = document.createElement('div'); soldLabel.textContent = 'Sold'; soldLabel.className = 'muted';
                const trackingWrap = document.createElement('div'); trackingWrap.className = 'listing-meta';

                function renderTrackingUI(listing) {
                    trackingWrap.innerHTML = '';
                    if (!listing.tracking) {
                        const input   = document.createElement('input');   input.className   = 'tracking-input'; input.placeholder = 'Tracking link';
                        const saveBtn = document.createElement('button');  saveBtn.className = 'btn-small';      saveBtn.textContent = 'Save';
                        const cancel  = document.createElement('button');  cancel.className  = 'btn-small';      cancel.textContent  = 'Cancel';
                        saveBtn.addEventListener('click', () => {
                            const val = input.value.trim(); if (!val) { alert('Enter a tracking link'); return; }
                            const all = loadListings(); const idx = all.findIndex(x => x.id === listing.id); if (idx === -1) return;
                            all[idx].tracking = val; all[idx].trackingEditsRemaining = 3;
                            saveListings(all); renderAccountListings();
                        });
                        cancel.addEventListener('click', () => renderAccountListings());
                        trackingWrap.appendChild(input); trackingWrap.appendChild(saveBtn); trackingWrap.appendChild(cancel);
                    } else {
                        const isUrl = /^https?:\/\//i.test(listing.tracking);
                        if (isUrl) {
                            const a = document.createElement('a'); a.href = listing.tracking; a.target = '_blank'; a.textContent = listing.tracking; a.style.display = 'block'; a.style.marginBottom = '6px';
                            trackingWrap.appendChild(a);
                        } else {
                            const tdiv = document.createElement('div'); tdiv.textContent = listing.tracking; tdiv.style.marginBottom = '6px'; trackingWrap.appendChild(tdiv);
                        }
                        const editsLeft = typeof listing.trackingEditsRemaining === 'number' ? listing.trackingEditsRemaining : 0;
                        const editsInfo = document.createElement('div'); editsInfo.className = 'muted'; editsInfo.style.fontSize = '12px'; editsInfo.textContent = 'Edits left: ' + editsLeft; editsInfo.style.marginBottom = '6px';
                        trackingWrap.appendChild(editsInfo);
                        const editBtn = document.createElement('button'); editBtn.className = 'btn-small'; editBtn.textContent = 'Edit';
                        if (editsLeft <= 0) { editBtn.disabled = true; editBtn.title = 'No edits remaining'; }
                        editBtn.addEventListener('click', () => {
                            trackingWrap.innerHTML = '';
                            const input   = document.createElement('input');  input.className   = 'tracking-input'; input.value = listing.tracking || ''; input.placeholder = 'Tracking link';
                            const saveBtn = document.createElement('button'); saveBtn.className = 'btn-small'; saveBtn.textContent = 'Save';
                            const cancel  = document.createElement('button'); cancel.className  = 'btn-small'; cancel.textContent  = 'Cancel';
                            saveBtn.addEventListener('click', () => {
                                const val = input.value.trim(); if (!val) { alert('Enter a tracking link'); return; }
                                const all = loadListings(); const idx = all.findIndex(x => x.id === listing.id); if (idx === -1) return;
                                if (all[idx].tracking !== val) {
                                    if (typeof all[idx].trackingEditsRemaining !== 'number') all[idx].trackingEditsRemaining = 3;
                                    if (all[idx].trackingEditsRemaining > 0) all[idx].trackingEditsRemaining--;
                                    all[idx].tracking = val;
                                    saveListings(all);
                                }
                                renderAccountListings();
                            });
                            cancel.addEventListener('click', () => renderAccountListings());
                            trackingWrap.appendChild(input); trackingWrap.appendChild(saveBtn); trackingWrap.appendChild(cancel);
                        });
                        trackingWrap.appendChild(editBtn);
                    }
                }

                renderTrackingUI(it);
                actions.appendChild(soldLabel); actions.appendChild(trackingWrap);
            } else {
                const trackInput = document.createElement('input');  trackInput.className = 'tracking-input'; trackInput.placeholder = 'Tracking link';
                const markBtn    = document.createElement('button'); markBtn.className    = 'btn-small';      markBtn.textContent    = 'Mark as sold';
                markBtn.addEventListener('click', () => {
                    const all = loadListings(); const idx = all.findIndex(x => x.id === it.id); if (idx === -1) return;
                    all[idx].sold = true;
                    const t = trackInput.value.trim(); if (t) { all[idx].tracking = t; all[idx].trackingEditsRemaining = 3; }
                    all[idx].soldDate = Date.now();
                    saveListings(all); renderAccountListings();
                });
                actions.appendChild(trackInput); actions.appendChild(markBtn);
            }

            const delBtn = document.createElement('button'); delBtn.className = 'btn-remove'; delBtn.textContent = 'Delete';
            if (it.sold) { delBtn.disabled = true; delBtn.title = 'Cannot delete sold listing'; }
            delBtn.addEventListener('click', () => {
                if (it.sold) return;
                if (!confirm('Delete this listing?')) return;
                const all      = loadListings();
                const removed  = all.find(x => x.id === it.id);
                const filtered = all.filter(x => x.id !== it.id);
                saveListings(filtered); renderAccountListings();
                if (removed) {
                    showUndoSnackbar('Listing deleted', () => {
                        const cur = loadListings(); cur.push(removed); saveListings(cur); renderAccountListings();
                    });
                }
            });
            actions.appendChild(delBtn);

            info.appendChild(title); info.appendChild(price); info.appendChild(meta); info.appendChild(actions);
            card.appendChild(img); card.appendChild(info);
            accountListWrap.appendChild(card);
        });
    }

    // ── Placed Orders (fetched from server) ───────────────────────────────────
    const ordersWrap = document.getElementById('placed-orders');

    function formatDate(ts) {
        return new Date(ts).toLocaleDateString();
    }

    function statusLabel(status) {
        const map = {
            pending:   { text: 'Pending',      cls: 'status-transit' },
            paid:      { text: 'Paid',          cls: 'status-transit' },
            shipped:   { text: 'Shipped',       cls: 'status-out' },
            returned:  { text: 'Returned',      cls: 'status-delivered' },
            cancelled: { text: 'Cancelled',     cls: 'status-transit' },
            delivered: { text: 'Delivered',     cls: 'status-delivered' },
        };
        return map[status] || { text: status, cls: '' };
    }

    function renderOrders(orders) {
        ordersWrap.innerHTML = '';
        if (!orders.length) {
            ordersWrap.innerHTML = '<p class="muted">You have no orders yet.</p>';
            return;
        }
        orders.forEach(o => {
            const card    = document.createElement('div'); card.className = 'order-card';
            const head    = document.createElement('div'); head.className = 'order-head';
            const idEl    = document.createElement('div'); idEl.className = 'order-id';   idEl.textContent = '#' + o.id;
            const sl      = statusLabel(o.status);
            const statusEl = document.createElement('div'); statusEl.className = 'order-status ' + sl.cls; statusEl.textContent = sl.text;
            head.appendChild(idEl); head.appendChild(statusEl);

            const meta = document.createElement('div'); meta.className = 'order-meta';
            meta.textContent = 'Placed: ' + formatDate(o.created_at) + '  ·  Total: £' + Number(o.total || 0).toFixed(2);

            // List items in the order
            const itemsWrap = document.createElement('div'); itemsWrap.className = 'order-items';
            const orderItems = o.items || [];
            if (orderItems.length) {
                orderItems.forEach(item => {
                    const row   = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:6px';
                    const iname = document.createElement('div'); iname.className = 'order-info';
                    const ititle = document.createElement('div'); ititle.className = 'listing-title';
                    ititle.textContent = (item.variant && item.variant.product && item.variant.product.name) || 'Product';
                    const imeta  = document.createElement('div'); imeta.className = 'order-meta';
                    imeta.textContent = 'Qty: ' + item.quantity + '  ·  £' + Number(item.unit_price || 0).toFixed(2) + ' each';
                    iname.appendChild(ititle); iname.appendChild(imeta);
                    row.appendChild(iname);
                    itemsWrap.appendChild(row);
                });
            } else {
                itemsWrap.innerHTML = '<p class="muted" style="font-size:13px">No item details available.</p>';
            }

            const actions = document.createElement('div'); actions.className = 'order-actions';
            if (o.status === 'shipped' || o.status === 'paid') {
                const ret = document.createElement('button'); ret.className = 'btn-return'; ret.textContent = 'Request Return';
                ret.addEventListener('click', () => {
                    location.href = 'returns.html?order=' + encodeURIComponent(o.id);
                });
                actions.appendChild(ret);
            }

            card.appendChild(head); card.appendChild(meta); card.appendChild(itemsWrap); card.appendChild(actions);
            ordersWrap.appendChild(card);
        });
    }

    async function loadOrders() {
        ordersWrap.innerHTML = '<p class="muted">Loading orders...</p>';
        try {
            const res = await fetch('/api/orders', {
                credentials: 'include',
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
            if (!res.ok) throw new Error('fetch failed');
            const data = await res.json();
            // Laravel paginator returns { data: [...] }
            const orders = Array.isArray(data) ? data : (data.data || []);
            renderOrders(orders);
        } catch (e) {
            ordersWrap.innerHTML = '<p class="muted">Could not load orders. Please try again later.</p>';
        }
    }

    // ── Undo snackbar ─────────────────────────────────────────────────────────
    let __tv_undoTimer = null;

    function showUndoSnackbar(message, onUndo) {
        let bar = document.getElementById('tv-undo-snackbar');
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'tv-undo-snackbar';
            bar.style.cssText = 'position:fixed;right:20px;bottom:20px;background:#111;color:#fff;padding:10px 12px;border-radius:8px;display:flex;align-items:center;gap:8px;box-shadow:0 6px 18px rgba(0,0,0,0.2)';
            document.body.appendChild(bar);
        }
        bar.innerHTML = '';
        const msg   = document.createElement('div');    msg.textContent   = message; msg.style.fontSize = '14px';
        const undo  = document.createElement('button'); undo.textContent  = 'Undo';  undo.className = 'btn-ghost'; undo.style.padding = '6px 10px';
        const close = document.createElement('button'); close.textContent = '×';     close.className = 'btn-remove'; close.style.padding = '6px 8px';
        undo.addEventListener('click',  () => { if (onUndo) onUndo(); clearUndoSnackbar(); });
        close.addEventListener('click', () => clearUndoSnackbar());
        bar.appendChild(msg); bar.appendChild(undo); bar.appendChild(close);
        if (__tv_undoTimer) clearTimeout(__tv_undoTimer);
        __tv_undoTimer = setTimeout(() => clearUndoSnackbar(), 8000);
    }

    function clearUndoSnackbar() {
        const b = document.getElementById('tv-undo-snackbar');
        if (b) b.remove();
        if (__tv_undoTimer) clearTimeout(__tv_undoTimer);
        __tv_undoTimer = null;
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    renderAccountListings();
    loadOrders();


  // ── GDPR Data Rights ──────────────────────────────────────────────────────
  const exportBtn = document.getElementById('export-data-btn');
  const deleteBtn = document.getElementById('delete-account-btn');
  const gdprStatus = document.getElementById('gdpr-status');

  function setGdprStatus(msg, isError) {
    if (!gdprStatus) return;
    gdprStatus.textContent = msg;
    gdprStatus.style.color = isError ? '#b42318' : '#1f6a2e';
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      setGdprStatus('Preparing your data export…', false);
      try {
        const res = await fetch('/api/gdpr?action=export', {
          credentials: 'include',
          headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getHeaders(false)['X-CSRF-TOKEN'] || '' },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Export failed.');
        // Trigger download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'techverse-my-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setGdprStatus('Your data has been downloaded.', false);
      } catch (err) {
        setGdprStatus(err.message, true);
      } finally {
        exportBtn.disabled = false;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to request deletion of your account and all personal data? This cannot be undone.')) return;
      deleteBtn.disabled = true;
      setGdprStatus('Submitting deletion request…', false);
      try {
        const res = await fetch('/api/gdpr?action=request-deletion', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getHeaders(false)['X-CSRF-TOKEN'] || '',
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Deletion request failed.');
        setGdprStatus('Your deletion request has been submitted. We will process it within 30 days.', false);
      } catch (err) {
        deleteBtn.disabled = false;
        setGdprStatus(err.message, true);
      }
    });
  }
});