/* ============================================================
   ARES Casher Pro — Authentication & Permissions Module
   ============================================================ */

const Auth = {
    currentUser: null,

    /* Default permissions by role */
    rolePermissions: {
        'مدير': [
            'access_pos', 'manage_products', 'manage_customers',
            'view_reports', 'manage_settings', 'manage_shifts',
            'view_invoices', 'apply_discounts', 'hold_orders',
            'manage_users', 'delete_sales', 'export_data',
            'view_dashboard_full', 'change_prices', 'manage_purchases'
        ],
        'مشرف': [
            'access_pos', 'manage_products', 'manage_customers',
            'view_reports', 'manage_shifts', 'view_invoices',
            'apply_discounts', 'hold_orders', 'view_dashboard_full'
        ],
        'كاشير': [
            'access_pos', 'view_invoices', 'manage_shifts',
            'hold_orders'
        ]
    },

    /* All available permissions with labels */
    allPermissions: [
        { key: 'access_pos', label: '🛒 شاشة البيع', group: 'البيع' },
        { key: 'apply_discounts', label: '🏷️ تطبيق الخصومات', group: 'البيع' },
        { key: 'hold_orders', label: '⏸️ تعليق الطلبات', group: 'البيع' },
        { key: 'change_prices', label: '💲 تغيير الأسعار', group: 'البيع' },
        { key: 'delete_sales', label: '🗑️ حذف المبيعات', group: 'البيع' },
        { key: 'manage_products', label: '📦 إدارة المنتجات', group: 'الإدارة' },
        { key: 'manage_customers', label: '👥 إدارة العملاء', group: 'الإدارة' },
        { key: 'manage_settings', label: '⚙️ الإعدادات', group: 'الإدارة' },
        { key: 'manage_users', label: '🔑 إدارة المستخدمين', group: 'الإدارة' },
        { key: 'manage_shifts', label: '⏰ إدارة الورديات', group: 'العمليات' },
        { key: 'view_invoices', label: '🧾 عرض الفواتير', group: 'العمليات' },
        { key: 'view_reports', label: '📈 التقارير', group: 'العمليات' },
        { key: 'view_dashboard_full', label: '📊 لوحة التحكم الكاملة', group: 'العمليات' },
        { key: 'export_data', label: '📤 تصدير البيانات', group: 'البيانات' },
        { key: 'manage_purchases', label: '🚚 إدارة المشتريات', group: 'الإدارة' },
    ],

    async loadUsers() {
        const select = document.getElementById('login-username');
        if (!select) return;

        // 1. Load from Local Cache immediately
        const cached = localStorage.getItem('ares_users_cache');
        if (cached) {
            this.populateUserDropdown(JSON.parse(cached));
        }

        // 2. Fetch from FireStore (if online)
        if (window.dbFirestore && navigator.onLine) {
            try {
                // Assuming single company / single collection for now based on v3.3 state
                const snapshot = await window.dbFirestore.collection('users').get();
                if (!snapshot.empty) {
                    const users = snapshot.docs.map(d => d.data());
                    // Filter active users only
                    const activeUsers = users.filter(u => u.active !== false);

                    // Update Cache
                    localStorage.setItem('ares_users_cache', JSON.stringify(activeUsers));

                    // Update Dropdown
                    this.populateUserDropdown(activeUsers);
                    console.log('[Auth] Users refreshed from Cloud');
                }
            } catch (e) {
                console.warn('[Auth] Failed to fetch users from cloud:', e);
            }
        }

        // 3. Fallback: Load from local DB (ares_pos_users)
        if (select.options.length <= 1) {
            const localUsers = db.getCollection('users');
            if (localUsers.length > 0) {
                this.populateUserDropdown(localUsers);
            }
        }

        // 4. Emergency Fallback: If absolutely nothing exists
        if (select.options.length <= 1) {
            // Ensure at least Admin exists
            if (select.options.length === 0 || select.value === "") {
                const adminOpt = document.createElement('option');
                adminOpt.value = 'admin';
                adminOpt.textContent = 'admin (System)';
                select.appendChild(adminOpt);
            }
        }
    },

    populateUserDropdown(users) {
        const select = document.getElementById('login-username');
        if (!select) return;

        // Keep selected value if possible
        const currentVal = select.value;

        select.innerHTML = '<option value="" disabled selected>-- اختر المستخدم --</option>';

        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = `${u.name} (${u.role})`;
            select.appendChild(opt);
        });

        if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
            select.value = currentVal;
        }
    },

    async login(username, password) {
        // Try to get users from synced DB first
        let users = db.getCollection('users');

        // If users empty, maybe wait a bit for sync? 
        if (users.length === 0 && window.dbFirestore) {
            try {
                const snapshot = await window.dbFirestore.collection('users').get();
                users = snapshot.docs.map(d => d.data());
                // Update local cache manually just in case
                db.setCollection('users', users);
            } catch (e) { console.error("Auth sync error", e); }
        }

        const user = users.find(u => u.username === username && u.password === password);

        if (!user) return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        if (user.active === false) return { success: false, message: 'هذا الحساب معطّل. تواصل مع المدير.' };

        this.currentUser = user;
        sessionStorage.setItem('ares_session', JSON.stringify(user));
        return { success: true, user };
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('ares_session');
        if (window.authFirebase) window.authFirebase.signOut(); // Sign out from Firebase Auth too if we used it
        App.activeShiftId = null;
        App.showLogin();
    },

    getSession() {
        if (this.currentUser) return this.currentUser;
        const data = sessionStorage.getItem('ares_session');
        if (data) {
            try {
                this.currentUser = JSON.parse(data);
                return this.currentUser;
            } catch (e) { return null; }
        }
        return null;
    },

    getUserInitials() {
        if (!this.currentUser) return '?';
        const parts = this.currentUser.name.split(' ');
        return parts.length > 1
            ? parts[0][0] + parts[1][0]
            : parts[0][0];
    },

    /* ── Permission Checking ── */
    hasPermission(perm) {
        if (!this.currentUser) return false;

        // Check user-level custom permissions first
        if (this.currentUser.permissions && Array.isArray(this.currentUser.permissions)) {
            return this.currentUser.permissions.includes(perm);
        }

        // Fall back to role-level defaults
        const role = this.currentUser.role;
        const rolePerms = this.rolePermissions[role] || [];
        return rolePerms.includes(perm);
    },

    getEffectivePermissions(user) {
        if (user.permissions && Array.isArray(user.permissions)) {
            return [...user.permissions];
        }
        return [...(this.rolePermissions[user.role] || [])];
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'مدير';
    },

    isSupervisor() {
        return this.currentUser && (this.currentUser.role === 'مشرف' || this.currentUser.role === 'مدير');
    }
};
