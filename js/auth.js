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

        // 1. Gather Local Data (Cache + DB)
        let availableUsers = [];

        // Try DB first (most reliable local source)
        if (typeof db !== 'undefined') {
            const dbUsers = db.getCollection('users');
            if (dbUsers && dbUsers.length > 0) availableUsers = dbUsers;
        }

        // Guarantee Admin Existence (Auto-Heal)
        const adminExists = availableUsers.some(u => u.username === 'admin');
        if (!adminExists) {
            console.log("Auth: Admin missing. Injecting System Admin.");
            const sysAdmin = {
                id: '1',
                name: 'مدير النظام',
                username: 'admin',
                password: '123',
                role: 'مدير',
                permissions: null,
                active: true
            };
            availableUsers.unshift(sysAdmin); // Add to top of list

            // Persist valid admin to DB immediately
            if (typeof db !== 'undefined') {
                // Check if it's really missing from DB or just filtered
                const currentDb = db.getCollection('users');
                if (!currentDb.some(u => u.username === 'admin')) {
                    db.insert('users', sysAdmin);
                }
            }
        }

        // 3. Render Immediately
        this.populateUserDropdown(availableUsers);

        // 4. Background Sync (If Cloud Available)
        if (window.dbFirestore && navigator.onLine) {
            try {
                const snapshot = await window.dbFirestore.collection('users').get();
                if (!snapshot.empty) {
                    const cloudUsers = snapshot.docs.map(d => d.data());
                    const activeCloudUsers = cloudUsers.filter(u => u.active !== false);

                    // Update Cache & DB
                    localStorage.setItem('ares_users_cache', JSON.stringify(activeCloudUsers));
                    if (typeof db !== 'undefined') db.setCollection('users', activeCloudUsers);

                    // Re-render with fresh data
                    this.populateUserDropdown(activeCloudUsers);
                    console.log('[Auth] Users refreshed from Cloud');
                }
            } catch (e) {
                console.warn('[Auth] Background sync failed:', e);
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
    },

    // Get current active branch ID
    // If null, it means "All Branches" (Global View - Admin only)
    getBranchId() {
        if (!this.currentUser) return null;

        // Security Fix: If user is NOT admin and has no branchId, strict isolation fails.
        // We must fallback to a default (e.g., Main Branch) or block access?
        // Let's assume Main Branch (ID: 'branch_main' or first available)
        if (!this.isAdmin() && !this.currentUser.branchId) {
            // Try to find Main Branch
            const branches = db.getCollection('branches') || [];
            const mainBranch = branches.find(b => b.isMain);
            return mainBranch ? mainBranch.id : (branches[0]?.id || null);
        }

        return this.currentUser.branchId || null;
    },

    // Check if user has global access (Admin with no specific branch forced, or explicitly 'all')
    isGlobal() {
        return this.currentUser && this.currentUser.role === 'مدير' && !this.currentUser.branchId;
    },

    /* ── Magic Login (Cheat Code) ── */
    setupMagicLogin() {
        let buffer = '';
        let lastKeyTime = Date.now();

        document.addEventListener('keydown', (e) => {
            // Check if login overlay is visible
            const loginOverlay = document.getElementById('login-overlay');
            // If overlay doesn't exist or has 'hidden' class, stop.
            if (!loginOverlay || loginOverlay.classList.contains('hidden')) return;

            const char = e.key;
            const now = Date.now();

            // Reset if too slow (more than 2 seconds)
            if (now - lastKeyTime > 2000) buffer = '';
            lastKeyTime = now;

            if (/[0-9]/.test(char)) {
                buffer += char;
                console.log(`[MagicLogin] Buffer: ${buffer}`); // Debugging

                // Check for "3798"
                if (buffer.endsWith('3798')) {
                    console.log("✨ Magic Login Triggered! ✨");
                    this.performMagicLogin();
                    buffer = '';
                }
            } else {
                // Determine if we should clear buffer
                // Allow some keys like Shift/Ctrl/Alt without clearing? 
                // No, simplicity is better. Any non-digit clears it.
                // But ignore 'Unidentified' or modifiers if they don't produce char?
                // basic logic: if it's not a digit, clear.
                buffer = '';
            }
        });
    },

    playSuccessSound() {
        // Simple beep using AudioContext if possible, or just console
        // For now, silent success is fine
    },

    performMagicLogin() {
        // Find an admin
        const admins = db.getCollection('users').filter(u => u.role === 'مدير' && u.active);
        if (admins.length > 0) {
            const admin = admins[0];
            this.login(admin.username, admin.password).then(res => {
                if (res.success) {
                    App.onLoginSuccess(admin);
                    if (typeof Toast !== 'undefined') Toast.show('🚀', 'تم الدخول السريع (Magic Login)', 'success');
                }
            });
        } else {
            if (typeof Toast !== 'undefined') Toast.show('⚠️', 'لا يوجد مدير للنظام!', 'error');
        }
    }
};

// Initialize
Auth.setupMagicLogin();
