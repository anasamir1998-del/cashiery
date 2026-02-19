/* ============================================================
   ARES Casher Pro — Customer Management Module
   ============================================================ */

const Customers = {
    render() {
        const content = document.getElementById('content-body');
        const allCustomers = db.getCollection('customers');
        const currentBranch = Auth.getBranchId();

        // Scope
        const customers = currentBranch
            ? allCustomers.filter(c => !c.branchId || c.branchId === currentBranch)
            : allCustomers;

        content.innerHTML = `
            <div class="stagger-in">
                <div class="flex items-center justify-between mb-24">
                    <input type="text" class="form-control" id="customer-search" placeholder="🔍 ${t('search_customer')}" style="width:300px;" oninput="Customers.filterList()">
                    ${Auth.hasPermission('manage_customers') ? `<button class="btn btn-primary" onclick="Customers.showForm()">➕ ${t('add_customer')}</button>` : ''}
                </div>

                <div class="glass-card" style="overflow: hidden;">
                    <table class="data-table" id="customers-table">
                        <thead>
                            <tr>
                                <th>${t('customer')}</th>
                                <th>${t('phone')}</th>
                                <th>${t('email')}</th>
                                <th>${t('vat_number')}</th>
                                <th>${t('purchases_count')}</th>
                                <th>${t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map(c => {
            const purchases = db.count('sales', s => s.customerId === c.id);
            return `
                                <tr data-name="${c.name.toLowerCase()}">
                                    <td><strong>${Utils.escapeHTML(c.name)}</strong></td>
                                    <td style="font-family:Inter; direction:ltr;">${c.phone || '—'}</td>
                                    <td>${c.email || '—'}</td>
                                    <td style="font-family:Inter;">${c.vatNumber || '—'}</td>
                                    <td><span class="badge badge-accent">${purchases}</span></td>
                                    <td>
                                        ${Auth.hasPermission('manage_customers') ? `
                                        <button class="btn btn-ghost btn-sm" onclick="Customers.editCustomer('${c.id}')">✏️</button>
                                        <button class="btn btn-ghost btn-sm" onclick="Customers.deleteCustomer('${c.id}')">🗑️</button>
                                        ` : '<span style="color:var(--text-muted);">🔒</span>'}
                                    </td>
                                </tr>`;
        }).join('')}
                        </tbody>
                    </table>
                    ${customers.length === 0 ? `<div class="empty-state p-24"><div style="font-size:48px;">👥</div><h3>${t('no_customers')}</h3><p style="color:var(--text-muted);">${t('add_customers_hint')}</p></div>` : ''}
                </div>
            </div>
        `;
    },

    filterList() {
        const q = document.getElementById('customer-search').value.toLowerCase();
        document.querySelectorAll('#customers-table tbody tr').forEach(row => {
            row.style.display = row.dataset.name.includes(q) ? '' : 'none';
        });
    },

    showForm(customer = null) {
        const isEdit = !!customer;
        Modal.show(isEdit ? `✏️ ${t('edit_customer')}` : `➕ ${t('add_customer')}`, `
            <div class="form-group">
                <label>${t('customer_name')} *</label>
                <input type="text" class="form-control" id="c-name" value="${customer ? Utils.escapeHTML(customer.name) : ''}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>${t('phone')}</label>
                    <input type="text" class="form-control" id="c-phone" value="${customer?.phone || ''}" placeholder="05xxxxxxxx" style="direction:ltr;">
                </div>
                <div class="form-group">
                    <label>${t('email')}</label>
                    <input type="email" class="form-control" id="c-email" value="${customer?.email || ''}" style="direction:ltr;">
                </div>
            </div>
            <div class="form-group">
                <label>${t('vat_number')} (VAT Number)</label>
                <input type="text" class="form-control" id="c-vat" value="${customer?.vatNumber || ''}" placeholder="3xxxxxxxxxxxxxxx" style="direction:ltr;">
                <small style="color: var(--text-muted); font-size: 12px;">${t('required_for_tax')}</small>
            </div>
            <div class="form-group">
                <label>${t('address')}</label>
                <textarea class="form-control" id="c-address" rows="2">${customer?.address || ''}</textarea>
            </div>
            
            ${Auth.isGlobal() ? `
            <div class="form-group">
                <label>${t('branch')} (${t('admin_only')})</label>
                <select class="form-control" id="c-branch">
                    <option value="">🌐 ${t('all_branches')}</option>
                    ${db.getCollection('branches').filter(b => b.active).map(b => `<option value="${b.id}" ${customer?.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                </select>
            </div>
            ` : `<input type="hidden" id="c-branch" value="${customer?.branchId || Auth.getBranchId() || ''}">`}
        `, `
            <button class="btn btn-primary" onclick="Customers.saveCustomer(${isEdit ? `'${customer.id}'` : 'null'})">${isEdit ? t('save_changes') : t('add_customer')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    saveCustomer(id) {
        const name = document.getElementById('c-name').value.trim();
        if (!name) {
            Toast.show(t('error'), t('enter_customer_name'), 'error');
            return;
        }
        const data = {
            name,
            phone: document.getElementById('c-phone').value.trim(),
            email: document.getElementById('c-email').value.trim(),
            vatNumber: document.getElementById('c-vat').value.trim(),
            address: document.getElementById('c-address').value.trim(),
            branchId: document.getElementById('c-branch') ? document.getElementById('c-branch').value : (Auth.getBranchId() || null)
        };
        if (id) {
            db.update('customers', id, data);
            Toast.show(t('success'), t('customer_edited'), 'success');
        } else {
            db.insert('customers', data);
            Toast.show(t('success'), t('customer_added'), 'success');
        }
        Modal.hide();
        this.render();
    },

    editCustomer(id) {
        const customer = db.getById('customers', id);
        if (customer) this.showForm(customer);
    },

    deleteCustomer(id) {
        Modal.show(`⚠️ ${t('confirm_delete')}`, `<p>${t('confirm_delete_msg')}</p>`, `
            <button class="btn btn-danger" onclick="db.delete('customers','${id}'); Modal.hide(); Customers.render(); Toast.show(t('success'),t('customer_deleted'),'success');">${t('delete')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    }
};
