/* ============================================================
   ARES Casher Pro — Settings Module (Enhanced)
   ============================================================ */

const Settings = {
    render() {
        const content = document.getElementById('content-body');
        content.innerHTML = `
            <div class="stagger-in">
                <div class="tabs mb-24" style="flex-wrap:wrap;">
                    <button class="tab-btn active" onclick="Settings.switchTab(this, 'company')">🏢 ${t('company')}</button>
                    <button class="tab-btn" onclick="Settings.switchTab(this, 'tax')">🏦 ${t('tax_settings')}</button>
                    <button class="tab-btn" onclick="Settings.switchTab(this, 'users')">👥 ${t('users')}</button>
                    <button class="tab-btn" onclick="Settings.switchTab(this, 'appearance')">🎨 ${t('appearance')}</button>
                    <button class="tab-btn" onclick="Settings.switchTab(this, 'shortcuts')">⌨️ ${t('keyboard_shortcuts')}</button>
                    <button class="tab-btn" onclick="Settings.switchTab(this, 'backup')">💾 ${t('backup')}</button>
                </div>
                <div id="settings-content">
                    ${this.renderCompanySettings()}
                </div>
            </div>
        `;
    },

    applyShopName() {
        const name = db.getSetting('company_name', 'ARES');
        const nameEn = db.getSetting('company_name_en', 'Casher Pro');
        const logo = db.getSetting('company_logo', '');

        console.log('[applyShopName] name:', name, '| nameEn:', nameEn, '| logo:', logo ? '(has logo)' : '(no logo)');

        // Update document title
        document.title = `${name} — ${nameEn}`;

        // Update UI elements (Text)
        const loginBrand = document.getElementById('brand-name-login');
        const sidebarBrand = document.getElementById('brand-name-sidebar');
        const sidebarSubtitle = document.getElementById('brand-subtitle-sidebar');
        const topbarBrand = document.getElementById('brand-name-topbar');

        console.log('[applyShopName] Elements found:', {
            loginBrand: !!loginBrand,
            sidebarBrand: !!sidebarBrand,
            sidebarSubtitle: !!sidebarSubtitle,
            topbarBrand: !!topbarBrand
        });

        if (loginBrand) loginBrand.textContent = name + ' ' + nameEn;
        if (sidebarBrand) sidebarBrand.textContent = name;
        if (sidebarSubtitle) sidebarSubtitle.textContent = nameEn;
        if (topbarBrand) topbarBrand.textContent = name;

        // Update UI elements (Logo)
        const loginLogo = document.getElementById('login-logo');
        const sidebarLogo = document.getElementById('sidebar-logo');
        const topbarLogo = document.getElementById('topbar-logo');

        console.log('[applyShopName] Logo elements found:', {
            loginLogo: !!loginLogo,
            sidebarLogo: !!sidebarLogo,
            topbarLogo: !!topbarLogo
        });

        const logos = [loginLogo, sidebarLogo, topbarLogo];

        logos.forEach(el => {
            if (!el) return;
            if (logo) {
                el.innerHTML = `<img src="${logo}" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;" alt="logo">`;
                el.style.background = 'transparent';
                el.style.boxShadow = 'none';
            } else {
                // Fallback to first letter
                const letter = (nameEn || name || 'A').charAt(0).toUpperCase();
                el.innerHTML = letter;
                el.style.background = '';
                el.style.boxShadow = '';
            }
        });

        console.log('[applyShopName] Done. Sidebar now shows:', sidebarBrand?.textContent, '| Topbar:', topbarBrand?.textContent);
    },

    switchTab(btn, tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = document.getElementById('settings-content');
        switch (tab) {
            case 'company': container.innerHTML = this.renderCompanySettings(); break;
            case 'tax': container.innerHTML = this.renderTaxSettings(); break;
            case 'users': container.innerHTML = this.renderUserManagement(); break;
            case 'appearance': container.innerHTML = this.renderAppearanceSettings(); this.initInvoicePreviewListeners(); break;
            case 'shortcuts': container.innerHTML = this.renderShortcuts(); break;
            case 'backup': container.innerHTML = this.renderBackupSettings(); break;
        }
    },

    renderCompanySettings() {
        const logo = db.getSetting('company_logo', '');
        return `
            <div class="glass-card p-24">
                <h3 style="margin-bottom: 20px;">🏢 ${t('company_info')}</h3>
                
                <!-- Logo Upload -->
                <div class="form-group" style="text-align:center; margin-bottom:24px;">
                    <label style="display:block; margin-bottom:8px;">${t('company_logo')}</label>
                    <div class="image-upload-area" style="width:100px; height:100px; margin:0 auto;" onclick="document.getElementById('logo-input').click()">
                        ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain;">` : `<span class="upload-icon">🏢</span><span class="upload-text">${t('upload_logo')}</span>`}
                    </div>
                    <input type="file" id="logo-input" accept="image/*" onchange="Settings.handleLogoUpload(event)" style="display:none;">
                    ${logo ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="Settings.removeLogo()">🗑️ ${t('remove_logo')}</button>` : ''}
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label>${t('company_name_ar')}</label>
                        <input type="text" class="form-control" id="s-company-name" value="${db.getSetting('company_name', '')}">
                    </div>
                    <div class="form-group">
                        <label>${t('company_name_en')}</label>
                        <input type="text" class="form-control" id="s-company-name-en" value="${db.getSetting('company_name_en', '')}" style="direction:ltr;">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>${t('vat_number')} (VAT Number)</label>
                        <input type="text" class="form-control" id="s-vat-number" value="${db.getSetting('vat_number', '')}" style="direction:ltr;" placeholder="3xxxxxxxxxxxxxxx">
                    </div>
                    <div class="form-group">
                        <label>${t('cr_number')} (CR Number)</label>
                        <input type="text" class="form-control" id="s-cr-number" value="${db.getSetting('cr_number', '')}" style="direction:ltr;">
                    </div>
                </div>
                <div class="form-group">
                    <label>${t('address')}</label>
                    <textarea class="form-control" id="s-address" rows="2">${db.getSetting('company_address', '')}</textarea>
                </div>
                <div class="form-group">
                    <label>${t('phone')}</label>
                    <input type="text" class="form-control" id="s-phone" value="${db.getSetting('company_phone', '')}" style="direction:ltr;">
                </div>
                <button class="btn btn-primary" onclick="Settings.saveCompany()">💾 ${t('save_data')}</button>
                
                <!-- Preview -->
                <div style="margin-top:24px; border-top:1px solid var(--border-color); padding-top:16px;">
                    <h4 style="margin-bottom:12px; font-size:14px; color:var(--text-muted);">👁️ ${t('report_header_preview')}:</h4>
                    ${App.getCompanyBrandHTML()}
                </div>
            </div>
        `;
    },

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 256000) {
            Toast.show(t('warning'), t('logo_too_large'), 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            db.setSetting('company_logo', e.target.result);
            Toast.show(t('success'), t('logo_uploaded'), 'success');
            // Re-render and apply branding
            document.getElementById('settings-content').innerHTML = this.renderCompanySettings();
            this.applyShopName();
        };
        reader.readAsDataURL(file);
    },

    removeLogo() {
        db.setSetting('company_logo', '');
        Toast.show(t('success'), t('logo_removed'), 'info');
        document.getElementById('settings-content').innerHTML = this.renderCompanySettings();
        this.applyShopName();
    },

    saveCompany() {
        db.setSetting('company_name', document.getElementById('s-company-name').value.trim());
        db.setSetting('company_name_en', document.getElementById('s-company-name-en').value.trim());
        db.setSetting('vat_number', document.getElementById('s-vat-number').value.trim());
        db.setSetting('cr_number', document.getElementById('s-cr-number').value.trim());
        db.setSetting('company_address', document.getElementById('s-address').value.trim());
        db.setSetting('company_phone', document.getElementById('s-phone').value.trim());
        Toast.show(t('success'), t('company_saved'), 'success');
        // Refresh preview
        document.getElementById('settings-content').innerHTML = this.renderCompanySettings();
        // Apply changes immediately
        this.applyShopName();
    },

    /* ── Invoice Settings ── */
    renderInvoiceSettings() {
        // Helper to get setting with default true
        const getBool = (key) => db.getSetting(key, 'true') === 'true';
        const getVal = (key, def) => db.getSetting(key, def);

        return `
            <div class="glass-card p-24">
                <h3 style="margin-bottom: 20px;">🧾 ${t('invoice_settings')}</h3>
                
                <div class="grid-2">
                    <!-- Header Section -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_header')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_logo" ${getBool('inv_show_logo') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_logo">${t('show_logo')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_name" ${getBool('inv_show_company_name') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_name">${t('show_company_name')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_address" ${getBool('inv_show_company_address') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_address">${t('show_company_address')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_phone" ${getBool('inv_show_company_phone') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_phone">${t('show_company_phone')}</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="inv_show_vat_number" ${getBool('inv_show_vat_number') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_vat_number">${t('show_vat_number')}</label>
                        </div>
                    </div>

                    <!-- Details Section -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_details')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_cashier" ${getBool('inv_show_cashier') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_cashier">${t('show_cashier')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_customer" ${getBool('inv_show_customer') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_customer">${t('show_customer')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_discount" ${getBool('inv_show_discount') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_discount">${t('show_discount')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_payment_method" ${getBool('inv_show_payment_method') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_payment_method">${t('show_payment_method')}</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="inv_show_paid_change" ${getBool('inv_show_paid_change') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_paid_change">${t('show_paid_change')}</label>
                        </div>
                    </div>
                </div>

                <div class="grid-2">
                    <!-- QR Layout -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('show_qr')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_qr" ${getBool('inv_show_qr') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_qr">${t('show_qr')}</label>
                        </div>
                        
                        <div class="form-group mt-10">
                            <label>${t('qr_position')}</label>
                            <select class="form-control" id="inv_qr_position">
                                <option value="bottom" ${getVal('inv_qr_position', 'bottom') === 'bottom' ? 'selected' : ''}>${t('qr_bottom')}</option>
                                <option value="top" ${getVal('inv_qr_position', 'bottom') === 'top' ? 'selected' : ''}>${t('qr_top')}</option>
                            </select>
                        </div>
                    </div>

                    <!-- Footer & Layout -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_footer')} & ${t('inv_layout')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_footer" ${getBool('inv_show_footer') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_footer">${t('show_footer')}</label>
                        </div>
                        
                        <div class="form-group mb-10">
                            <label>${t('footer_text')}</label>
                            <input type="text" class="form-control" id="inv_footer_text" value="${getVal('inv_footer_text', t('thank_you') || 'Thank you')}">
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label>${t('font_size')}</label>
                                <select class="form-control" id="inv_font_size">
                                    <option value="small" ${getVal('inv_font_size', 'medium') === 'small' ? 'selected' : ''}>${t('font_small')}</option>
                                    <option value="medium" ${getVal('inv_font_size', 'medium') === 'medium' ? 'selected' : ''}>${t('font_medium')}</option>
                                    <option value="large" ${getVal('inv_font_size', 'medium') === 'large' ? 'selected' : ''}>${t('font_large')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>${t('paper_width')}</label>
                                <select class="form-control" id="inv_paper_width">
                                    <option value="80mm" ${getVal('inv_paper_width', '80mm') === '80mm' ? 'selected' : ''}>80mm</option>
                                    <option value="58mm" ${getVal('inv_paper_width', '80mm') === '58mm' ? 'selected' : ''}>58mm</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="text-align:end;">
                    <button class="btn btn-primary" onclick="Settings.saveInvoiceSettings()">💾 ${t('save_changes')}</button>
                </div>
            </div>
        `;
    },

    saveInvoiceSettings() {
        // Bool settings
        const boolKeys = [
            'inv_show_logo', 'inv_show_company_name', 'inv_show_company_address',
            'inv_show_company_phone', 'inv_show_vat_number', 'inv_show_cashier',
            'inv_show_customer', 'inv_show_discount', 'inv_show_payment_method',
            'inv_show_paid_change', 'inv_show_qr', 'inv_show_footer'
        ];

        boolKeys.forEach(key => {
            const el = document.getElementById(key);
            if (el) db.setSetting(key, el.checked.toString());
        });

        // Value settings
        const valKeys = ['inv_qr_position', 'inv_qr_align', 'inv_footer_text', 'inv_font_size', 'inv_paper_width'];
        valKeys.forEach(key => {
            const el = document.getElementById(key);
            if (el) db.setSetting(key, el.value);
        });

        Toast.show(t('success'), t('inv_settings_saved'), 'success');
    },

    renderTaxSettings() {
        return `
            <div class="glass-card p-24">
                <h3 style="margin-bottom: 20px;">🏦 ${t('vat_settings')}</h3>
                <div class="glass-card p-20 mb-20" style="background: var(--warning-bg); border-color: rgba(255,170,0,0.2);">
                    <p style="font-size:13px; color: var(--warning);">
                        ⚠️ ${t('vat_notice')}
                    </p>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>${t('vat_rate')} (%)</label>
                        <input type="number" class="form-control" id="s-vat-rate" value="${db.getSetting('vat_rate', '15')}" min="0" max="100" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>${t('currency_symbol')}</label>
                        <input type="text" class="form-control" id="s-currency" value="${db.getSetting('currency', 'ر.س')}">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="Settings.saveTax()">💾 ${t('save_tax_settings')}</button>
            </div>
        `;
    },

    saveTax() {
        db.setSetting('vat_rate', document.getElementById('s-vat-rate').value);
        db.setSetting('currency', document.getElementById('s-currency').value.trim());
        Toast.show(t('success'), t('tax_settings_saved'), 'success');
    },

    renderUserManagement() {
        const users = db.getCollection('users');
        return `
            <div class="flex items-center justify-between mb-20">
                <h3>👥 ${t('user_management')}</h3>
                <button class="btn btn-primary" onclick="Settings.showAddUser()">➕ ${t('add_user')}</button>
            </div>
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${t('full_name')}</th>
                            <th>${t('username')}</th>
                            <th>${t('role')}</th>
                            <th>${t('status')}</th>
                            <th>${t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                        <tr>
                            <td><strong>${Utils.escapeHTML(u.name)}</strong></td>
                            <td style="font-family:Inter;">${u.username}</td>
                            <td><span class="badge ${u.role === 'مدير' ? 'badge-accent' : u.role === 'مشرف' ? 'badge-warning' : 'badge-info'}">${t('role_' + (u.role === 'مدير' ? 'admin' : u.role === 'مشرف' ? 'supervisor' : 'cashier'))}</span></td>
                            <td><span class="badge ${u.active !== false ? 'badge-success' : 'badge-danger'}">${u.active !== false ? t('active') : t('disabled')}</span></td>
                            <td>
                                <button class="btn btn-ghost btn-sm" onclick="Settings.editUser('${u.id}')" title="${t('edit')}">✏️</button>
                                <button class="btn btn-ghost btn-sm" onclick="Settings.editPermissions('${u.id}')" title="${t('permissions')}">🔑</button>
                                ${u.username !== 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="Settings.toggleUser('${u.id}')">${u.active !== false ? '🔒' : '🔓'}</button>` : ''}
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    showAddUser(user = null) {
        const isEdit = !!user;
        Modal.show(isEdit ? `✏️ ${t('edit_user')}` : `➕ ${t('add_user')}`, `
            <div class="form-group">
                <label>${t('full_name')}</label>
                <input type="text" class="form-control" id="u-name" value="${user ? Utils.escapeHTML(user.name) : ''}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>${t('username')}</label>
                    <input type="text" class="form-control" id="u-username" value="${user?.username || ''}" ${isEdit ? 'readonly' : ''} style="direction:ltr;">
                </div>
                <div class="form-group">
                    <label>${isEdit ? t('new_password') : t('password')}</label>
                    <input type="password" class="form-control" id="u-password" style="direction:ltr;">
                </div>
            </div>
            <div class="form-group">
                <label>${t('role')}</label>
                <select class="form-control" id="u-role">
                    <option value="كاشير" ${user?.role === 'كاشير' ? 'selected' : ''}>${t('role_cashier')}</option>
                    <option value="مشرف" ${user?.role === 'مشرف' ? 'selected' : ''}>${t('role_supervisor')}</option>
                    <option value="مدير" ${user?.role === 'مدير' ? 'selected' : ''}>${t('role_admin')}</option>
                </select>
            </div>
            <div class="glass-card p-20" style="background:var(--info-bg); border-color:rgba(0,180,216,0.2);">
                <p style="font-size:12px; color:var(--info);">💡 ${t('permissions_hint')}</p>
            </div>
        `, `
            <button class="btn btn-primary" onclick="Settings.saveUser(${isEdit ? `'${user.id}'` : 'null'})">${isEdit ? t('save_changes') : t('add')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    saveUser(id) {
        const name = document.getElementById('u-name').value.trim();
        const username = document.getElementById('u-username').value.trim();
        const password = document.getElementById('u-password').value;
        const role = document.getElementById('u-role').value;

        if (!name || !username) {
            Toast.show(t('error'), t('enter_name_username'), 'error');
            return;
        }

        if (id) {
            const updates = { name, role };
            if (password) updates.password = password;
            // Reset permissions when role changes
            const oldUser = db.getById('users', id);
            if (oldUser && oldUser.role !== role) {
                updates.permissions = null; // Will fall back to new role defaults
            }
            db.update('users', id, updates);
            Toast.show(t('success'), t('user_edited'), 'success');
        } else {
            if (!password) {
                Toast.show(t('error'), t('enter_password'), 'error');
                return;
            }
            const existing = db.query('users', u => u.username === username);
            if (existing.length > 0) {
                Toast.show(t('error'), t('username_exists'), 'error');
                return;
            }
            db.insert('users', { name, username, password, role, active: true });
            Toast.show(t('success'), t('user_added'), 'success');
        }
        Modal.hide();
        this.goToUsersTab();
    },

    editUser(id) {
        const user = db.getById('users', id);
        if (user) this.showAddUser(user);
    },

    toggleUser(id) {
        const user = db.getById('users', id);
        if (user) {
            db.update('users', id, { active: user.active === false ? true : false });
            this.goToUsersTab();
        }
    },

    /* ── Permissions Editor ── */
    editPermissions(userId) {
        const user = db.getById('users', userId);
        if (!user) return;

        const effectivePerms = Auth.getEffectivePermissions(user);
        const groups = {};
        Auth.allPermissions.forEach(p => {
            if (!groups[p.group]) groups[p.group] = [];
            groups[p.group].push(p);
        });

        let html = `
            <div class="mb-16">
                <strong>${Utils.escapeHTML(user.name)}</strong> — 
                <span class="badge ${user.role === 'مدير' ? 'badge-accent' : user.role === 'مشرف' ? 'badge-warning' : 'badge-info'}">${t('role_' + (user.role === 'مدير' ? 'admin' : user.role === 'مشرف' ? 'supervisor' : 'cashier'))}</span>
            </div>
        `;

        for (const [group, perms] of Object.entries(groups)) {
            html += `<h4 style="margin:16px 0 8px; font-size:14px; color:var(--text-muted);">${group}</h4>`;
            html += `<div class="permission-grid">`;
            perms.forEach(p => {
                const checked = effectivePerms.includes(p.key) ? 'checked' : '';
                html += `
                    <div class="permission-item">
                        <input type="checkbox" id="perm-${p.key}" data-perm="${p.key}" ${checked}>
                        <label for="perm-${p.key}">${p.label}</label>
                    </div>
                `;
            });
            html += `</div>`;
        }

        Modal.show(`🔑 ${t('permissions')}: ${user.name}`, html, `
            <button class="btn btn-primary" onclick="Settings.savePermissions('${userId}')">💾 ${t('save_permissions')}</button>
            <button class="btn btn-ghost" onclick="Settings.resetPermissions('${userId}')">🔄 ${t('reset_default')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `, { wide: true });
    },

    savePermissions(userId) {
        const checkboxes = document.querySelectorAll('[data-perm]');
        const permissions = [];
        checkboxes.forEach(cb => {
            if (cb.checked) permissions.push(cb.dataset.perm);
        });
        db.update('users', userId, { permissions });

        // Update session if editing self
        if (Auth.currentUser && Auth.currentUser.id === userId) {
            Auth.currentUser.permissions = permissions;
            sessionStorage.setItem('ares_session', JSON.stringify(Auth.currentUser));
            App.setupSidebar();
        }

        Modal.hide();
        Toast.show(t('success'), t('permissions_saved'), 'success');
        this.goToUsersTab();
    },

    resetPermissions(userId) {
        const user = db.getById('users', userId);
        if (!user) return;
        db.update('users', userId, { permissions: null });

        if (Auth.currentUser && Auth.currentUser.id === userId) {
            Auth.currentUser.permissions = null;
            sessionStorage.setItem('ares_session', JSON.stringify(Auth.currentUser));
            App.setupSidebar();
        }

        Modal.hide();
        Toast.show(t('success'), t('permissions_reset'), 'info');
        this.goToUsersTab();
    },

    /* ── Appearance Settings ── */
    renderAppearanceSettings() {
        const currentTheme = localStorage.getItem('ares_theme') || 'dark';
        const getBool = (key) => db.getSetting(key, 'true') === 'true';
        const getVal = (key, def) => db.getSetting(key, def);

        return `
            <!-- Theme Section -->
            <div class="glass-card p-24 mb-20">
                <h3 style="margin-bottom:20px;">🎨 ${t('appearance_settings')}</h3>
                
                <div class="grid-2 mb-20">
                    <div class="glass-card p-20" style="cursor:pointer; text-align:center; border-width:2px; ${currentTheme === 'dark' ? 'border-color:var(--accent-start);' : ''}" onclick="Settings.setTheme('dark')">
                        <div style="font-size:48px; margin-bottom:8px;">🌙</div>
                        <h4>${t('dark_mode')}</h4>
                        <p style="font-size:12px; color:var(--text-muted);">${t('dark_mode_desc')}</p>
                        ${currentTheme === 'dark' ? `<span class="badge badge-accent" style="margin-top:8px;">${t('active')}</span>` : ''}
                    </div>
                    <div class="glass-card p-20" style="cursor:pointer; text-align:center; border-width:2px; ${currentTheme === 'light' ? 'border-color:var(--accent-start);' : ''}" onclick="Settings.setTheme('light')">
                        <div style="font-size:48px; margin-bottom:8px;">☀️</div>
                        <h4>${t('light_mode')}</h4>
                        <p style="font-size:12px; color:var(--text-muted);">${t('light_mode_desc')}</p>
                        ${currentTheme === 'light' ? `<span class="badge badge-accent" style="margin-top:8px;">${t('active')}</span>` : ''}
                    </div>
                </div>

                <div class="glass-card p-20" style="background:var(--info-bg); border-color:rgba(0,180,216,0.2);">
                    <p style="font-size:12px; color:var(--info);">💡 ${t('theme_toggle_hint')}</p>
                </div>
            </div>

            <!-- Invoice Appearance Section -->
            <div class="glass-card p-24">
                <h3 style="margin-bottom:20px;">🧾 ${t('invoice_appearance')}</h3>
                
                <div class="grid-2">
                    <!-- Header Section -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_header')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_logo" ${getBool('inv_show_logo') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_logo">${t('show_logo')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_name" ${getBool('inv_show_company_name') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_name">${t('show_company_name')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_address" ${getBool('inv_show_company_address') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_address">${t('show_company_address')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_company_phone" ${getBool('inv_show_company_phone') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_company_phone">${t('show_company_phone')}</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="inv_show_vat_number" ${getBool('inv_show_vat_number') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_vat_number">${t('show_vat_number')}</label>
                        </div>
                    </div>

                    <!-- Details Section -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_details')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_cashier" ${getBool('inv_show_cashier') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_cashier">${t('show_cashier')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_customer" ${getBool('inv_show_customer') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_customer">${t('show_customer')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_discount" ${getBool('inv_show_discount') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_discount">${t('show_discount')}</label>
                        </div>
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_payment_method" ${getBool('inv_show_payment_method') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_payment_method">${t('show_payment_method')}</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="inv_show_paid_change" ${getBool('inv_show_paid_change') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_paid_change">${t('show_paid_change')}</label>
                        </div>
                    </div>
                </div>

                <div class="grid-2">
                    <!-- QR / Barcode Section -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">📱 ${t('show_qr')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_qr" ${getBool('inv_show_qr') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_qr">${t('show_qr')}</label>
                        </div>
                        
                        <div class="form-group mt-10">
                            <label>${t('qr_position')}</label>
                            <select class="form-control" id="inv_qr_position">
                                <option value="bottom" ${getVal('inv_qr_position', 'bottom') === 'bottom' ? 'selected' : ''}>${t('qr_bottom')}</option>
                                <option value="top" ${getVal('inv_qr_position', 'bottom') === 'top' ? 'selected' : ''}>${t('qr_top')}</option>
                            </select>
                        </div>
                        
                        <div class="form-group mt-10">
                            <label>${t('qr_align')}</label>
                            <select class="form-control" id="inv_qr_align">
                                <option value="center" ${getVal('inv_qr_align', 'center') === 'center' ? 'selected' : ''}>${t('qr_align_center')}</option>
                                <option value="right" ${getVal('inv_qr_align', 'center') === 'right' ? 'selected' : ''}>${t('qr_align_right')}</option>
                                <option value="left" ${getVal('inv_qr_align', 'center') === 'left' ? 'selected' : ''}>${t('qr_align_left')}</option>
                            </select>
                        </div>
                    </div>

                    <!-- Footer & Layout -->
                    <div class="glass-card p-20 mb-20" style="border-color:var(--border-color);">
                        <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">${t('inv_footer')} & ${t('inv_layout')}</h4>
                        
                        <div class="form-check form-switch mb-10">
                            <input class="form-check-input" type="checkbox" id="inv_show_footer" ${getBool('inv_show_footer') ? 'checked' : ''}>
                            <label class="form-check-label" for="inv_show_footer">${t('show_footer')}</label>
                        </div>
                        
                        <div class="form-group mb-10">
                            <label>${t('footer_text')}</label>
                            <input type="text" class="form-control" id="inv_footer_text" value="${getVal('inv_footer_text', t('thank_you') || 'Thank you')}">
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label>${t('font_size')}</label>
                                <select class="form-control" id="inv_font_size">
                                    <option value="small" ${getVal('inv_font_size', 'medium') === 'small' ? 'selected' : ''}>${t('font_small')}</option>
                                    <option value="medium" ${getVal('inv_font_size', 'medium') === 'medium' ? 'selected' : ''}>${t('font_medium')}</option>
                                    <option value="large" ${getVal('inv_font_size', 'medium') === 'large' ? 'selected' : ''}>${t('font_large')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>${t('paper_width')}</label>
                                <select class="form-control" id="inv_paper_width">
                                    <option value="80mm" ${getVal('inv_paper_width', '80mm') === '80mm' ? 'selected' : ''}>80mm</option>
                                    <option value="58mm" ${getVal('inv_paper_width', '80mm') === '58mm' ? 'selected' : ''}>58mm</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-bottom:20px;">
                    <button class="btn btn-primary" onclick="Settings.saveInvoiceSettings()">💾 ${t('save_changes')}</button>
                </div>

                <!-- Live Preview -->
                <div class="glass-card p-20" style="border-color:var(--border-color);">
                    <h4 style="margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">👁️ ${t('invoice_preview')}</h4>
                    <div id="inv-preview-container" style="display:flex; justify-content:center;">
                        <div id="inv-preview" style="background:#fff; color:#000; border:1px solid #ccc; border-radius:8px; padding:12px; max-width:300px; width:100%; font-family:'Courier New', monospace; font-size:12px; direction:rtl; text-align:right;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ares_theme', theme);
        App.updateThemeIcon(theme);
        Toast.show(t('appearance'), theme === 'light' ? `☀️ ${t('light_mode_activated')}` : `🌙 ${t('dark_mode_activated')}`, 'info', 2000);
        document.getElementById('settings-content').innerHTML = this.renderAppearanceSettings();
        this.initInvoicePreviewListeners();
    },

    /* ── Invoice Live Preview ── */
    initInvoicePreviewListeners() {
        // Attach onchange to all invoice setting elements
        const ids = [
            'inv_show_logo', 'inv_show_company_name', 'inv_show_company_address',
            'inv_show_company_phone', 'inv_show_vat_number', 'inv_show_cashier',
            'inv_show_customer', 'inv_show_discount', 'inv_show_payment_method',
            'inv_show_paid_change', 'inv_show_qr', 'inv_show_footer',
            'inv_qr_position', 'inv_qr_align', 'inv_font_size', 'inv_paper_width'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.updateInvoicePreview());
        });
        // Footer text input
        const footerEl = document.getElementById('inv_footer_text');
        if (footerEl) footerEl.addEventListener('input', () => this.updateInvoicePreview());
        // Initial render
        this.updateInvoicePreview();
    },

    updateInvoicePreview() {
        const container = document.getElementById('inv-preview');
        if (!container) return;

        // Read from form elements directly (not DB) so preview is live
        const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : true; };
        const val = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };

        const showLogo = chk('inv_show_logo');
        const showName = chk('inv_show_company_name');
        const showAddr = chk('inv_show_company_address');
        const showPhone = chk('inv_show_company_phone');
        const showVat = chk('inv_show_vat_number');
        const showCashier = chk('inv_show_cashier');
        const showCustomer = chk('inv_show_customer');
        const showDiscount = chk('inv_show_discount');
        const showPayment = chk('inv_show_payment_method');
        const showPaidChange = chk('inv_show_paid_change');
        const showQr = chk('inv_show_qr');
        const showFooter = chk('inv_show_footer');
        const qrPos = val('inv_qr_position', 'bottom');
        const qrAlign = val('inv_qr_align', 'center');
        const fontSize = val('inv_font_size', 'medium');
        const paperWidth = val('inv_paper_width', '80mm');
        const footerText = val('inv_footer_text', t('thank_you'));

        // Company info from DB
        const companyName = db.getSetting('company_name', 'ARES Casher Pro');
        const companyNameEn = db.getSetting('company_name_en', '');
        const companyAddress = db.getSetting('company_address', 'الرياض، المملكة العربية السعودية');
        const companyPhone = db.getSetting('company_phone', '+966 50 000 0000');
        const vatNumber = db.getSetting('vat_number', '300000000000003');
        const logo = db.getSetting('company_logo', '');
        const currency = db.getSetting('currency', 'ر.س');

        const fs = fontSize === 'small' ? '10px' : fontSize === 'large' ? '14px' : '12px';
        const pw = paperWidth === '58mm' ? '220px' : '300px';

        const sep = '<hr style="border:none;border-top:1px dashed #999;margin:6px 0;">';
        const qrBlock = showQr ? `<div style="text-align:${qrAlign};margin:6px 0;"><div style="display:inline-block;width:80px;height:80px;border:2px solid #333;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#666;">QR Code</div></div>` : '';

        let html = `<div style="font-size:${fs};max-width:${pw};margin:0 auto;line-height:1.5;">`;

        // Header
        html += '<div style="text-align:center;">';
        if (showLogo && logo) html += `<img src="${logo}" style="width:40px;height:40px;object-fit:contain;margin:0 auto 4px;display:block;border-radius:6px;">`;
        if (showLogo && !logo) html += '<div style="width:40px;height:40px;background:#eee;border-radius:6px;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:18px;">🏢</div>';
        if (showName) html += `<div style="font-weight:800;font-size:1.1em;">${Utils.escapeHTML(companyName)}</div>`;
        if (showName && companyNameEn) html += `<div style="font-size:0.85em;color:#666;">${Utils.escapeHTML(companyNameEn)}</div>`;
        if (showAddr && companyAddress) html += `<div style="font-size:0.85em;color:#555;">${Utils.escapeHTML(companyAddress)}</div>`;
        if (showPhone && companyPhone) html += `<div style="font-size:0.85em;color:#555;">📞 ${companyPhone}</div>`;
        if (showVat && vatNumber) html += `<div style="font-size:0.85em;color:#555;">${t('vat_number')}: ${vatNumber}</div>`;
        html += '</div>';

        html += sep;
        html += `<div style="text-align:center;font-weight:700;">${t('simplified_tax_invoice') || 'فاتورة ضريبية مبسطة'}</div>`;
        html += sep;

        // Invoice info
        html += `<div style="display:flex;justify-content:space-between;"><span>${t('invoice_number')}:</span><span style="font-weight:700;">INV-001</span></div>`;
        html += `<div style="display:flex;justify-content:space-between;"><span>${t('date')}:</span><span>2026/02/14 12:00</span></div>`;
        if (showCashier) html += `<div style="display:flex;justify-content:space-between;"><span>${t('cashier')}:</span><span>أحمد</span></div>`;
        if (showCustomer) html += `<div style="display:flex;justify-content:space-between;"><span>${t('customer')}:</span><span>عميل عام</span></div>`;

        // QR Top
        if (qrPos === 'top') html += qrBlock;

        html += sep;

        // Items
        html += `<div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.9em;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:4px;">
            <span style="width:40%;">${t('product') || 'المنتج'}</span>
            <span style="width:15%;text-align:center;">${t('qty') || 'الكمية'}</span>
            <span style="width:20%;text-align:left;">${t('price') || 'السعر'}</span>
            <span style="width:25%;text-align:left;">${t('total') || 'الإجمالي'}</span>
        </div>`;
        html += `<div style="display:flex;justify-content:space-between;font-size:0.9em;"><span style="width:40%;">قهوة عربية</span><span style="width:15%;text-align:center;">2</span><span style="width:20%;text-align:left;">15.00</span><span style="width:25%;text-align:left;font-weight:700;">30.00</span></div>`;
        html += `<div style="display:flex;justify-content:space-between;font-size:0.9em;"><span style="width:40%;">كيك شوكولاتة</span><span style="width:15%;text-align:center;">1</span><span style="width:20%;text-align:left;">25.00</span><span style="width:25%;text-align:left;font-weight:700;">25.00</span></div>`;

        html += sep;

        // Totals
        html += `<div style="display:flex;justify-content:space-between;"><span>${t('subtotal')}:</span><span>55.00 ${currency}</span></div>`;
        if (showDiscount) html += `<div style="display:flex;justify-content:space-between;color:#c00;"><span>${t('discount')}:</span><span>-5.00 ${currency}</span></div>`;
        html += `<div style="display:flex;justify-content:space-between;"><span>${t('vat')} (15%):</span><span>7.50 ${currency}</span></div>`;
        html += `<div style="display:flex;justify-content:space-between;font-weight:800;font-size:1.2em;border-top:2px solid #000;padding-top:4px;margin-top:4px;"><span>${t('grand_total')}:</span><span>57.50 ${currency}</span></div>`;

        if (showPayment) html += `<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>${t('payment_method')}:</span><span>${t('cash_sales') || 'نقدي'}</span></div>`;
        if (showPaidChange) {
            html += `<div style="display:flex;justify-content:space-between;"><span>${t('amount_paid') || 'المبلغ المدفوع'}:</span><span>60.00 ${currency}</span></div>`;
            html += `<div style="display:flex;justify-content:space-between;"><span>${t('change') || 'الباقي'}:</span><span>2.50 ${currency}</span></div>`;
        }

        // QR Bottom
        if (qrPos === 'bottom') html += qrBlock;

        // Footer
        if (showFooter) {
            html += sep;
            html += `<div style="text-align:center;font-size:0.9em;color:#555;">${Utils.escapeHTML(footerText)}</div>`;
            html += '<div style="text-align:center;font-size:0.8em;color:#999;margin-top:2px;">ARES Casher Pro</div>';
        }

        html += '</div>';
        container.innerHTML = html;
        container.style.maxWidth = pw;
    },

    /* ── Keyboard Shortcuts ── */
    renderShortcuts() {
        const shortcuts = [
            { key: 'F1', action: `🛒 ${t('pos')}` },
            { key: 'F2', action: `📊 ${t('dashboard')}` },
            { key: 'F3', action: `📦 ${t('product_management')}` },
            { key: 'F4', action: `🧾 ${t('invoices')}` },
            { key: 'F5', action: `📈 ${t('reports')}` },
            { key: 'F7', action: `⏰ ${t('shifts')}` },
            { key: 'Esc', action: `❌ ${t('close')}` },
        ];

        return `
            <div class="glass-card p-24">
                <h3 style="margin-bottom:20px;">⌨️ ${t('keyboard_shortcuts')}</h3>
                <div class="shortcuts-grid">
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <span>${s.action}</span>
                            <span class="shortcut-key">${s.key}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /* ── Backup ── */
    renderBackupSettings() {
        return `
            <div class="glass-card p-24">
                <h3 style="margin-bottom:20px;">💾 ${t('backup_restore')}</h3>

                <div class="glass-card p-20 mb-20" style="background: var(--success-bg); border-color: rgba(0,214,143,0.2);">
                    <h4 style="margin-bottom:8px;">📤 ${t('export_data')}</h4>
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">${t('export_desc')}</p>
                    <button class="btn btn-success" onclick="Settings.exportData()">📤 ${t('export_backup')}</button>
                </div>

                <div class="glass-card p-20 mb-20" style="background: var(--warning-bg); border-color: rgba(255,170,0,0.2);">
                    <h4 style="margin-bottom:8px;">📥 ${t('import_data')}</h4>
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">⚠️ ${t('import_warning')}</p>
                    <button class="btn btn-warning" onclick="Settings.importData()">📥 ${t('import_backup')}</button>
                </div>

                <div class="glass-card p-20" style="background: var(--danger-bg); border-color: rgba(255,77,106,0.2);">
                    <h4 style="margin-bottom:8px;">🗑️ ${t('clear_all_data')}</h4>
                    <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">⛔ ${t('clear_warning')}</p>
                    <button class="btn btn-danger" onclick="Settings.clearAllData()">🗑️ ${t('clear_data')}</button>
                </div>
            </div>
        `;
    },

    exportData() {
        const data = db.backupAll();
        data._meta = {
            exported: new Date().toISOString(),
            system: 'ARES Casher Pro',
            version: '2.0'
        };
        const filename = `ares_backup_${new Date().toISOString().split('T')[0]}.json`;
        Utils.exportJSON(data, filename);
        Toast.show(t('success'), `${t('backup_exported')}: ${filename}`, 'success');
    },

    async importData() {
        try {
            const data = await Utils.importJSON();
            if (!data._meta || data._meta.system !== 'ARES Casher Pro') {
                Toast.show(t('error'), t('invalid_backup'), 'error');
                return;
            }
            Modal.show(`⚠️ ${t('confirm_import')}`, `
                <p>${t('import_replace_warning')}</p>
                <p style="color:var(--text-muted); font-size:13px; margin-top:8px;">${t('backup_date')}: ${Utils.formatDateTime(data._meta.exported)}</p>
            `, `
                <button class="btn btn-warning" id="confirm-import-btn">${t('confirm_import')}</button>
                <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
            `);
            document.getElementById('confirm-import-btn').onclick = () => {
                delete data._meta;
                db.restoreAll(data);
                Modal.hide();
                Toast.show(t('success'), t('data_imported'), 'success');
                setTimeout(() => location.reload(), 1000);
            };
        } catch (err) {
            Toast.show(t('error'), err.toString(), 'error');
        }
    },

    clearAllData() {
        Modal.show(`⛔ ${t('confirm_clear')}`, `
            <p style="color: var(--danger);">${t('clear_confirm_msg')}</p>
            <p style="font-size:13px; color:var(--text-muted); margin-top:8px;">${t('no_undo')}</p>
        `, `
            <button class="btn btn-danger" onclick="Settings.confirmClear()">${t('yes_clear_all')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    confirmClear() {
        const collections = ['users', 'products', 'categories', 'customers', 'sales', 'shifts', 'settings', 'held_orders'];
        collections.forEach(c => localStorage.removeItem('ares_pos_' + c));
        Modal.hide();
        Toast.show(t('success'), t('all_data_cleared'), 'success');
        setTimeout(() => location.reload(), 1000);
    },

    goToUsersTab() {
        this.render();
        setTimeout(() => {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(t => t.classList.remove('active'));
            tabs[2].classList.add('active');
            document.getElementById('settings-content').innerHTML = this.renderUserManagement();
        }, 50);
    }
};
