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

    editingPurchaseId: null,

    switchTab(btn, tab, fromEdit = false) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        const container = document.getElementById('purchases-content');

        if (tab === 'new') {
            // Reset if NOT coming from Edit (i.e. User clicked "New Purchase" tab)
            if (!fromEdit) {
                this.cart = [];
                this.editingPurchaseId = null;
                // Also reset form inputs if they exist (though renderNewPurchase will recreate them)
                const supplierSelect = document.getElementById('pur-supplier');
                if (supplierSelect) supplierSelect.value = "";
                const searchInput = document.getElementById('pur-search');
                if (searchInput) searchInput.value = "";
            }
        } else {
            this.editingPurchaseId = null;
        }

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
        // this.cart = []; // REMOVED: Managed by switchTab now
        const suppliers = db.getCollection('suppliers');
        const currentBranch = Auth.getBranchId();
        const allProducts = db.getCollection('products');

        // Product Scope
        const products = currentBranch
            ? allProducts.filter(p => !p.branchId || p.branchId === currentBranch)
            : allProducts;

        return `
            <div class="grid-layout" style="grid-template-columns: 1fr 350px; gap:24px;">
                <!-- Left: Product Selection -->
                <div class="glass-card p-24">
                    ${this.editingPurchaseId ? `
                    <div class="mb-20 p-24 flex justify-between items-center" style="background:#5e3a00; border-radius:8px; border:1px solid #ffd700;">
                        <div>⚠️ ${t('edit_mode_active')}</div>
                        <button class="btn btn-sm btn-outline" onclick="Purchases.switchTab(document.querySelectorAll('.tab-btn')[0], 'history')">${t('cancel')}</button>
                    </div>` : ''}
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
                        <label>${t('select_product')}</label>
                        <select class="form-control" id="pur-product-select">
                            <option value="">-- ${t('select_product')} --</option>
                            ${products.map(p => `<option value="${p.id}">${Utils.getName(p)} (${p.stock || 0})</option>`).join('')}
                        </select>
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

            // Dropdown Logic
            const productSelect = document.getElementById('pur-product-select');
            if (productSelect) {
                productSelect.addEventListener('change', (e) => {
                    const productId = e.target.value;
                    if (productId) {
                        Purchases.addToCart(productId);
                        e.target.value = ""; // Reset selection
                    }
                });
            }
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
                name: Utils.getName(product),
                qty: 1,
                cost: product.costPrice || 0 // Assuming costPrice exists, else 0
            });
        }
        this.renderCart();
    },

    renderCart() {
        const tbody = document.getElementById('pur-cart-tbody');
        tbody.innerHTML = this.cart.map((item, index) => `
            <tr>
                <td>${Utils.getName(db.getById('products', item.productId)) || item.name}</td>
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

        if (this.editingPurchaseId) {
            // EDIT MODE
            const oldPurchase = db.getById('purchases', this.editingPurchaseId);
            if (oldPurchase) {
                // 1. Reverse OLD stock addition (Subtract old qty)
                oldPurchase.items.forEach(item => {
                    const product = db.getById('products', item.productId);
                    if (product && product.type !== 'service') {
                        db.update('products', item.productId, {
                            stock: Number(product.stock || 0) - Number(item.qty)
                        });
                    }
                });
            }
        }

        const total = this.cart.reduce((sum, item) => sum + (item.qty * item.cost), 0);

        // 1. Save Purchase Record
        const purchase = {
            supplierId,
            date,
            items: this.cart.map(i => ({ ...i })), // Deep copy to prevent reference issues
            total,
            itemsCount: this.cart.length,
            branchId: Auth.getBranchId() // Tag with Branch
        };

        if (this.editingPurchaseId) {
            // Update existing record
            // Preserve existing purchaseNumber
            db.update('purchases', this.editingPurchaseId, purchase);
            Toast.show(t('success'), t('updated_successfully') || 'Updated Successfully', 'success');
        } else {
            // Insert new record
            purchase.purchaseNumber = db.getNextPurchaseNumber();
            db.insert('purchases', purchase);
            Toast.show(t('success'), t('purchase_saved'), 'success');
        }

        // 2. Update Stock & Cost Price
        this.cart.forEach(item => {
            const product = db.getById('products', item.productId);
            if (product) {
                // Determine new stock
                let newStock = product.stock;
                if (product.type !== 'service') {
                    const currentStock = parseFloat(product.stock || 0);
                    newStock = currentStock + item.qty;
                }

                // Update stock (if not service) and cost price
                db.update('products', item.productId, {
                    stock: newStock,
                    costPrice: item.cost
                });
            }
        });

        this.switchTab(document.querySelectorAll('.tab-btn')[0], 'history');
        this.editingPurchaseId = null;
    },

    deletePurchase(id) {
        if (!confirm(t('confirm_delete') || 'Delete?')) return;

        const purchase = db.getById('purchases', id);
        if (purchase) {
            // Reverse Stock (Subtract)
            purchase.items.forEach(item => {
                const product = db.getById('products', item.productId);
                if (product && product.type !== 'service') {
                    db.update('products', item.productId, {
                        stock: Number(product.stock || 0) - Number(item.qty)
                    });
                }
            });

            db.delete('purchases', id);
            this.switchTab(document.querySelectorAll('.tab-btn')[0], 'history');
            Toast.show(t('success'), t('operation_done'), 'success');
        }
    },

    editPurchase(id) {
        const purchase = db.getById('purchases', id);
        if (!purchase) return;

        this.editingPurchaseId = id;
        this.cart = purchase.items.map(i => ({ ...i })); // Deep copy

        // Switch to New Purchase tab
        const tabBtn = document.querySelectorAll('.tab-btn')[1];
        this.switchTab(tabBtn, 'new', true); // true = fromEdit

        // Populate form (delay slightly to ensure DOM is ready)
        setTimeout(() => {
            const supplierSelect = document.getElementById('pur-supplier');
            const dateInput = document.getElementById('pur-date');

            if (supplierSelect) supplierSelect.value = purchase.supplierId;
            if (dateInput) {
                if (dateInput._flatpickr) {
                    dateInput._flatpickr.setDate(purchase.date);
                } else {
                    dateInput.value = purchase.date;
                }
            }

            this.renderCart();
            Toast.show(t('info'), `${t('edit')}`, 'info');
        }, 50);
    },

    viewPurchase(id) {
        const p = db.getById('purchases', id);
        if (!p) return;
        const supplier = db.getById('suppliers', p.supplierId);

        Modal.show((p.purchaseNumber || t('details')) + ' | ' + (p.date || Utils.formatDateTime(p.createdAt)), `
            <div style="margin-bottom:16px;">
                <strong>${t('supplier')}:</strong> ${supplier ? supplier.name : '—'}<br>
                <strong>${t('date')}:</strong> ${p.date || '—'}<br>
                <strong>${t('items_count')}:</strong> ${p.itemsCount}<br>
                <strong>${t('total_cost')}:</strong> ${Utils.formatSAR(p.total)}
            </div>
            <table class="data-table">
                <thead>
                   <tr>
                       <th>${t('product')}</th>
                       <th>${t('quantity')}</th>
                       <th>${t('cost')}</th>
                       <th>${t('total')}</th>
                   </tr>
                </thead>
                <tbody>
                    ${p.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.qty}</td>
                            <td>${Utils.formatSAR(item.cost)}</td>
                            <td>${Utils.formatSAR(item.qty * item.cost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `, `<button class="btn btn-primary" onclick="Modal.hide()">${t('close')}</button>`);
    },

    /* ── History Logic ── */
    renderHistory() {
        const currentBranch = Auth.getBranchId();
        let purchases = db.getCollection('purchases').reverse();

        // Scope
        if (currentBranch) {
            purchases = purchases.filter(p => !p.branchId || p.branchId === currentBranch);
        }
        const suppliers = db.getCollection('suppliers');

        return `
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${t('invoice_number')}</th>
                            <th>${t('date')}</th>
                            <th>${t('supplier')}</th>
                            <th>${t('items_count')}</th>
                            <th>${t('total')}</th>
                            <th>${t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(p => {
            const sup = suppliers.find(s => s.id === p.supplierId);
            const isAdmin = Auth.isAdmin();
            return `
                            <tr>
                                <td style="font-family:Inter; font-weight:600;">${p.purchaseNumber || '—'}</td>
                                <td style="font-size:13px;">${p.date || Utils.formatDateTime(p.createdAt)}</td>
                                <td>${sup ? Utils.escapeHTML(sup.name) : '<span style="color:var(--text-muted)">—</span>'}</td>
                                <td><span class="badge badge-info">${p.itemsCount}</span></td>
                                <td style="font-family:Inter; font-weight:700;">${Utils.formatSAR(p.total)}</td>
                                <td>
                                    <button class="btn btn-ghost btn-sm" onclick="Purchases.viewPurchase('${p.id}')" title="${t('view')}">👁️</button>
                                    ${isAdmin ? `
                                    <button class="btn btn-ghost btn-sm" onclick="Purchases.editPurchase('${p.id}')" title="${t('edit')}">✏️</button>
                                    <button class="btn btn-ghost btn-sm" onclick="Purchases.deletePurchase('${p.id}')" title="${t('delete')}" style="color:var(--danger)">🗑️</button>
                                    ` : ''}
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
