/* ============================================================
   ARES Casher Pro — Database Layer (localStorage)
   ============================================================ */

class Database {
    constructor() {
        this.prefix = 'ares_pos_';
        this.initDefaults();
    }

    // Get collection
    getCollection(name) {
        try {
            const data = localStorage.getItem(this.prefix + name);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Database integrity error (' + name + '):', e);
            return [];
        }
    }

    // Set collection
    setCollection(name, data) {
        try {
            localStorage.setItem(this.prefix + name, JSON.stringify(data));
        } catch (e) {
            console.error('localStorage save error:', e);
            // Quota exceeded — notify user if possible
            if (typeof Toast !== 'undefined') {
                Toast.show('⚠️ خطأ', 'مساحة التخزين ممتلئة', 'error');
            }
        }
    }

    // Get single document by ID
    getById(collection, id) {
        const items = this.getCollection(collection);
        return items.find(item => item.id === id) || null;
    }

    // Insert document
    insert(collection, doc) {
        const items = this.getCollection(collection);
        if (!doc.id) doc.id = Utils.generateId();
        doc.createdAt = doc.createdAt || Utils.isoDate();
        doc.updatedAt = Utils.isoDate();
        items.push(doc);
        this.setCollection(collection, items);
        return doc;
    }

    // Update document
    update(collection, id, updates) {
        const items = this.getCollection(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...updates, updatedAt: Utils.isoDate() };
        this.setCollection(collection, items);
        return items[index];
    }

    // Delete document
    delete(collection, id) {
        let items = this.getCollection(collection);
        items = items.filter(item => item.id !== id);
        this.setCollection(collection, items);
    }

    // Alias for delete
    removeById(collection, id) {
        return this.delete(collection, id);
    }

    // Query with filter function
    query(collection, filterFn) {
        const items = this.getCollection(collection);
        return filterFn ? items.filter(filterFn) : items;
    }

    // Count
    count(collection, filterFn) {
        return this.query(collection, filterFn).length;
    }

    // Get settings (key-value store)
    getSetting(key, defaultValue = null) {
        const settings = this.getCollection('settings');
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : defaultValue;
    }

    // Set setting
    setSetting(key, value) {
        let settings = this.getCollection('settings');
        const index = settings.findIndex(s => s.key === key);
        if (index >= 0) {
            settings[index].value = value;
        } else {
            settings.push({ key, value });
        }
        this.setCollection('settings', settings);
    }

    // Get next invoice number
    getNextInvoiceNumber() {
        let counter = parseInt(this.getSetting('invoice_counter', '0')) + 1;
        this.setSetting('invoice_counter', counter.toString());
        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `INV-${y}${m}-${String(counter).padStart(5, '0')}`;
    }

    // Initialize default data
    initDefaults() {
        // Initialize new collections (Suppliers & Purchases) if missing
        if (!localStorage.getItem(this.prefix + 'suppliers')) this.setCollection('suppliers', []);
        if (!localStorage.getItem(this.prefix + 'purchases')) this.setCollection('purchases', []);

        // Default admin user
        if (this.getCollection('users').length === 0) {
            if (!localStorage.getItem(this.prefix + 'users')) {
                this.setCollection('users', [
                    { id: '1', name: 'مدير النظام', username: 'admin', password: '123', role: 'مدير', permissions: null, active: true }
                ]);
            }

            // Default categories
            if (this.getCollection('categories').length === 0) {
                const cats = [
                    { name: 'مشروبات', color: '#00b4d8', icon: '🥤' },
                    { name: 'وجبات', color: '#ff6b35', icon: '🍔' },
                    { name: 'حلويات', color: '#e91e84', icon: '🍰' },
                    { name: 'مخبوزات', color: '#ffaa00', icon: '🥐' },
                    { name: 'أخرى', color: '#667eea', icon: '📦' }
                ];
                cats.forEach(c => this.insert('categories', c));
            }

            // Default settings — only set if NEVER initialized before
            const settings = this.getCollection('settings');
            const hasInit = settings.find(s => s.key === '_initialized');
            if (!hasInit) {
                this.setSetting('company_name', 'ARES Casher Pro');
                this.setSetting('company_name_en', 'ARES Casher Pro');
                this.setSetting('vat_number', '300000000000003');
                this.setSetting('cr_number', '1010000000');
                this.setSetting('company_address', 'الرياض، المملكة العربية السعودية');
                this.setSetting('company_phone', '+966 50 000 0000');
                this.setSetting('vat_rate', '15');
                this.setSetting('currency', 'ر.س');
                this.setSetting('invoice_counter', '0');
                this.setSetting('_initialized', 'true');
            }

            // Sample products if empty
            if (this.getCollection('products').length === 0) {
                const cats = this.getCollection('categories');
                const sampleProducts = [
                    { name: 'قهوة عربية', price: 15, cost: 5, categoryId: cats[0]?.id, stock: 100, barcode: '100001', emoji: '☕' },
                    { name: 'كابتشينو', price: 20, cost: 7, categoryId: cats[0]?.id, stock: 100, barcode: '100002', emoji: '☕' },
                    { name: 'لاتيه', price: 22, cost: 8, categoryId: cats[0]?.id, stock: 100, barcode: '100003', emoji: '☕' },
                    { name: 'عصير برتقال', price: 12, cost: 4, categoryId: cats[0]?.id, stock: 50, barcode: '100004', emoji: '🍊' },
                    { name: 'شاي أخضر', price: 10, cost: 3, categoryId: cats[0]?.id, stock: 80, barcode: '100005', emoji: '🍵' },
                    { name: 'برجر كلاسيك', price: 35, cost: 15, categoryId: cats[1]?.id, stock: 30, barcode: '200001', emoji: '🍔' },
                    { name: 'برجر دجاج', price: 30, cost: 12, categoryId: cats[1]?.id, stock: 30, barcode: '200002', emoji: '🍔' },
                    { name: 'سندويش كلوب', price: 28, cost: 10, categoryId: cats[1]?.id, stock: 25, barcode: '200003', emoji: '🥪' },
                    { name: 'بيتزا مارغريتا', price: 45, cost: 18, categoryId: cats[1]?.id, stock: 20, barcode: '200004', emoji: '🍕' },
                    { name: 'كيك شوكولاتة', price: 18, cost: 6, categoryId: cats[2]?.id, stock: 15, barcode: '300001', emoji: '🍫' },
                    { name: 'تشيز كيك', price: 22, cost: 8, categoryId: cats[2]?.id, stock: 15, barcode: '300002', emoji: '🍰' },
                    { name: 'كرواسون', price: 10, cost: 4, categoryId: cats[3]?.id, stock: 40, barcode: '400001', emoji: '🥐' },
                    { name: 'خبز فرنسي', price: 8, cost: 3, categoryId: cats[3]?.id, stock: 50, barcode: '400002', emoji: '🥖' },
                ];
                sampleProducts.forEach(p => this.insert('products', p));
            }
        }
    }

    // Backup all data
    backupAll() {
        const backup = {};
        const collections = ['users', 'products', 'categories', 'customers', 'sales', 'shifts', 'settings', 'held_orders'];
        collections.forEach(c => {
            backup[c] = this.getCollection(c);
        });
        return backup;
    }

    // Restore from backup
    restoreAll(backup) {
        Object.keys(backup).forEach(c => {
            this.setCollection(c, backup[c]);
        });
    }
}

// Global instance
var db = new Database();
