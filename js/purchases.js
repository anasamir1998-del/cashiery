/* ============================================================
   ARES Casher Pro — Purchases & Suppliers Module
   ============================================================ */

const Purchases = {
    render() {
        const content = document.getElementById('content-body');
        content.innerHTML = `
            <div class="stagger-in">
                <div class="tabs mb-24">
                    <button class="tab-btn active" onclick="Purchases.switchTab(this, 'history')">📜 ${t('purchase_history')}</button>
                    <button class="tab-btn" onclick="Purchases.switchTab(this, 'new')">➕ ${t('new_purchase')}</button>
                    <button class="tab-btn" onclick="Purchases.switchTab(this, 'suppliers')">🚚 ${t('suppliers')}</button>
                </div>
                <div id="purchases-content">
                    ${this.renderHistory()}
                </div>
            </div>
        `;
    },

    switchTab(btn, tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = document.getElementById('purchases-content');

        switch (tab) {
            case 'history': container.innerHTML = this.renderHistory(); break;
            case 'new': container.innerHTML = this.renderNewPurchase(); this.initProductSearch(); break;
            case 'suppliers': container.innerHTML = this.renderSuppliers(); break;
        }
    },

    /* ── Suppliers Logic ── */
    renderSuppliers() {
        const suppliers = db.getCollection('suppliers');
        return `
            <div class="flex items-center justify-between mb-20">
                <h3>${t('suppliers')} (${suppliers.length})</h3>
                <button class="btn btn-primary" onclick="Purchases.showSupplierModal()">➕ ${t('add_supplier')}</button>
            </div>
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${t('supplier_name')}</th>
                            <th>${t('company')}</th>
                            <th>${t('phone')}</th>
                            <th>${t('vat_number')}</th>
                            <th>${t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.map(s => `
                        <tr>
                            <td><strong>${Utils.escapeHTML(s.name)}</strong></td>
                            <td>${Utils.escapeHTML(s.company || '—')}</td>
                            <td style="font-family:Inter;">${s.phone || '—'}</td>
                            <td style="font-family:Inter;">${s.vatNumber || '—'}</td>
                            <td>
                                <button class="btn btn-ghost btn-sm" onclick="Purchases.showSupplierModal('${s.id}')">✏️</button>
                                <button class="btn btn-ghost btn-sm" onclick="Purchases.deleteSupplier('${s.id}')">🗑️</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                ${suppliers.length === 0 ? `<div class="empty-state p-24"><p>${t('no_suppliers')}</p></div>` : ''}
            </div>
        `;
    },

    showSupplierModal(id = null) {
        const s = id ? db.getById('suppliers', id) : null;
        Modal.show(id ? t('edit_supplier') : t('add_supplier'), `
            <div class="form-group">
                <label>${t('supplier_name')}</label>
                <input type="text" class="form-control" id="sup-name" value="${s ? s.name : ''}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>${t('company')}</label>
                    <input type="text" class="form-control" id="sup-company" value="${s ? s.company || '' : ''}">
                </div>
                <div class="form-group">
                    <label>${t('phone')}</label>
                    <input type="text" class="form-control" id="sup-phone" value="${s ? s.phone || '' : ''}" style="direction:ltr;">
                </div>
            </div>
            <div class="form-group">
                <label>${t('vat_number')}</label>
                <input type="text" class="form-control" id="sup-vat" value="${s ? s.vatNumber || '' : ''}" style="direction:ltr;">
            </div>
        `, `
            <button class="btn btn-primary" onclick="Purchases.saveSupplier(${id ? `'${id}'` : 'null'})">${t('save')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    saveSupplier(id) {
        const name = document.getElementById('sup-name').value.trim();
        const company = document.getElementById('sup-company').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();
        const vatNumber = document.getElementById('sup-vat').value.trim();

        if (!name) {
            Toast.show(t('error'), t('enter_name'), 'error');
            return;
        }

        if (id) {
            db.update('suppliers', id, { name, company, phone, vatNumber });
        } else {
            db.insert('suppliers', { name, company, phone, vatNumber });
        }

        Modal.hide();
        Toast.show(t('success'), t('supplier_saved'), 'success');
        this.switchTab(document.querySelectorAll('.tab-btn')[2], 'suppliers');
    },

    deleteSupplier(id) {
        if (!confirm(t('confirm_delete'))) return;
        db.delete('suppliers', id);
        this.switchTab(document.querySelectorAll('.tab-btn')[2], 'suppliers');
    },

    /* ── New Purchase Logic ── */
    cart: [],

    renderNewPurchase() {
        this.cart = []; // Reset cart
        const suppliers = db.getCollection('suppliers');

        return `
            <div class="grid-layout" style="grid-template-columns: 1fr 350px; gap:24px;">
                <!-- Left: Product Selection -->
                <div class="glass-card p-24">
                    <div class="grid-2 mb-20">
                        <div class="form-group">
                            <label>${t('select_supplier')}</label>
                            <select class="form-control" id="pur-supplier">
                                <option value="">-- ${t('select')} --</option>
                                ${suppliers.map(s => `<option value="${s.id}">${s.name} ${s.company ? `(${s.company})` : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('invoice_date')}</label>
                            <input type="text" class="form-control" id="pur-date" placeholder="${t('date')}">
                        </div>
                    </div>

                    <div class="form-group mb-20">
                        <label>${t('search_product')}</label>
                        <input type="text" class="form-control" id="pur-search" placeholder="${t('search_placeholder')}">
                        <div id="pur-results" class="search-results hidden"></div>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('product')}</th>
                                <th style="width:100px;">${t('quantity')}</th>
                                <th style="width:100px;">${t('cost_price')}</th>
                                <th style="width:100px;">${t('total')}</th>
                                <th style="width:50px;"></th>
                            </tr>
                        </thead>
                        <tbody id="pur-cart-tbody">
                            <!-- Items go here -->
                        </tbody>
                    </table>
                </div>

                <!-- Right: Summary -->
                <div class="glass-card p-24 h-fit">
                    <div class="flex justify-between mb-12">
                        <span>${t('items_count')}</span>
                        <strong id="pur-count">0</strong>
                    </div>
                    <div class="flex justify-between mb-24" style="font-size:1.2em;">
                        <span>${t('total_cost')}</span>
                        <strong class="text-gradient" id="pur-total">0.00</strong>
                    </div>
                    <button class="btn btn-primary btn-block btn-lg" onclick="Purchases.savePurchase()">
                        💾 ${t('save')} & ${t('stock_in')}
                    </button>
                </div>
            </div>
        `;
    },

    initProductSearch() {
        setTimeout(() => {
            // Init Date Picker
            if (typeof flatpickr !== 'undefined') {
                flatpickr("#pur-date", {
                    locale: I18n.currentLang === 'ar' ? 'ar' : 'default',
                    dateFormat: "Y-m-d",
                    defaultDate: new Date(),
                    theme: "dark",
                    disableMobile: true
                });
            }

            // Search Logic
            const input = document.getElementById('pur-search');
            const results = document.getElementById('pur-results');

            input.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                if (q.length < 2) { results.classList.add('hidden'); return; }

                const products = db.getCollection('products');
                const matches = products.filter(p =>
                    p.name.toLowerCase().includes(q) ||
                    (p.barcode && p.barcode.includes(q))
                ).slice(0, 5);

                if (matches.length > 0) {
                    results.innerHTML = matches.map(p => `
                        <div class="result-item" onclick="Purchases.addToCart('${p.id}')">
                            <div style="display:flex; justify-content:space-between;">
                                <span>${p.name}</span>
                                <span class="badge badge-info">${p.stock || 0}</span>
                            </div>
                        </div>
                    `).join('');
                    results.classList.remove('hidden');
                } else {
                    results.classList.add('hidden');
                }
            });

            // Close results on click outside
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !results.contains(e.target)) {
                    results.classList.add('hidden');
                }
            });
        }, 100);
    },

    addToCart(productId) {
        const product = db.getById('products', productId);
        if (!product) return;

        const existing = this.cart.find(item => item.productId === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                productId,
                name: product.name,
                qty: 1,
                cost: product.costPrice || 0 // Assuming costPrice exists, else 0
            });
        }
        document.getElementById('pur-results').classList.add('hidden');
        document.getElementById('pur-search').value = '';
        this.renderCart();
    },

    renderCart() {
        const tbody = document.getElementById('pur-cart-tbody');
        tbody.innerHTML = this.cart.map((item, index) => `
            <tr>
                <td>${item.name}</td>
                <td><input type="number" class="form-control sm-input" value="${item.qty}" min="1" onchange="Purchases.updateItem(${index}, 'qty', this.value)"></td>
                <td><input type="number" class="form-control sm-input" value="${item.cost}" min="0" step="0.01" onchange="Purchases.updateItem(${index}, 'cost', this.value)"></td>
                <td>${(item.qty * item.cost).toFixed(2)}</td>
                <td><button class="btn btn-ghost btn-sm text-danger" onclick="Purchases.removeFromCart(${index})">×</button></td>
            </tr>
        `).join('');

        // Update Summary
        const total = this.cart.reduce((sum, item) => sum + (item.qty * item.cost), 0);
        document.getElementById('pur-count').textContent = this.cart.length;
        document.getElementById('pur-total').textContent = Utils.formatSAR(total);
    },

    updateItem(index, key, value) {
        if (key === 'qty') this.cart[index].qty = parseFloat(value);
        if (key === 'cost') this.cart[index].cost = parseFloat(value);
        this.renderCart();
    },

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.renderCart();
    },

    savePurchase() {
        const supplierId = document.getElementById('pur-supplier').value;
        const date = document.getElementById('pur-date').value;

        if (!supplierId) {
            Toast.show(t('error'), t('select_supplier'), 'error');
            return;
        }
        if (this.cart.length === 0) {
            Toast.show(t('error'), 'Cart is empty', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.qty * item.cost), 0);

        // 1. Save Purchase Record
        const purchase = {
            supplierId,
            date,
            items: this.cart,
            total,
            itemsCount: this.cart.length
        };
        db.insert('purchases', purchase);

        // 2. Update Stock & Cost Price
        this.cart.forEach(item => {
            const product = db.getById('products', item.productId);
            if (product) {
                // Weighted Average Cost (optional, but good practice)
                // New Cost = ((Old Qty * Old Cost) + (New Qty * New Cost)) / (Old Qty + New Qty)

                // Simple Stock Increment
                const currentStock = parseFloat(product.stock || 0);
                const newStock = currentStock + item.qty;

                // Update cost price (last cost or average? let's stick to last cost for simplicity or just update it)
                db.update('products', item.productId, {
                    stock: newStock,
                    costPrice: item.cost
                });
            }
        });

        Toast.show(t('success'), t('purchase_saved'), 'success');
        this.switchTab(document.querySelectorAll('.tab-btn')[0], 'history');
    },

    /* ── History Logic ── */
    renderHistory() {
        const purchases = db.getCollection('purchases').reverse();
        const suppliers = db.getCollection('suppliers');

        return `
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${t('date')}</th>
                            <th>${t('supplier_name')}</th>
                            <th>${t('items_count')}</th>
                            <th>${t('total_cost')}</th>
                            <th>${t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(p => {
            const sup = suppliers.find(s => s.id === p.supplierId);
            return `
                            <tr>
                                <td style="font-family:Inter;">${p.date || Utils.formatDateTime(p.createdAt)}</td>
                                <td>${sup ? Utils.escapeHTML(sup.name) : '—'}</td>
                                <td>${p.itemsCount}</td>
                                <td style="font-family:Inter; font-weight:700;">${Utils.formatSAR(p.total)}</td>
                                <td>
                                    <!-- View logic can be added later -->
                                    <button class="btn btn-ghost btn-sm disabled">👁️</button>
                                </td>
                            </tr>`;
        }).join('')}
                    </tbody>
                </table>
                ${purchases.length === 0 ? `<div class="empty-state p-24"><p>${t('no_invoices')}</p></div>` : ''}
            </div>
        `;
    }
};
