/* ============================================================
   ARES Casher Pro — Product Management Module (Enhanced)
   ============================================================ */

const Products = {
    selectedImage: null,
    selectedEmoji: null,

    /* Common product emojis */
    productEmojis: [
        '🍔', '🍕', '🌮', '🌯', '🥪', '🥗', '🍱', '🍜', '🍛', '🍲',
        '🥤', '☕', '🧃', '🍵', '🥛', '🍹', '🧋', '🫖', '🍶', '🥂',
        '🍞', '🥐', '🧁', '🍰', '🍩', '🍪', '🎂', '🧇', '🥞', '🥯',
        '🍎', '🍊', '🍋', '🍌', '🍇', '🫐', '🍓', '🍑', '🥭', '🍍',
        '🥩', '🍗', '🍖', '🥚', '🧀', '🥓', '🌭', '🍟', '🫒', '🥫',
        '👕', '👖', '👗', '👟', '👜', '🧢', '👓', '⌚', '💍', '🎒',
        '📱', '💻', '🖥️', '🖨️', '📷', '🎧', '🔌', '💡', '🔋', '🧰',
        '🧴', '🧹', '🧽', '🪥', '🧼', '🪒', '💊', '🩹', '🧸', '📦',
    ],

    render() {
        const content = document.getElementById('content-body');
        const products = db.getCollection('products');
        const categories = db.getCollection('categories');

        content.innerHTML = `
            <div class="stagger-in">
                <div class="flex items-center justify-between mb-24">
                    <div class="flex items-center gap-12">
                        <h2 style="font-size:20px; font-weight:700;">${t('product_management')}</h2>
                        <span class="badge badge-accent">${products.length} ${t('product')}</span>
                    </div>
                    <div class="flex gap-8">
                        <button class="btn btn-ghost" onclick="Products.manageCategories()">📂 ${t('categories')}</button>
                        <button class="btn btn-primary" onclick="Products.showForm()">➕ ${t('add_product')}</button>
                    </div>
                </div>

                <!-- Search & Filter -->
                <div class="flex gap-12 mb-20">
                    <input type="text" class="form-control" style="flex:1;" placeholder="🔍 ${t('search_product')}" oninput="Products.filterProducts(this.value)" id="product-search">
                    <select class="form-control" style="width:200px;" onchange="Products.filterByCategory(this.value)" id="product-cat-filter">
                        <option value="all">${t('all_categories')}</option>
                        ${categories.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('')}
                    </select>
                </div>

                <!-- Products Grid -->
                <div class="glass-card" style="overflow:hidden;">
                    <table class="data-table" id="products-table">
                        <thead>
                            <tr>
                                <th style="width:60px;">${t('image')}</th>
                                <th>${t('product_name')}</th>
                                <th>${t('category')}</th>
                                <th>${t('unit_price')}</th>
                                <th>${t('stock')}</th>
                                <th>${t('barcode')}</th>
                                <th>${t('status')}</th>
                                <th>${t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody id="products-tbody">
                            ${this.renderProductsRows(products, categories)}
                        </tbody>
                    </table>
                    ${products.length === 0 ? `<div class="empty-state p-24"><p>${t('no_products')}</p></div>` : ''}
                </div>
            </div>
        `;
    },

    renderProductsRows(products, categories) {
        return products.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            const isService = p.type === 'service';
            const lowStock = !isService && p.stock !== undefined && p.stock <= (p.minStock || 5);
            return `
            <tr>
                <td>
                    <div style="width:40px; height:40px; border-radius:var(--radius-sm); background:var(--bg-glass); display:flex; align-items:center; justify-content:center; font-size:20px; overflow:hidden;">
                        ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">` : (p.emoji || (isService ? '🛠️' : '📦'))}
                    </div>
                </td>
                <td>
                    <strong>${Utils.escapeHTML(p.name)}</strong>
                    ${isService ? `<span class="badge badge-info" style="font-size:10px; margin-right:4px;">${t('type_service')}</span>` : ''}
                </td>
                <td>${cat ? `<span class="badge" style="background:${cat.color}22; color:${cat.color};">${cat.icon || ''} ${cat.name}</span>` : '—'}</td>
                <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(p.price)}</td>
                <td>
                    <span class="badge ${isService ? 'badge-info' : (lowStock ? 'badge-danger' : 'badge-success')}">${isService ? '∞' : (p.stock !== undefined ? p.stock : 0)}</span>
                </td>
                <td style="font-family:Inter; font-size:12px; color:var(--text-muted);">${p.barcode || '—'}</td>
                <td>
                    <span class="badge ${p.active !== false ? 'badge-success' : 'badge-danger'}">${p.active !== false ? t('active') : t('disabled')}</span>
                </td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="Products.showForm('${p.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="Products.deleteProduct('${p.id}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');
    },

    filterProducts(query) {
        const products = db.getCollection('products');
        const categories = db.getCollection('categories');
        const filtered = query
            ? products.filter(p => p.name.includes(query) || (p.barcode && p.barcode.includes(query)))
            : products;
        document.getElementById('products-tbody').innerHTML = this.renderProductsRows(filtered, categories);
    },

    filterByCategory(catId) {
        const products = db.getCollection('products');
        const categories = db.getCollection('categories');
        const filtered = catId === 'all' ? products : products.filter(p => p.categoryId === catId);
        document.getElementById('products-tbody').innerHTML = this.renderProductsRows(filtered, categories);
    },

    showForm(id = null) {
        const product = id ? db.getById('products', id) : null;
        const categories = db.getCollection('categories');
        this.selectedImage = product?.image || null;
        this.selectedEmoji = product?.emoji || null;

        const currentDisplay = product?.image
            ? `<img src="${product.image}" style="width:100%;height:100%;object-fit:cover;">`
            : `<span class="upload-icon">${product?.emoji || '📷'}</span><span class="upload-text">${product?.emoji ? '' : t('upload_image')}</span>`;

        Modal.show(id ? `✏️ ${t('edit_product')}` : `➕ ${t('add_product')}`, `
            <div class="flex gap-20 mb-20">
                <!-- Image Upload Area -->
                <div style="text-align:center;">
                    <div class="image-upload-area" id="product-image-area" onclick="Products.chooseImage()" title="${t('click_to_upload')}">
                        ${currentDisplay}
                    </div>
                    <input type="file" id="product-image-input" accept="image/*" onchange="Products.handleImageUpload(event)" style="display:none;">
                    <div style="margin-top:6px;">
                        <button class="btn btn-ghost btn-sm" onclick="Products.showEmojiPicker()" style="font-size:12px;">😀 ${t('choose_icon')}</button>
                    </div>
                </div>

                <div style="flex:1;">
                    <div class="form-group">
                        <label>${t('product_name')} *</label>
                        <input type="text" class="form-control" id="p-name" value="${product ? Utils.escapeHTML(product.name) : ''}">
                    </div>
                    <div class="form-group">
                        <label>${t('product_type')}</label>
                        <select class="form-control" id="p-type" onchange="Products.toggleStockFields()">
                            <option value="product" ${product?.type !== 'service' ? 'selected' : ''}>📦 ${t('type_product')}</option>
                            <option value="service" ${product?.type === 'service' ? 'selected' : ''}>🛠️ ${t('type_service')}</option>
                        </select>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>${t('unit_price')} (${t('sar')}) *</label>
                            <input type="number" class="form-control" id="p-price" value="${product?.price || ''}" min="0" step="0.01" style="direction:ltr;">
                        </div>
                        <div class="form-group">
                            <label>${t('category')}</label>
                            <select class="form-control" id="p-category">
                                <option value="">-- ${t('no_category')} --</option>
                                ${categories.map(c => `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${c.icon || ''} ${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid-2" id="stock-fields">
                <div class="form-group">
                    <label>${t('stock')}</label>
                    <input type="number" class="form-control" id="p-stock" value="${product?.stock ?? 0}" min="0" style="direction:ltr;">
                </div>
                <div class="form-group">
                    <label>${t('min_stock_alert')}</label>
                    <input type="number" class="form-control" id="p-min-stock" value="${product?.minStock ?? 5}" min="0" style="direction:ltr;">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>${t('barcode')}</label>
                    <input type="text" class="form-control" id="p-barcode" value="${product?.barcode || ''}" style="direction:ltr;" placeholder="${t('optional')}">
                </div>
                <div class="form-group">
                    <label>${t('status')}</label>
                    <select class="form-control" id="p-active">
                        <option value="true" ${product?.active !== false ? 'selected' : ''}>${t('active')}</option>
                        <option value="false" ${product?.active === false ? 'selected' : ''}>${t('disabled')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${t('notes')}</label>
                <textarea class="form-control" id="p-notes" rows="2" placeholder="${t('optional_notes')}">${product?.notes || ''}</textarea>
            </div>

            <!-- Emoji Picker (Hidden) -->
            <div id="emoji-picker-container" style="display:none;">
                <label style="display:block; font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">${t('choose_product_icon')}:</label>
                <div class="emoji-picker-grid">
                    ${this.productEmojis.map(e => `
                        <button type="button" class="emoji-option ${this.selectedEmoji === e ? 'selected' : ''}" onclick="Products.selectEmoji('${e}')">${e}</button>
                    `).join('')}
                </div>
            </div>
        `, `
            <button class="btn btn-primary" onclick="Products.save(${id ? `'${id}'` : 'null'})">${id ? t('save_changes') : t('add_product')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `, { wide: true });

        // Init UI state
        setTimeout(() => this.toggleStockFields(), 50);
    },

    toggleStockFields() {
        const type = document.getElementById('p-type').value;
        const fields = document.getElementById('stock-fields');
        if (type === 'service') {
            fields.style.display = 'none';
        } else {
            fields.style.display = 'grid';
        }
    },

    chooseImage() {
        document.getElementById('product-image-input').click();
    },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Size check (max 500KB for localStorage)
        if (file.size > 512000) {
            Toast.show(t('warning'), t('image_too_large'), 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.selectedEmoji = null;
            const area = document.getElementById('product-image-area');
            area.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            Toast.show(t('success'), t('image_uploaded'), 'success', 2000);
        };
        reader.readAsDataURL(file);
    },

    showEmojiPicker() {
        const container = document.getElementById('emoji-picker-container');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    },

    selectEmoji(emoji) {
        this.selectedEmoji = emoji;
        this.selectedImage = null;
        const area = document.getElementById('product-image-area');
        area.innerHTML = `<span class="upload-icon">${emoji}</span>`;

        // Highlight selected
        document.querySelectorAll('.emoji-option').forEach(btn => {
            btn.classList.toggle('selected', btn.textContent === emoji);
        });

        document.getElementById('emoji-picker-container').style.display = 'none';
    },

    save(id) {
        const type = document.getElementById('p-type').value;
        const name = document.getElementById('p-name').value.trim();
        const price = parseFloat(document.getElementById('p-price').value);
        const categoryId = document.getElementById('p-category').value;
        const stock = document.getElementById('p-stock').value ? parseInt(document.getElementById('p-stock').value) : 0;
        const minStock = parseInt(document.getElementById('p-min-stock').value) || 5;
        const barcode = document.getElementById('p-barcode').value.trim();
        const active = document.getElementById('p-active').value === 'true';
        const notes = document.getElementById('p-notes').value.trim();

        if (!name || isNaN(price) || price < 0) {
            Toast.show(t('error'), t('enter_product_name_price'), 'error');
            return;
        }

        const productData = {
            name, price, categoryId: categoryId || null, type,
            stock: type === 'service' ? 0 : stock,
            minStock: type === 'service' ? 0 : minStock,
            barcode, active, notes,
            image: this.selectedImage || null,
            emoji: this.selectedEmoji || null
        };

        if (id) {
            db.update('products', id, productData);
            Toast.show(t('success'), t('product_edited'), 'success');
        } else {
            db.insert('products', productData);
            Toast.show(t('success'), t('product_added'), 'success');
        }

        App.playSound('success');
        Modal.hide();
        this.render();
    },

    deleteProduct(id) {
        Modal.show(`🗑️ ${t('delete_product')}`, `
            <p>${t('confirm_delete_product')}</p>
        `, `
            <button class="btn btn-danger" onclick="Products.confirmDelete('${id}')">${t('yes_delete')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    confirmDelete(id) {
        db.removeById('products', id);
        Modal.hide();
        Toast.show(t('success'), t('product_deleted'), 'success');
        this.render();
    },

    manageCategories() {
        const categories = db.getCollection('categories');
        Modal.show(`📂 ${t('manage_categories')}`, `
            <div id="cat-list">
                ${categories.map(c => `
                    <div class="flex items-center justify-between" style="padding:10px 12px; margin-bottom:6px; background:var(--bg-glass); border-radius:var(--radius-sm); border-${I18n.isRTL() ? 'right' : 'left'}:3px solid ${c.color || 'var(--accent-start)'};">
                        <span>${c.icon || '📂'} ${Utils.escapeHTML(c.name)}</span>
                        <button class="btn btn-ghost btn-sm" onclick="Products.deleteCategory('${c.id}')">🗑️</button>
                    </div>
                `).join('')}
            </div>
            <hr style="border-color:var(--border-color); margin:16px 0;">
            <h4 style="margin-bottom:12px;">➕ ${t('add_category')}</h4>
            <div class="grid-3" style="gap:10px;">
                <div class="form-group">
                    <input type="text" class="form-control" id="cat-name" placeholder="${t('category_name')}">
                </div>
                <div class="form-group">
                    <input type="text" class="form-control" id="cat-icon" placeholder="${t('icon')} 🍔" maxlength="2">
                </div>
                <div class="form-group">
                    <input type="color" class="form-control" id="cat-color" value="#667eea" style="height:42px; padding:4px;">
                </div>
            </div>
        `, `
            <button class="btn btn-primary" onclick="Products.addCategory()">${t('add')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>
        `);
    },

    addCategory() {
        const name = document.getElementById('cat-name').value.trim();
        const icon = document.getElementById('cat-icon').value.trim();
        const color = document.getElementById('cat-color').value;
        if (!name) { Toast.show(t('error'), t('enter_category_name'), 'error'); return; }
        db.insert('categories', { name, icon, color });
        Toast.show(t('success'), t('category_added'), 'success');
        this.manageCategories();
    },

    deleteCategory(id) {
        db.removeById('categories', id);
        Toast.show(t('success'), t('category_deleted'), 'success');
        this.manageCategories();
    }
};
