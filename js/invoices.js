/* ============================================================
   Cashiery — Invoices Module
   ============================================================ */

const Invoices = {
    render() {
        const content = document.getElementById('content-body');
        const isAdmin = Auth.isAdmin(); // Keep for UI logic, but filter data by permission
        const userId = Auth.currentUser.id;
        const canViewAll = Auth.hasPermission('view_invoices'); // Renaming concept: view_invoices now means ALL invoices
        const currentBranch = Auth.getBranchId();

        let sales = db.getCollection('sales').reverse();

        // Branch Scope
        if (currentBranch) {
            sales = sales.filter(s => !s.branchId || s.branchId === currentBranch);
        }

        if (!canViewAll) {
            sales = sales.filter(s => s.cashierId === userId);
        }

        content.innerHTML = `
            <div class="stagger-in">
                <div class="flex items-center justify-between mb-24">
                    <h2 style="font-size:20px; font-weight:700;">🧾 ${isAdmin ? t('all_invoices') : t('my_invoices')}</h2>
                    <span class="badge badge-accent">${sales.length} ${t('invoice')}</span>
                </div>

                <!-- Search & Filter -->
                <div class="flex gap-12 mb-20">
                    <input type="text" class="form-control" style="flex:1;" placeholder="🔍 ${t('search_invoice')}" oninput="Invoices.filter(this.value)" id="inv-search">
                    <input type="text" class="form-control" style="width:180px; background-color:var(--element-bg); direction:rtl; text-align:right;" placeholder="📅 ${t('date')}" id="inv-date">
                </div>

                <div class="glass-card" style="overflow:hidden;">
                    <table class="data-table" id="invoices-table">
                        <thead>
                            <tr>
                                <th>${t('invoice_number')}</th>
                                <th>${t('date')}</th>
                                ${isAdmin ? `<th>${t('cashier')}</th>` : ''}
                                <th>${t('customer')}</th>
                                <th>${t('total')}</th>
                                <th>${t('vat')}</th>
                                <th>${t('payment_method')}</th>
                                <th>${t('type')}</th>
                                <th>${t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-tbody">
                            ${this.renderRows(sales)}
                        </tbody>
                    </table>
                    ${sales.length === 0 ? `<div class="empty-state p-24"><p>${t('no_invoices')}</p></div>` : ''}
                </div>
            </div>
        `;

        // Initialize Flatpickr
        setTimeout(() => {
            if (typeof flatpickr !== 'undefined') {
                flatpickr("#inv-date", {
                    locale: I18n.currentLang === 'ar' ? 'ar' : 'default',
                    dateFormat: "Y-m-d",
                    theme: "dark",
                    disableMobile: true,
                    onChange: function (selectedDates, dateStr, instance) {
                        Invoices.filterByDate(dateStr);
                    }
                });
            }
        }, 50);
    },

    renderRows(sales) {
        const isAdmin = Auth.isAdmin();
        return sales.map(s => {
            const isSimplified = !s.customerName || s.total <= 1000;
            const payLabel = s.paymentMethod === 'نقدي' ? t('cash_sales') : s.paymentMethod === 'بطاقة' ? t('card_sales') : s.paymentMethod === 'تحويل' ? t('transfer_sales') : (s.paymentMethod || '—');
            return `
            <tr>
                <td style="font-family:Inter; font-weight:600;">${s.invoiceNumber || '—'}</td>
                <td style="font-size:13px;">${Utils.formatDateTime(s.createdAt)}</td>
                ${isAdmin ? `<td>${s.cashierName ? Utils.escapeHTML(s.cashierName) : '<span style="color:var(--text-muted)">—</span>'}</td>` : ''}
                <td>${s.customerName ? Utils.escapeHTML(s.customerName) : `<span style="color:var(--text-muted);">${t('cash_customer')}</span>`}</td>
                <td style="font-family:Inter; font-weight:700;">${Utils.formatSAR(s.total)}</td>
                <td style="font-family:Inter; color:var(--warning);">${Utils.formatSAR(s.vatAmount)}</td>
                <td><span class="badge badge-info">${payLabel}</span></td>
                <td><span class="badge ${isSimplified ? 'badge-accent' : 'badge-success'}">${isSimplified ? t('simplified') : t('full_invoice')}</span></td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="Invoices.viewInvoice('${s.id}')" title="${t('view')}">👁️</button>
                    ${Auth.hasPermission('manage_invoices') ? `<button class="btn btn-ghost btn-sm" onclick="Invoices.editInvoice('${s.id}')" title="${t('edit')}">✏️</button>` : ''}
                    ${Auth.hasPermission('delete_sales') ? `<button class="btn btn-ghost btn-sm" onclick="Invoices.deleteInvoice('${s.id}')" title="${t('delete')}" style="color:var(--danger)">🗑️</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="Invoices.printInvoice('${s.id}')" title="${t('print_a4')}">🖨️</button>
                    <button class="btn btn-ghost btn-sm" onclick="Invoices.printReceipt('${s.id}')" title="${t('print_receipt')}">🧾</button>
                </td>
            </tr>`;
        }).join('');
    },

    deleteInvoice(id) {
        if (!confirm(t('delete') + '?')) return;

        const sale = db.getById('sales', id);
        if (sale) {
            // Restore stock
            sale.items.forEach(item => {
                const product = db.getById('products', item.productId);
                if (product && product.stock !== undefined) {
                    db.update('products', item.productId, {
                        stock: Number(product.stock) + Number(item.qty)
                    });
                }
            });

            db.removeById('sales', id);
            this.render();
            Toast.show(t('success'), t('operation_done'), 'success');
        }
    },

    editInvoice(id) {
        const sale = db.getById('sales', id);
        if (sale) {
            if (POS.cart.length > 0 && !confirm(t('confirm') + ' (' + t('cart') + ')')) return;
            POS.loadInvoice(sale);
        }
    },

    filter(query) {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        let sales = db.getCollection('sales').reverse();
        if (!isAdmin) sales = sales.filter(s => s.cashierId === userId);
        const filtered = query
            ? sales.filter(s => (s.invoiceNumber || '').includes(query) || (s.customerName || '').includes(query))
            : sales;
        document.getElementById('invoices-tbody').innerHTML = this.renderRows(filtered);
    },

    filterByDate(dateStr) {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        let sales = db.getCollection('sales').reverse();
        if (!isAdmin) sales = sales.filter(s => s.cashierId === userId);
        if (!dateStr) {
            document.getElementById('invoices-tbody').innerHTML = this.renderRows(sales);
            return;
        }
        const filtered = sales.filter(s => s.createdAt && s.createdAt.startsWith(dateStr));
        document.getElementById('invoices-tbody').innerHTML = this.renderRows(filtered);
    },

    viewInvoice(id) {
        const sale = db.getById('sales', id);
        if (!sale) return;

        const isSimplified = !sale.customerName || sale.total <= 1000;
        const payLabel = sale.paymentMethod === 'نقدي' ? t('cash_sales') : sale.paymentMethod === 'بطاقة' ? t('card_sales') : sale.paymentMethod === 'تحويل' ? t('transfer_sales') : (sale.paymentMethod || '—');

        Modal.show(`🧾 ${t('view_invoice')}`, `
            <div style="text-align:center; margin-bottom:16px;">
                ${App.getCompanyBrandHTML()}
            </div>
            
            <div class="glass-card p-20 mb-16">
                <div class="flex justify-between mb-4"><span>${t('invoice_number')}:</span><span style="font-family:Inter; font-weight:600;">${sale.invoiceNumber}</span></div>
                <div class="flex justify-between mb-4"><span>${t('date')}:</span><span>${Utils.formatDateTime(sale.createdAt)}</span></div>
                <div class="flex justify-between mb-4"><span>${t('type')}:</span><span class="badge ${isSimplified ? 'badge-accent' : 'badge-success'}">${isSimplified ? t('simplified_tax_invoice') : t('tax_invoice')}</span></div>
                <div class="flex justify-between mb-4"><span>${t('payment_method')}:</span><span>${payLabel}</span></div>
                ${sale.customerName ? `<div class="flex justify-between mb-4"><span>${t('customer')}:</span><span>${Utils.escapeHTML(sale.customerName)}</span></div>` : ''}
                ${sale.customerVAT ? `<div class="flex justify-between"><span>${t('vat_number')}:</span><span style="font-family:Inter;">${sale.customerVAT}</span></div>` : ''}
            </div>

            <table class="data-table" style="margin-bottom:16px;">
                <thead><tr><th>#</th><th>${t('item_name')}</th><th>${t('quantity')}</th><th>${t('unit_price')}</th><th>${t('item_total')}</th></tr></thead>
                <tbody>
                    ${(sale.items || []).map((item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${Utils.escapeHTML(Utils.getName(db.getById('products', item.productId)) || item.name)}</td>
                        <td>${item.qty}</td>
                        <td style="font-family:Inter;">${Utils.formatSAR(item.price)}</td>
                        <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(item.price * item.qty)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>

            <div class="glass-card p-20">
                <div class="flex justify-between mb-4"><span>${t('subtotal')}:</span><span style="font-family:Inter;">${Utils.formatSAR(sale.subtotal)}</span></div>
                ${sale.discount ? `<div class="flex justify-between mb-4"><span>${t('discount')}:</span><span style="color:var(--danger); font-family:Inter;">-${Utils.formatSAR(sale.discount)}</span></div>` : ''}
                ${sale.vatAmount > 0 ?
                `<div class="flex justify-between mb-4"><span>${t('vat')} (${sale.vatRate || 15}%):</span><span style="font-family:Inter; color:var(--warning);">${Utils.formatSAR(sale.vatAmount)}</span></div>` :
                `<div class="flex justify-between mb-4"><span>${t('vat')}:</span><span style="font-family:Inter; color:var(--text-muted);">0.00</span></div>`}
                <div class="flex justify-between" style="font-size:18px; font-weight:800; padding-top:8px; border-top:1px solid var(--border-color);">
                    <span>${t('grand_total')}</span>
                    <span class="text-gradient" style="font-family:Inter;">${Utils.formatSAR(sale.total)}</span>
                </div>
            </div>

            <div style="text-align:center; margin-top:16px;" id="invoice-qr-${sale.id}"></div>
        `, `
            <button class="btn btn-primary" onclick="Invoices.printInvoice('${sale.id}')">🖨️ ${t('print_a4')}</button>
            <button class="btn btn-success" onclick="Invoices.printReceipt('${sale.id}')">🧾 ${t('print_receipt')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>
        `, { wide: true });

        // Generate QR code
        this.generateQR(sale, `invoice-qr-${sale.id}`);
    },

    generateQR(sale, containerId) {
        const companyName = db.getSetting('company_name', 'Cashiery');
        const vatNumber = db.getSetting('vat_number', '');
        const qrData = Utils.generateZATCAQR(companyName, vatNumber, sale.createdAt, sale.total.toString(), sale.vatAmount.toString());

        setTimeout(() => {
            const container = document.getElementById(containerId);
            if (container && typeof QRCode !== 'undefined') {
                container.innerHTML = '';
                new QRCode(container, {
                    text: qrData,
                    width: 150,
                    height: 150,
                    correctLevel: QRCode.CorrectLevel.M
                });
                container.insertAdjacentHTML('afterbegin', '<p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">ZATCA QR Code</p>');
            }
        }, 100);
    },

    /* ── A4 Invoice Print ── */
    // viewInvoice is already defined above for the modal view


    printInvoice(id) {
        const sale = db.getById('sales', id);
        if (!sale) return;

        const isSimplified = !sale.customerName || sale.total <= 1000;
        const brandHTML = App.getCompanyBrandHTML(true);
        const dir = I18n.getDir();
        const lang = I18n.currentLang;
        const fontFamily = lang === 'ur' ? "'Noto Nastaliq Urdu','Cairo',sans-serif" : "'Cairo',sans-serif";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${dir}" lang="${lang}">
            <head>
                <meta charset="UTF-8">
                <title>${t('invoice')} ${sale.invoiceNumber}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family:${fontFamily}; direction:${dir}; padding:30px; color:#333; font-size:13px; }
                    .header { text-align:center; margin-bottom:20px; }
                    h2 { font-size:18px; margin:4px 0; }
                    table { width:100%; border-collapse:collapse; margin:12px 0; }
                    th { background:#f0f0f0; padding:8px; text-align:${dir === 'rtl' ? 'right' : 'left'}; border:1px solid #ddd; font-size:12px; }
                    td { padding:8px; border:1px solid #ddd; font-size:12px; }
                    .totals { width:300px; ${dir === 'rtl' ? 'margin-right' : 'margin-left'}:auto; margin-top:8px; }
                    .totals td { border:none; padding:4px 8px; }
                    .totals .grand { font-size:16px; font-weight:800; border-top:2px solid #333; }
                    .footer { text-align:center; margin-top:24px; font-size:11px; color:#999; border-top:1px solid #ddd; padding-top:12px; }
                    .invoice-type { display:inline-block; padding:4px 12px; border-radius:4px; font-size:11px; font-weight:700; margin:8px 0; }
                    .simplified { background:#e3e8ff; color:#667eea; }
                    .full { background:#d4edda; color:#28a745; }
                    #qr-print { text-align:center; margin:16px 0; }
                    @media print { body { padding:15px; } }
                </style>
            </head>
            <body>
                ${brandHTML}
                <div style="text-align:center;">
                    <span class="invoice-type ${isSimplified ? 'simplified' : 'full'}">${isSimplified ? t('simplified_tax_invoice') : t('tax_invoice')}</span>
                </div>
                <table style="width:100%; border:none; margin-bottom:8px;">
                    <tr style="border:none;">
                        <td style="border:none;"><strong>${t('invoice_number')}:</strong> ${sale.invoiceNumber}</td>
                        <td style="border:none; text-align:${dir === 'rtl' ? 'left' : 'right'};"><strong>${t('date')}:</strong> ${Utils.formatDateTime(sale.createdAt)}</td>
                    </tr>
                    ${sale.customerName ? `<tr style="border:none;"><td style="border:none;"><strong>${t('customer')}:</strong> ${Utils.escapeHTML(sale.customerName)}</td><td style="border:none; text-align:${dir === 'rtl' ? 'left' : 'right'};"><strong>${t('vat_number')}:</strong> ${sale.customerVAT || '—'}</td></tr>` : ''}
                </table>

                <table>
                    <thead><tr><th>#</th><th>${t('item_name')}</th><th>${t('quantity')}</th><th>${t('unit_price')}</th><th>${t('item_total')}</th></tr></thead>
                    <tbody>
                        ${(sale.items || []).map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${Utils.escapeHTML(item.name)}</td>
                            <td>${item.qty}</td>
                            <td style="font-family:Inter;">${Utils.formatSAR(item.price)}</td>
                            <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(item.price * item.qty)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>

                <table class="totals">
                    <tr><td>${t('subtotal')}:</td><td style="text-align:${dir === 'rtl' ? 'left' : 'right'}; font-family:Inter;">${Utils.formatSAR(sale.subtotal)}</td></tr>
                    ${sale.discount ? `<tr><td>${t('discount')}:</td><td style="text-align:${dir === 'rtl' ? 'left' : 'right'}; font-family:Inter; color:red;">-${Utils.formatSAR(sale.discount)}</td></tr>` : ''}
                    ${sale.vatAmount > 0 ?
                `<tr><td>${t('vat')} (${sale.vatRate || 15}%):</td><td style="text-align:${dir === 'rtl' ? 'left' : 'right'}; font-family:Inter;">${Utils.formatSAR(sale.vatAmount)}</td></tr>` :
                `<tr><td>${t('vat')}:</td><td style="text-align:${dir === 'rtl' ? 'left' : 'right'}; font-family:Inter;">0.00</td></tr>`}
                    <tr class="grand"><td><strong>${t('grand_total')}:</strong></td><td style="text-align:${dir === 'rtl' ? 'left' : 'right'}; font-family:Inter;"><strong>${Utils.formatSAR(sale.total)}</strong></td></tr>
                </table>

                <div id="qr-print"></div>

                <div class="footer">
                    <p>${t('thank_you')}</p>
                    <p>Cashiery — ${new Date().getFullYear()}</p>
                </div>

                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
                <script>
                    setTimeout(function() {
                        try {
                            new QRCode(document.getElementById('qr-print'), {
                                text: '${Utils.generateZATCAQR(db.getSetting("company_name", "ARES"), db.getSetting("vat_number", ""), sale.createdAt, sale.total.toString(), sale.vatAmount.toString())}',
                                width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M
                            });
                        } catch(e) {}
                        setTimeout(function() { window.print(); }, 500);
                    }, 300);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /* ── POS Receipt Print (Centralized) ── */
    printReceipt(id) {
        const sale = db.getById('sales', id);
        if (!sale) return;

        if (typeof Receipt !== 'undefined') {
            Receipt.print(sale);
        } else {
            console.error("Receipt service not found");
        }
    }
};
