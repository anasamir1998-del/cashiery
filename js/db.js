/* ============================================================
   ARES Casher Pro — Database Layer (Hybrid: localStorage + Firestore)
   ============================================================ */

class Database {
    constructor() {
        this.prefix = 'ares_pos_';
        this.initDefaults();

        // Start Firestore Sync if available
        if (window.dbFirestore) {
            console.log("Starting Firestore Sync...");
            this.syncCollections = ['products', 'categories', 'customers', 'users', 'settings', 'shifts', 'purchases', 'sales'];

            // Initial checks
            this.checkMigration();
            this.startListeners();
        }
    }

    // ─── FIRESTORE INTEGRATION ──────────────────────────────────

    // Check if we need to upload local data to cloud (First run)
    async checkMigration() {
        try {
            const settingsRef = window.dbFirestore.collection('settings');
            const snapshot = await settingsRef.limit(1).get();

            // Case 1: Cloud is empty, Local has data -> Upload to Cloud
            if (snapshot.empty && this.getCollection('products').length > 0) {
                console.log("Firestore is empty. Uploading local data...");
                await this.uploadAllToCloud();
                if (typeof Toast !== 'undefined') Toast.show('☁️', 'تم رفع البيانات للسحابة بنجاح', 'success');
            }
            // Case 2: Local is mostly empty, Cloud has data -> Download from Cloud
            else if (!snapshot.empty && this.getCollection('products').length === 0) {
                console.log("Local is empty. Downloading from Cloud...");
                if (typeof Toast !== 'undefined') Toast.show('☁️', 'جاري تحميل البيانات من السحابة...', 'info');
                await this.downloadAllFromCloud();
            }
        } catch (e) {
            console.error("Migration check failed:", e);
        }
    }

    // Download everything from Firestore
    async downloadAllFromCloud() {
        const collections = ['products', 'categories', 'customers', 'users', 'settings', 'shifts', 'purchases', 'sales'];
        for (const col of collections) {
            const snapshot = await window.dbFirestore.collection(col).get();
            const data = snapshot.docs.map(doc => doc.data());
            if (data.length > 0) {
                this.setCollection(col, data, true);
            }
        }
        console.log("Download complete");
        window.location.reload(); // Reload to reflect changes
    }

    // Upload everything to Firestore
    async uploadAllToCloud() {
        const collections = ['products', 'categories', 'customers', 'users', 'settings', 'shifts', 'purchases', 'sales'];
        for (const colName of collections) {
            const data = this.getCollection(colName);
            const batch = window.dbFirestore.batch();
            let count = 0;

            data.forEach(doc => {
                const ref = window.dbFirestore.collection(colName).doc(doc.id);
                batch.set(ref, doc);
                count++;
                // Commit batches of 500
                if (count >= 400) {
                    // simple batching, realistically we await this batch and start new
                }
            });

            if (count > 0) await batch.commit();
            console.log(`Uploaded ${count} items to ${colName}`);
        }
    }

    // Clear all data from Firestore (Dangerous!)
    async clearCloudData() {
        const collections = ['products', 'categories', 'customers', 'users', 'settings', 'shifts', 'purchases', 'sales'];
        for (const colName of collections) {
            const snapshot = await window.dbFirestore.collection(colName).get();
            const batch = window.dbFirestore.batch();
            let count = 0;
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });
            if (count > 0) {
                await batch.commit();
                console.log(`Cleared ${count} items from ${colName}`);
            }
        }
    }

    // Clear ONLY Transactions (Sales, Purchases, Shifts) - Keep Master Data safe
    async clearCloudTransactions() {
        const collections = ['sales', 'purchases', 'shifts'];
        for (const colName of collections) {
            const snapshot = await window.dbFirestore.collection(colName).get();
            const batch = window.dbFirestore.batch();
            let count = 0;
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });
            if (count > 0) {
                await batch.commit();
                console.log(`Cleared ${count} items from ${colName}`);
            }
        }
    }

    // Listen for remote changes
    startListeners() {
        this.syncCollections.forEach(colName => {
            window.dbFirestore.collection(colName).onSnapshot(snapshot => {
                let localData = this.getCollection(colName);
                let changed = false;

                snapshot.docChanges().forEach(change => {
                    const docData = change.doc.data();
                    const idx = localData.findIndex(item => item.id === docData.id);

                    // Conflict Resolution: Trust Cloud only if it's newer
                    if (idx > -1) {
                        const localItem = localData[idx];
                        // If local has timestamp but cloud doesn't, local wins (cloud is stale)
                        if (localItem.updatedAt && !docData.updatedAt) {
                            console.log(`[Sync] Ignoring cloud data without timestamp for ${docData.id}`);
                            return;
                        }
                        // If both have timestamps, newer wins
                        if (localItem.updatedAt && docData.updatedAt) {
                            const localTime = new Date(localItem.updatedAt).getTime();
                            const cloudTime = new Date(docData.updatedAt).getTime();
                            if (localTime >= cloudTime) {
                                console.log(`[Sync] Ignoring older cloud update for ${docData.id}`);
                                return; // Skip this change
                            }
                        }
                    }

                    if (change.type === "added") {
                        if (idx === -1) {
                            localData.push(docData);
                            changed = true;
                        }
                    }
                    else if (change.type === "modified") {
                        if (idx > -1) {
                            localData[idx] = docData;
                            changed = true;
                        } else {
                            localData.push(docData);
                            changed = true;
                        }
                    }
                    else if (change.type === "removed") {
                        if (idx > -1) {
                            localData.splice(idx, 1);
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    // Update localStorage silently without triggering another upload
                    this.setCollection(colName, localData, true);

                    // Notify App
                    window.dispatchEvent(new CustomEvent('ares-data-update', {
                        detail: { collection: colName }
                    }));
                }
            });
        });
    }

    // Helper to push single change to Cloud
    cloudSave(collection, doc) {
        if (!window.dbFirestore) return;
        // Use set with merge true to handle both insert and update
        window.dbFirestore.collection(collection).doc(doc.id).set(doc, { merge: true })
            .catch(e => console.error(`Cloud save error (${collection}):`, e));
    }

    cloudDelete(collection, id) {
        if (!window.dbFirestore) return;
        window.dbFirestore.collection(collection).doc(id).delete()
            .catch(e => console.error(`Cloud delete error (${collection}):`, e));
    }

    // ─── STANDARD API (LocalStorage) ────────────────────────────

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
    setCollection(name, data, skipCloud = false) {
        try {
            localStorage.setItem(this.prefix + name, JSON.stringify(data));
        } catch (e) {
            console.error('localStorage save error:', e);
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

        // Sync
        this.cloudSave(collection, doc);

        return doc;
    }

    // Update document
    update(collection, id, updates) {
        const items = this.getCollection(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;

        items[index] = { ...items[index], ...updates, updatedAt: Utils.isoDate() };
        this.setCollection(collection, items);

        // Sync
        this.cloudSave(collection, items[index]);

        return items[index];
    }

    // Delete document
    delete(collection, id) {
        let items = this.getCollection(collection);
        items = items.filter(item => item.id !== id);
        this.setCollection(collection, items);

        // Sync
        this.cloudDelete(collection, id);
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

        let newItem;
        if (index >= 0) {
            settings[index].value = value;
            settings[index].updatedAt = Utils.isoDate(); // Add Timestamp
            newItem = settings[index];
        } else {
            newItem = { key, value, id: key, updatedAt: Utils.isoDate() }; // Add Timestamp
            settings.push(newItem);
        }

        this.setCollection('settings', settings);
        this.cloudSave('settings', newItem);
    }

    // Get next invoice number (Syncing counters is tricky, using Firestore transaction is better, but for hybrid we approximate)
    getNextInvoiceNumber() {
        // Optimized for Hybrid: Rely on local but try to sync counter
        let counter = parseInt(this.getSetting('invoice_counter', '0')) + 1;
        this.setSetting('invoice_counter', counter.toString());

        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        // Add random component to avoid collision in distributed mode
        // const rand = Math.floor(Math.random() * 100); 
        return `INV-${y}${m}-${String(counter).padStart(5, '0')}`;
    }

    // Get next purchase number
    getNextPurchaseNumber() {
        let counter = parseInt(this.getSetting('purchase_counter', '0')) + 1;
        this.setSetting('purchase_counter', counter.toString());

        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `PUR-${y}${m}-${String(counter).padStart(5, '0')}`;
    }

    // Initialize default data
    initDefaults() {
        if (!localStorage.getItem(this.prefix + 'suppliers')) this.setCollection('suppliers', []);
        if (!localStorage.getItem(this.prefix + 'purchases')) this.setCollection('purchases', []);

        // Initialize Branches
        if (!localStorage.getItem(this.prefix + 'branches')) {
            this.setCollection('branches', [
                { id: 'branch_main', name: 'الفرع الرئيسي', address: '', phone: '', active: true, isMain: true }
            ]);
        }

        // Check if users exist, otherwise create Admin
        const users = this.getCollection('users');
        if (users.length === 0) {
            this.setCollection('users', [
                { id: '1', name: 'مدير النظام', username: 'admin', password: '123', role: 'مدير', permissions: null, active: true }
            ]);
            console.log("Default Admin created");
        }

        if (this.getCollection('categories').length === 0) {
            const cats = [
                { name: 'مشروبات', color: '#00b4d8', icon: '🥤', id: 'cat_1' },
                { name: 'وجبات', color: '#ff6b35', icon: '🍔', id: 'cat_2' },
                { name: 'حلويات', color: '#e91e84', icon: '🍰', id: 'cat_3' },
                { name: 'مخبوزات', color: '#ffaa00', icon: '🥐', id: 'cat_4' },
                { name: 'أخرى', color: '#667eea', icon: '📦', id: 'cat_5' }
            ];
            cats.forEach(c => this.insert('categories', c));
        }

        const settings = this.getCollection('settings');
        // Helper to set default if missing
        const setDefault = (key, value) => {
            if (!settings.find(s => s.key === key)) {
                this.setSetting(key, value);
            }
        };

        setDefault('company_name', 'Cashiery');
        setDefault('company_name_en', 'Cashiery Pro');
        setDefault('vat_number', '300000000000003');
        setDefault('cr_number', '1010000000');
        setDefault('company_address', 'الرياض، المملكة العربية السعودية');
        setDefault('company_phone', '+966 50 000 0000');
        setDefault('vat_rate', '15');
        setDefault('currency', 'ر.س');
        setDefault('invoice_counter', '0');

        // Always ensure _initialized is true
        if (!settings.find(s => s.key === '_initialized')) {
            this.setSetting('_initialized', 'true');
        }

        if (this.getCollection('products').length === 0) {
            const cats = this.getCollection('categories');
            // Only add samples if we really are starting fresh
            const sampleProducts = [
                { name: 'قهوة عربية', price: 15, cost: 5, categoryId: cats[0]?.id, stock: 100, barcode: '100001', emoji: '☕', id: 'prod_1' },
                { name: 'كابتشينو', price: 20, cost: 7, categoryId: cats[0]?.id, stock: 100, barcode: '100002', emoji: '☕', id: 'prod_2' },
                { name: 'برجر كلاسيك', price: 35, cost: 15, categoryId: cats[1]?.id, stock: 30, barcode: '200001', emoji: '🍔', id: 'prod_3' }
            ];
            sampleProducts.forEach(p => this.insert('products', p));
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
            // Also sync restored data to cloud? Maybe dangerous.
            // Let's force upload
            if (window.dbFirestore) {
                backup[c].forEach(doc => this.cloudSave(c, doc));
            }
        });
    }
}

// Global instance
var db = new Database();
