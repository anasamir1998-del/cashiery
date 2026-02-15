/* ============================================================
   ARES Casher Pro — POS (Point of Sale) Module
   ============================================================ */

const POS = {
    cart: [],
    selectedCategory: null,
    searchQuery: '',
    discountType: 'percent', // 'percent' or 'fixed'
    searchQuery: '',
    discountType: 'percent', // 'percent' or 'fixed'
    discountValue: 0,
    vatEnabled: true, // Default to true
    editingInvoice: null, // Track if we are editing an invoice

    render() {
        const content = document.getElementById('content-body');

        // Check if shift is open
        if (!App.activeShiftId) {
            content.innerHTML = `
                <div class="empty-state" style="padding: 100px 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">⏰</div>
                    <h3 style="font-size: 22px; margin-bottom: 12px;">${t('must_open_shift')}</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">${t('no_sale_without_shift')}</p>
                    <button class="btn btn-primary btn-lg" onclick="App.navigate('shifts')">
                        ⏰ ${t('go_open_shift')}
                    </button>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="pos-layout">
                <!-- Products Section -->
                <div class="pos-products">
                    <div class="pos-search-bar">
                        <input type="text" class="form-control" id="pos-search" placeholder="🔍 ${t('search_products')}" oninput="POS.onSearch(this.value)">
                    </div>
                    <div class="pos-categories" id="pos-categories">
                        ${this.renderCategories()}
                    </div>
                    <div class="products-grid" id="pos-products-grid">
                        ${this.renderProducts()}
                    </div>
                </div>

                <!-- Cart Section -->
                <div class="pos-cart">
                    <div class="cart-header">
                        <h3>🛒 ${t('cart')} <span class="cart-count" id="cart-count">${this.cart.length}</span></h3>
                        <div class="flex gap-4">
                            ${this.editingInvoice ? `<span class="badge badge-warning" style="font-size:12px;">✏️ ${t('edit')} (${this.editingInvoice.invoiceNumber})</span>` : ''}
                            <button class="btn btn-ghost btn-sm" onclick="POS.clearCart()" title="${t('clear_cart')}">🗑️</button>
                        </div>
                    </div>
                    <div class="cart-items" id="cart-items">
                        ${this.renderCartItems()}
                    </div>
                    <div class="cart-summary" id="cart-summary">
                        ${this.renderSummary()}
                    </div>
                    <div class="cart-actions">
                        <button class="btn btn-success btn-lg btn-block" onclick="POS.checkout()">
                            💳 ${t('checkout')}
                        </button>
                        <div class="flex gap-8">
                            <button class="btn btn-ghost flex-1 btn-sm" onclick="POS.applyDiscount()">🏷️ ${t('discount')}</button>
                            <button class="btn btn-ghost flex-1 btn-sm" onclick="POS.holdOrder()">⏸️ ${t('hold_order')}</button>
                            <button class="btn btn-ghost flex-1 btn-sm" onclick="POS.recallOrder()">▶️ ${t('recall_order')}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pos-search').focus();
    },

    renderCategories() {
        const categories = db.getCollection('categories');
        let html = `<div class="category-chip ${!this.selectedCategory ? 'active' : ''}" onclick="POS.filterCategory(null)">${t('all_categories')}</div>`;
        categories.forEach(cat => {
            html += `<div class="category-chip ${this.selectedCategory === cat.id ? 'active' : ''}" onclick="POS.filterCategory('${cat.id}')" style="${this.selectedCategory === cat.id ? `border-color: ${cat.color}; color: ${cat.color};` : ''}">${cat.icon || ''} ${cat.name}</div>`;
        });
        return html;
    },

    renderProducts() {
        const allProducts = db.getCollection('products');
        const currentBranch = Auth.getBranchId();

        // Scope
        let products = currentBranch
            ? allProducts.filter(p => !p.branchId || p.branchId === currentBranch)
            : allProducts;

        // Active & ShowInPos
        products = products.filter(p => p.active !== false && p.showInPos !== false);

        // Filter by category
        if (this.selectedCategory) {
            products = products.filter(p => p.categoryId === this.selectedCategory);
        }

        // Filter by search
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.barcode && p.barcode.includes(q))
            );
        }

        if (products.length === 0) {
            return `<div class="empty-state"><p>${t('no_products')}</p></div>`;
        }

        return products.map(p => {
            const isService = p.type === 'service';
            const outOfStock = !isService && p.stock !== undefined && p.stock <= 0;
            const productVisual = p.image
                ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md);">`
                : (p.emoji || (isService ? '🛠️' : '📦'));
            return `
            <div class="product-card ${outOfStock ? 'disabled-card' : ''}" onclick="POS.addToCart('${p.id}')">
                <div class="product-card-image">${productVisual}</div>
                <h4>${Utils.escapeHTML(p.name)}</h4>
                <div class="price">${Utils.formatSAR(p.price)}</div>
                ${isService ? `<span class="badge badge-info" style="font-size:10px;">∞ ${t('type_service')}</span>` : (p.stock !== undefined && p.stock <= 5 ? `<span class="badge badge-warning" style="font-size:10px;">${t('remaining')} ${p.stock}</span>` : '')}
            </div>`;
        }).join('');
    },

    renderCartItems() {
        if (this.cart.length === 0) {
            return `
                <div class="empty-state" style="padding: 40px 20px;">
                    <div style="font-size: 48px; opacity: 0.2;">🛒</div>
                    <p style="color: var(--text-muted); margin-top: 12px;">${t('empty_cart')}</p>
                </div>
            `;
        }
        return this.cart.map((item, i) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${Utils.escapeHTML(item.name)}</h4>
                    <span>${Utils.formatSAR(item.price)} × ${item.qty}</span>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="POS.updateQty(${i}, -1)">−</button>
                    <span style="font-family: Inter; font-weight: 600; min-width: 24px; text-align: center;">${item.qty}</span>
                    <button class="qty-btn" onclick="POS.updateQty(${i}, 1)">+</button>
                </div>
                <button class="cart-item-remove" onclick="POS.removeFromCart(${i})">✕</button>
            </div>
        `).join('');
    },

    renderSummary() {
        const subtotal = this.getSubtotal();
        const discount = this.getDiscountAmount(subtotal);
        const afterDiscount = subtotal - discount;
        const vatRate = this.vatEnabled ? parseFloat(db.getSetting('vat_rate', '15')) / 100 : 0;
        const vatAmount = afterDiscount * vatRate;
        const total = afterDiscount + vatAmount;

        return `
            <div class="cart-summary-row">
                <span>${t('subtotal')}</span>
                <span class="amount">${Utils.formatSAR(subtotal)}</span>
            </div>
            ${discount > 0 ? `
            <div class="cart-summary-row" style="color: var(--success);">
                <span>${t('discount')} ${this.discountType === 'percent' ? `(${this.discountValue}%)` : ''}</span>
                <span class="amount">- ${Utils.formatSAR(discount)}</span>
            </div>
            ` : ''}
            <div class="cart-summary-row" style="${!this.vatEnabled ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                <span>${t('vat')} (${(vatRate * 100).toFixed(0)}%)</span>
                <span class="amount">${Utils.formatSAR(vatAmount)}</span>
            </div>
            <div class="cart-summary-row total">
                <span>${t('grand_total')}</span>
                <span class="amount">${Utils.formatSAR(total)}</span>
            </div>
        `;
    },

    // Actions
    onSearch(query) {
        this.searchQuery = query;
        document.getElementById('pos-products-grid').innerHTML = this.renderProducts();
    },

    filterCategory(catId) {
        this.selectedCategory = catId;
        document.getElementById('pos-categories').innerHTML = this.renderCategories();
        document.getElementById('pos-products-grid').innerHTML = this.renderProducts();
    },

    addToCart(productId) {
        const product = db.getById('products', productId);
        if (!product) return;

        const existing = this.cart.find(item => item.productId === productId);
        const isService = product.type === 'service';

        if (existing) {
            if (!isService && product.stock !== undefined && existing.qty >= product.stock) {
                Toast.show(t('warning'), t('not_enough_stock'), 'warning');
                return;
            }
            existing.qty++;
        } else {
            if (!isService && product.stock !== undefined && product.stock <= 0) {
                Toast.show(t('warning'), t('product_unavailable'), 'warning');
                return;
            }
            this.cart.push({
                productId: product.id,
                name: Utils.getName(product),
                price: product.price,
                cost: product.cost || 0,
                qty: 1
            });
        }
        App.playSound('click');
        this.refreshCart();
    },

    updateQty(index, delta) {
        if (!this.cart[index]) return;
        this.cart[index].qty += delta;
        if (this.cart[index].qty <= 0) {
            this.cart.splice(index, 1);
        }
        this.refreshCart();
    },

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.refreshCart();
    },

    clearCart() {
        if (this.cart.length === 0 && !this.editingInvoice) return;

        if (this.editingInvoice) {
            Modal.show(t('confirm'), t('confirm_clear_cart'), `
                <button class="btn btn-danger" onclick="POS.performClearCart()">${t('yes_clear')}</button>
                <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
            `);
            return;
        }
        this.performClearCart();
    },

    performClearCart() {
        this.cart = [];
        this.discountValue = 0;
        this.editingInvoice = null;
        this.refreshCart();
        App.playSound('beep');
        Modal.hide();
    },

    refreshCart() {
        document.getElementById('cart-items').innerHTML = this.renderCartItems();
        document.getElementById('cart-summary').innerHTML = this.renderSummary();
        document.getElementById('cart-count').textContent = this.cart.reduce((s, i) => s + i.qty, 0);
    },

    getSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    },

    getDiscountAmount(subtotal) {
        if (this.discountValue <= 0) return 0;
        if (this.discountType === 'percent') {
            return subtotal * (this.discountValue / 100);
        }
        return Math.min(this.discountValue, subtotal);
    },

    applyDiscount() {
        if (!Auth.hasPermission('apply_discounts')) {
            Toast.show(t('not_allowed'), t('no_permission'), 'error');
            return;
        }
        Modal.show(`🏷️ ${t('apply_discount')}`, `
            <div class="form-group">
                <label>${t('discount_type')}</label>
                <select class="form-control" id="discount-type">
                    <option value="percent" ${this.discountType === 'percent' ? 'selected' : ''}>${t('discount_percent')}</option>
                    <option value="fixed" ${this.discountType === 'fixed' ? 'selected' : ''}>${t('discount_fixed')}</option>
            <div class="form-group">
                <label>${t('discount_value')}</label>
                <input type="number" class="form-control" id="discount-value" value="${this.discountValue}" min="0" step="0.01">
            </div>
        `, `
            <button class="btn btn-primary" onclick="POS.saveDiscount()">${t('apply_discount')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    saveDiscount() {
        this.discountType = document.getElementById('discount-type').value;
        this.discountValue = parseFloat(document.getElementById('discount-value').value) || 0;
        this.refreshCart();
        Modal.hide();
        Toast.show(t('success'), t('discount_applied'), 'success');
    },

    holdOrder() {
        if (!Auth.hasPermission('hold_orders')) {
            Toast.show(t('not_allowed'), t('no_permission'), 'error');
            return;
        }

        if (this.cart.length === 0) {
            Toast.show(t('warning'), t('cart_empty_hold'), 'warning');
            return;
        }

        const held = db.getCollection('held_orders');
        held.push({
            id: Utils.generateId(),
            items: [...this.cart],
            discount: { type: this.discountType, value: this.discountValue },
            date: Utils.isoDate(),
            cashier: Auth.currentUser.name
        });
        db.setCollection('held_orders', held);
        this.cart = [];
        this.discountValue = 0;
        this.refreshCart();
        Toast.show(t('success'), t('order_held'), 'info');
    },

    recallOrder() {
        const held = db.getCollection('held_orders');
        if (held.length === 0) {
            Toast.show(t('warning'), t('no_held_orders'), 'warning');
            return;
        }
        let html = held.map((order, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; margin-bottom:8px; background:var(--bg-glass); border-radius:var(--radius-sm); cursor:pointer;" onclick="POS.loadHeldOrder(${i})">
                <div>
                    <div style="font-weight:600;">${order.items.length} ${t('items')}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${Utils.formatDateTime(order.date)} — ${order.cashier}</div>
                </div>
                <button class="btn btn-primary btn-sm">${t('recall_order')}</button>
            </div>
        `).join('');
        Modal.show(`⏸️ ${t('held_orders')}`, html);
    },

    loadHeldOrder(index) {
        const held = db.getCollection('held_orders');
        if (held[index]) {
            this.cart = held[index].items;
            this.discountType = held[index].discount?.type || 'percent';
            this.discountValue = held[index].discount?.value || 0;
            held.splice(index, 1);
            db.setCollection('held_orders', held);
            this.refreshCart();
            Modal.hide();
            Toast.show(t('success'), t('order_recalled'), 'success');
        }
    },

    loadInvoice(invoice) {
        this.clearCart();
        this.cart = invoice.items.map(item => ({ ...item })); // Deep copy items
        this.discountType = invoice.discountType || 'percent';
        this.discountValue = invoice.discountValue || 0;
        this.editingInvoice = invoice;

        App.navigate('pos');
        this.refreshCart();
        Toast.show(t('info'), `${t('edit')}: ${invoice.invoiceNumber}`, 'info');
    },

    checkout() {
        if (this.cart.length === 0) {
            Toast.show(t('warning'), t('cart_empty_checkout'), 'warning');
            return;
        }

        const subtotal = this.getSubtotal();
        const discount = this.getDiscountAmount(subtotal);
        const afterDiscount = subtotal - discount;
        const vatRate = parseFloat(db.getSetting('vat_rate', '15')) / 100;
        const vatAmount = afterDiscount * vatRate;
        const total = afterDiscount + vatAmount;

        Modal.show(`💳 ${t('checkout')}`, `
            <div class="glass-card p-20 mb-20" style="background: rgba(102,126,234,0.1); border-color: rgba(102,126,234,0.2); text-align: center;">
                <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 8px;">${t('amount_required')}</div>
                <div style="font-size: 36px; font-weight: 800; font-family: Inter;" class="text-gradient">${Utils.formatSAR(total)}</div>
            </div>
            <div class="form-group">
                <label>${t('payment_method')}</label>
                <select class="form-control" id="payment-method">
                    <option value="نقدي">💵 ${t('cash_sales')}</option>
                    <option value="بطاقة">💳 ${t('card_sales')}</option>
                    <option value="تحويل">🏦 ${t('transfer_sales')}</option>
                </select>
            </div>
            <div class="form-group">
                <label>${t('select_customer')}</label>
                <select class="form-control" id="checkout-customer">
                    <option value="">— ${t('cash_customer')} —</option>
                    ${db.getCollection('customers').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="cash-amount-group">
                <label>${t('amount_paid')}</label>
                <input type="number" class="form-control" id="cash-amount" value="${total.toFixed(2)}" step="0.01" oninput="POS.updateChange()">
                <div id="change-display" style="margin-top:8px; font-weight:600; color: var(--success);"></div>
            </div>
            <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="vat-toggle" ${this.vatEnabled ? 'checked' : ''} onchange="POS.toggleVAT(this.checked)" style="width:20px; height:20px;">
                <label for="vat-toggle" style="margin:0; cursor:pointer;">${t('apply_vat') || 'تطبيق الضريبة'}</label>
            </div>
        `, `
            <button class="btn btn-success btn-lg" onclick="POS.completeSale()">✅ ${t('complete_sale')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    updateChange() {
        const total = this.getTotal();
        const paid = parseFloat(document.getElementById('cash-amount').value) || 0;
        const change = paid - total;
        const display = document.getElementById('change-display');
        if (change >= 0) {
            display.innerHTML = `${t('change_amount')}: ${Utils.formatSAR(change)}`;
            display.style.color = 'var(--success)';
        } else {
            display.innerHTML = `${t('remaining')}: ${Utils.formatSAR(Math.abs(change))}`;
            display.style.color = 'var(--danger)';
        }
    },

    toggleVAT(enabled) {
        this.vatEnabled = enabled;
        // Refresh Checkout Modal Total
        const total = this.getTotal();
        const display = document.querySelector('.glass-card .text-gradient');
        if (display) display.textContent = Utils.formatSAR(total);

        // Update cash input default value if it hasn't been manually changed (simple check)
        const cashInput = document.getElementById('cash-amount');
        if (cashInput) {
            cashInput.value = total.toFixed(2);
            this.updateChange();
        }

        // Also refresh background summary
        this.refreshCart();
    },

    getTotal() {
        const subtotal = this.getSubtotal();
        const discount = this.getDiscountAmount(subtotal);
        const afterDiscount = subtotal - discount;
        const vatRate = this.vatEnabled ? parseFloat(db.getSetting('vat_rate', '15')) / 100 : 0;
        const vatAmount = afterDiscount * vatRate;
        return afterDiscount + vatAmount;
    },

    completeSale() {
        const subtotal = this.getSubtotal();
        const discount = this.getDiscountAmount(subtotal);
        const afterDiscount = subtotal - discount;
        const vatRate = parseFloat(db.getSetting('vat_rate', '15')) / 100;
        const vatAmount = afterDiscount * vatRate;
        const total = afterDiscount + vatAmount;
        const paymentMethod = document.getElementById('payment-method').value;
        const customerId = document.getElementById('checkout-customer').value;
        const cashAmount = parseFloat(document.getElementById('cash-amount').value) || total;

        if (cashAmount < total) {
            Toast.show(t('error'), t('amount_less_than_total'), 'error');
            return;
        }

        // Get customer details
        let customerName = null;
        let customerVAT = null;
        if (customerId) {
            const customer = db.getById('customers', customerId);
            if (customer) {
                customerName = customer.name;
                customerVAT = customer.vatNumber || null;
            }
        }

        // Generate invoice number
        let invoiceNumber;
        let saleId = undefined;
        let createdAt = undefined;

        if (this.editingInvoice) {
            // If editing, preserve original ID, Number, and Date
            invoiceNumber = this.editingInvoice.invoiceNumber;
            saleId = this.editingInvoice.id;
            createdAt = this.editingInvoice.createdAt;

            // CRITICAL: Restore Stock of ORIGINAL items before deducting new ones
            this.editingInvoice.items.forEach(item => {
                const product = db.getById('products', item.productId);
                if (product && product.type !== 'service' && product.stock !== undefined) {
                    db.update('products', item.productId, {
                        stock: Number(product.stock) + Number(item.qty)
                    });
                }
            });

            // Remove old invoice (we will insert the updated one)
            db.removeById('sales', this.editingInvoice.id);
        } else {
            invoiceNumber = db.getNextInvoiceNumber();
        }

        // Create sale record
        const sale = db.insert('sales', {
            id: saleId, // Will be generated if undefined
            createdAt: createdAt, // Will be set to now if undefined
            invoiceNumber,
            items: this.cart.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                cost: item.cost,
                qty: item.qty,
                total: item.price * item.qty
            })),
            subtotal,
            discount,
            discountType: this.discountType,
            discountValue: this.discountValue,
            afterDiscount,
            vatEnabled: this.vatEnabled,
            vatRate: this.vatEnabled ? vatRate * 100 : 0,
            vatAmount: this.vatEnabled ? vatAmount : 0,
            total,
            paymentMethod,
            customerId: customerId || null,
            customerName,
            customerVAT,
            cashierName: Auth.currentUser.name,
            cashierId: Auth.currentUser.id,
            branchId: Auth.getBranchId(), // Tag with Branch
            shiftId: App.activeShiftId,
            cashAmount,
            changeAmount: cashAmount - total
        });

        // Update stock
        this.cart.forEach(item => {
            const product = db.getById('products', item.productId);
            // Only update stock if NOT a service
            if (product && product.type !== 'service' && product.stock !== undefined) {
                db.update('products', item.productId, {
                    stock: Math.max(0, product.stock - item.qty)
                });
            }
        });

        // Clear cart
        // Clear cart
        this.cart = [];
        this.discountValue = 0;
        this.editingInvoice = null;

        Modal.hide();
        App.playSound('checkout');
        App.checkNotifications();
        Toast.show(t('operation_done'), `${t('invoice_created')} ${invoiceNumber}`, 'success');

        // Show invoice option with receipt print
        Modal.show(`🧾 ${t('sale_success')}`, `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                <h3 style="margin-bottom: 8px;">${t('sale_success')}</h3>
                <p style="color: var(--text-muted); margin-bottom: 4px;">${t('invoice_number')}: <strong>${invoiceNumber}</strong></p>
                <p style="color: var(--text-muted); margin-bottom: 24px;">${t('grand_total')}: <strong>${Utils.formatSAR(total)}</strong></p>
            </div>
        `, `
            <button class="btn btn-primary" onclick="Invoices.viewInvoice('${sale.id}')">🧾 ${t('view_invoice')}</button>
            <button class="btn btn-success" onclick="Invoices.printReceipt('${sale.id}')">🖨️ ${t('print_receipt')}</button>
            <button class="btn btn-ghost" onclick="Invoices.printInvoice('${sale.id}')">📄 ${t('print_a4')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide(); POS.render();">${t('new_sale')}</button>
        `);
    }
};
