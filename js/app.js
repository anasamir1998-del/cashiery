/* ============================================================
   ARES Casher Pro — Application Controller & Router
   ============================================================ */

const App = {
    currentScreen: null,
    activeShiftId: null,

    init() {
        console.log('[App.init] Starting...');
        // Restore theme
        this.loadTheme();

        // Restore sidebar state
        this.loadSidebarState();

        // Restore nav mode (sidebar or topbar)
        this.loadNavMode();

        // Apply stored language to UI
        this.updateStaticUI();

        // Check session
        const user = Auth.getSession();
        if (user) {
            console.log('[App.init] User session found, calling onLoginSuccess');
            this.onLoginSuccess(user, true);
        } else {
            console.log('[App.init] No user session, showing login');
            this.showLogin();
        }
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleShortcuts(e));

        // Apply shop name/branding LAST — after all UI is set up
        console.log('[App.init] Calling applyBranding...');
        this.applyBranding();
        this.setupRealtimeUpdates();

        // Load users for login dropdown
        if (Auth.loadUsers) Auth.loadUsers();

        console.log('[App.init] Done.');
    },

    /* ── Apply Branding (name + logo everywhere) ── */
    applyBranding() {
        // Apply immediately
        if (window.Settings && Settings.applyShopName) {
            Settings.applyShopName();
        }
        // One small delay to catch late renders if necessary, but 500ms loop is overkill.
        // Better to rely on specific events (like screen changes) which we already do.
    },

    /* ── Real-time Updates ── */
    setupRealtimeUpdates() {
        window.addEventListener('ares-data-update', (e) => {
            const col = e.detail.collection;
            console.log(`[Data Update] Collection changed: ${col}`);

            // If we are on a screen that displays this data, refresh it
            if (this.currentScreen === 'pos' && (col === 'products' || col === 'categories')) {
                POS.render();
            } else if (this.currentScreen === 'products' && (col === 'products' || col === 'categories')) {
                Products.render();
            } else if (this.currentScreen === 'dashboard' && col === 'sales') {
                Dashboard.render();
            } else if (this.currentScreen === 'customers' && col === 'customers') {
                Customers.render();
            } else if (this.currentScreen === 'invoices' && col === 'sales') {
                Invoices.render();
            }
            // Toast.show('🔄', 'Data updated from cloud', 'info', 1000);
        });
    },

    /* ── Theme Management ── */
    loadTheme() {
        const saved = localStorage.getItem('ares_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ares_theme', next);
        this.updateThemeIcon(next);

        // Sound effect
        this.playSound('click');
        Toast.show(t('appearance'), next === 'light' ? `☀️ ${t('light_mode_activated')}` : `🌙 ${t('dark_mode_activated')}`, 'info', 2000);
    },

    updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    },

    /* ── Language Management ── */
    switchLanguage(lang) {
        I18n.setLanguage(lang);
        this.updateStaticUI();
        this.playSound('click');
        Toast.show(t('language'), `${I18n.languages[lang].flag} ${t('lang_changed')}`, 'info', 2000);

        // Re-render current screen if logged in
        if (Auth.getSession()) {
            this.navigate(this.currentScreen || 'dashboard');
        }
    },

    /* ── Sidebar Management ── */
    loadSidebarState() {
        const collapsed = localStorage.getItem('ares_sidebar_collapsed') === 'true';
        if (collapsed) {
            document.getElementById('sidebar')?.classList.add('collapsed');
        }

        // Attach overlay click handler
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
            overlay.addEventListener('touchend', (e) => { e.preventDefault(); this.closeSidebar(); });
        }
    },

    toggleSidebar() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            document.body.classList.toggle('sidebar-open');
        } else {
            const sidebar = document.getElementById('sidebar');
            const isCollapsed = sidebar.classList.toggle('collapsed');
            localStorage.setItem('ares_sidebar_collapsed', isCollapsed);
        }
        this.playSound('click');
    },

    closeSidebar() {
        document.body.classList.remove('sidebar-open');
    },

    /* ── Navigation Mode (Sidebar vs Topbar) ── */
    loadNavMode() {
        const mode = localStorage.getItem('ares_nav_mode') || 'sidebar';
        this.setNavMode(mode);
    },

    toggleNavMode() {
        const isTopbar = document.body.classList.contains('nav-topbar');
        const newMode = isTopbar ? 'sidebar' : 'topbar';
        this.setNavMode(newMode);
        localStorage.setItem('ares_nav_mode', newMode);
        this.playSound('click');
        Toast.show(t('appearance'), newMode === 'topbar' ? `📐 ${t('topbar_mode')}` : `📋 ${t('sidebar_mode')}`, 'info', 2000);
    },

    setNavMode(mode) {
        if (mode === 'topbar') {
            document.body.classList.add('nav-topbar');
        } else {
            document.body.classList.remove('nav-topbar');
        }
        // Update both toggle button icons
        // In topbar mode: show ☰ to indicate "switch to sidebar"
        // In sidebar mode: show ≡ to indicate "switch to topbar"
        const btn1 = document.getElementById('nav-mode-btn');
        const btn2 = document.getElementById('nav-mode-btn-top');
        if (btn1) btn1.textContent = mode === 'topbar' ? '☰' : '≡';
        if (btn2) btn2.textContent = mode === 'topbar' ? '☰' : '≡';
    },

    showLanguageSelector() {
        const current = I18n.currentLang;
        const langs = Object.entries(I18n.languages).map(([code, info]) => `
            <button class="btn ${code === current ? 'btn-primary' : 'btn-ghost'}" 
                onclick="App.switchLanguage('${code}'); Modal.hide();"
                style="padding: 14px 20px; font-size: 16px; min-width: 160px; margin-bottom: 8px;">
                ${info.flag} ${info.name}
            </button>
        `).join('');

        Modal.show(`🌐 ${t('select_language')}`, `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px;">
                ${langs}
            </div>
        `, `<button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>`);
    },

    updateStaticUI() {
        // Update sidebar nav labels
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        // Section titles
        const mainLabel = document.getElementById('nav-main-label');
        if (mainLabel) mainLabel.textContent = t('main_menu');
        const adminLabel = document.getElementById('nav-admin-label');
        if (adminLabel) adminLabel.textContent = t('management');

        // Login page
        const loginSubtitle = document.getElementById('login-subtitle');
        if (loginSubtitle) loginSubtitle.textContent = t('login_subtitle');
        const loginUser = document.getElementById('login-username');
        if (loginUser) loginUser.placeholder = t('username');
        const loginPass = document.getElementById('login-password');
        if (loginPass) loginPass.placeholder = t('password');
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.textContent = t('login_btn');

        // Logout title
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.title = t('logout');

        // Header date - update locale
        const headerDate = document.getElementById('header-date');
        if (headerDate) {
            const now = new Date();
            const locale = I18n.currentLang === 'ur' ? 'ur-PK' : I18n.currentLang === 'en' ? 'en-US' : 'ar-SA';
            headerDate.textContent = now.toLocaleDateString(locale, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    },

    /* ── Sound Effects ── */
    playSound(type) {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = 0.05;

            if (type === 'click') { osc.frequency.value = 800; osc.type = 'sine'; }
            else if (type === 'success') { osc.frequency.value = 600; osc.type = 'sine'; }
            else if (type === 'error') { osc.frequency.value = 200; osc.type = 'square'; }
            else if (type === 'checkout') { osc.frequency.value = 1000; osc.type = 'sine'; }

            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) { /* silent if audio not supported */ }
    },

    showLogin() {
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('app').style.display = 'none';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        if (Auth.loadUsers) Auth.loadUsers();
        setTimeout(() => document.getElementById('login-username').focus(), 300);
    },

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!username || !password) {
            Toast.show(t('warning'), t('login_enter_credentials'), 'warning');
            return;
        }

        // Show loading state?
        const btn = document.getElementById('login-btn');
        const originalText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;

        try {
            const result = await Auth.login(username, password);
            if (result.success) {
                this.playSound('success');
                this.onLoginSuccess(result.user);
            } else {
                this.playSound('error');
                Toast.show(t('error'), result.message, 'error');
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
            }
        } catch (e) {
            console.error(e);
            Toast.show(t('error'), 'Login error', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },

    onLoginSuccess(user, restored = false) {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app').style.display = 'flex';

        // Setup sidebar based on permissions
        this.setupSidebar();

        // Update user info
        document.getElementById('user-avatar').textContent = Auth.getUserInitials ? Auth.getUserInitials() : (user.name[0] || 'U');

        let branchName = t('all_branches');
        const branchId = Auth.getBranchId();
        if (branchId) {
            const branch = db.getById('branches', branchId);
            branchName = branch ? branch.name : t('branch');
        } else if (!Auth.isAdmin()) {
            branchName = t('main_branch');
        }

        document.getElementById('user-name').innerHTML = `${user.name} <span style="font-size:11px; opacity:0.7; margin-right:8px;">🏠 ${branchName}</span>`;
        document.getElementById('user-role').textContent = t('role_' + (user.role === 'مدير' ? 'admin' : user.role === 'مشرف' ? 'supervisor' : 'cashier'));

        // Check for active shift
        const shifts = db.query('shifts', s => s.userId === user.id && s.status === 'open');
        this.activeShiftId = shifts.length > 0 ? shifts[0].id : null;

        // Check low stock notifications
        this.checkNotifications();

        if (!restored) {
            Toast.show(t('login_welcome'), `${t('login_hello')} ${user.name}! ${t('login_success')}`, 'success');
        }
        this.navigate('dashboard');

        // Re-apply branding after login (ensures sidebar/topbar are updated)
        this.applyBranding();
    },

    setupSidebar() {
        const adminNav = document.getElementById('admin-nav');
        const user = Auth.currentUser;

        if (Auth.hasPermission('manage_products') || Auth.hasPermission('manage_customers') ||
            Auth.hasPermission('view_reports') || Auth.hasPermission('manage_settings') ||
            Auth.hasPermission('manage_purchases')) {
            adminNav.style.display = 'block';

            // Hide individual items based on permissions
            const navItems = adminNav.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const screen = item.dataset.screen;
                const permMap = {
                    products: 'manage_products',
                    customers: 'manage_customers',
                    reports: 'view_reports',
                    settings: 'manage_settings',
                    purchases: 'manage_purchases'
                };
                if (permMap[screen] && !Auth.hasPermission(permMap[screen])) {
                    item.style.display = 'none';
                } else {
                    item.style.display = '';
                }
            });
        } else {
            adminNav.style.display = 'none';
        }
    },

    checkNotifications() {
        const products = db.getCollection('products');
        const lowStock = products.filter(p => p.type !== 'service' && p.stock !== undefined && p.stock <= (p.minStock || 5));
        const bellDot = document.getElementById('notif-dot');
        if (bellDot) {
            bellDot.style.display = lowStock.length > 0 ? 'block' : 'none';
        }
    },

    showNotifications() {
        const products = db.getCollection('products');
        const lowStock = products.filter(p => p.type !== 'service' && p.stock !== undefined && p.stock <= (p.minStock || 5));

        if (lowStock.length === 0) {
            Toast.show(t('notifications'), `${t('no_alerts')} ✨`, 'info');
            return;
        }

        Modal.show(`🔔 ${t('notifications')}`, `
            <div class="mb-16" style="color:var(--warning);">
                ⚠️ ${lowStock.length} ${t('low_stock_alert')}
            </div>
            ${lowStock.map(p => `
                <div style="display:flex; justify-content:space-between; padding:10px 12px; margin-bottom:6px; background:var(--bg-glass); border-radius:var(--radius-sm); border-right:3px solid var(--warning);">
                    <span>${Utils.escapeHTML(p.name)}</span>
                    <span class="badge badge-warning">${p.stock} ${t('remaining')}</span>
                </div>
            `).join('')}
        `, `<button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>`);
    },

    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'F1', action: t('pos') },
            { key: 'F2', action: t('toggle_sidebar') },
            { key: 'F3', action: t('products') },
            { key: 'F4', action: t('invoices') },
            { key: 'F5', action: t('reports') },
            { key: 'F6', action: t('dashboard') },
            { key: 'F7', action: t('shifts') },
            { key: 'Esc', action: t('close') },
        ];

        Modal.show(`⌨️ ${t('keyboard_shortcuts')}`, `
            <div class="shortcuts-grid">
                ${shortcuts.map(s => `
                    <div class="shortcut-item">
                        <span>${s.action}</span>
                        <span class="shortcut-key">${s.key}</span>
                    </div>
                `).join('')}
            </div>
        `, `<button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>`, { wide: true });
    },

    navigate(screen) {
        // Check permission
        const permMap = {
            products: 'manage_products',
            customers: 'manage_customers',
            reports: 'view_reports',
            settings: 'manage_settings',
            purchases: 'manage_purchases'
        };
        if (permMap[screen] && !Auth.hasPermission(permMap[screen])) {
            Toast.show(t('not_allowed'), t('no_permission'), 'error');
            return;
        }

        // Update active nav item (sidebar)
        document.querySelectorAll('.sidebar .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screen);
        });

        // Update active nav item (topbar)
        document.querySelectorAll('.topbar-link').forEach(link => {
            link.classList.toggle('active', link.dataset.screen === screen);
        });

        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
            document.body.classList.remove('sidebar-open');
        }

        this.currentScreen = screen;
        const content = document.getElementById('content-body');
        const headerTitle = document.getElementById('header-title');

        const screens = {
            dashboard: { title: t('dashboard'), icon: '📊', render: () => Dashboard.render() },
            pos: { title: t('pos'), icon: '🛒', render: () => POS.render() },
            products: { title: t('product_management'), icon: '📦', render: () => Products.render() },
            customers: { title: t('customers'), icon: '👥', render: () => Customers.render() },
            invoices: { title: t('invoices'), icon: '🧾', render: () => Invoices.render() },
            reports: { title: t('reports'), icon: '📈', render: () => Reports.render() },
            shifts: { title: t('shifts'), icon: '⏰', render: () => Shifts.render() },
            settings: { title: t('settings'), icon: '⚙️', render: () => Settings.render() },
            purchases: { title: t('purchases'), icon: '🚚', render: () => Purchases.render() }
        };

        const s = screens[screen];
        if (s) {
            headerTitle.innerHTML = `${s.icon} ${s.title}`;
            content.innerHTML = '';
            content.className = 'content-body animate-fade-in';
            s.render();
        }
    },

    handleShortcuts(e) {
        // Don't fire when typing
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === 'F1') { e.preventDefault(); this.navigate('pos'); }
        if (e.key === 'F2') { e.preventDefault(); this.toggleSidebar(); }
        if (e.key === 'F3') { e.preventDefault(); this.navigate('products'); }
        if (e.key === 'F4') { e.preventDefault(); this.navigate('invoices'); }
        if (e.key === 'F5') { e.preventDefault(); this.navigate('reports'); }
        if (e.key === 'F6') { e.preventDefault(); this.navigate('dashboard'); }
        if (e.key === 'F7') { e.preventDefault(); this.navigate('shifts'); }
        if (e.key === 'Escape') { Modal.hide(); }
    },

    /* ── Company Branding Helper ── */
    getCompanyBrandHTML(forPrint = false) {
        const name = db.getSetting('company_name', 'ARES Casher Pro');
        const nameEn = db.getSetting('company_name_en', '');
        const address = db.getSetting('company_address', '');
        const phone = db.getSetting('company_phone', '');
        const vat = db.getSetting('vat_number', '');
        const cr = db.getSetting('cr_number', '');
        const logo = db.getSetting('company_logo', '');

        if (forPrint) {
            return `
                <div style="text-align:center; margin-bottom:12px; padding-bottom:12px; border-bottom:2px solid #333;">
                    ${logo ? `<img src="${logo}" style="width:50px; height:50px; border-radius:8px; margin-bottom:6px; object-fit:contain;" alt="logo">` : ''}
                    <div style="font-size:18px; font-weight:800;">${Utils.escapeHTML(name)}</div>
                    ${nameEn ? `<div style="font-size:12px; color:#666;">${Utils.escapeHTML(nameEn)}</div>` : ''}
                    ${address ? `<div style="font-size:11px; color:#888;">${Utils.escapeHTML(address)}</div>` : ''}
                    ${phone ? `<div style="font-size:11px; color:#888;">${t('phone')}: ${phone}</div>` : ''}
                    ${vat ? `<div style="font-size:11px; color:#888;">${t('vat_number')}: ${vat}</div>` : ''}
                    ${cr ? `<div style="font-size:11px; color:#888;">${t('cr_number')}: ${cr}</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="company-brand-header glass-card">
                ${logo ? `<img src="${logo}" class="brand-logo" alt="logo">` :
                `<div style="width:64px;height:64px;background:var(--accent-gradient);border-radius:var(--radius-md);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:white;">A</div>`}
                <div class="brand-name text-gradient">${Utils.escapeHTML(name)}</div>
                ${nameEn ? `<div style="font-size:14px; color:var(--text-secondary);">${Utils.escapeHTML(nameEn)}</div>` : ''}
                <div class="brand-details">
                    ${address ? `📍 ${Utils.escapeHTML(address)}<br>` : ''}
                    ${phone ? `📞 ${phone}` : ''} ${vat ? ` | 🏦 ${t('vat_number')}: ${vat}` : ''}
                    ${cr ? ` | 📋 ${t('cr_number')}: ${cr}` : ''}
                </div>
            </div>
        `;
    }
};

/* Toast Notifications */
const Toast = {
    show(title, message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

/* Modal Manager */
const Modal = {
    show(title, bodyHTML, footerHTML = '', options = {}) {
        const overlay = document.getElementById('modal-overlay');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHTML;
        document.getElementById('modal-footer').innerHTML = footerHTML;
        if (options.wide) {
            document.querySelector('#modal-overlay .modal').style.maxWidth = '800px';
        } else {
            document.querySelector('#modal-overlay .modal').style.maxWidth = '560px';
        }
        overlay.classList.add('active');
    },

    hide() {
        document.getElementById('modal-overlay').classList.remove('active');
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => App.init());
