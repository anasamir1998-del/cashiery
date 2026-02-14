/* ============================================================
   ARES Casher Pro — Reports Module
   ============================================================ */

const Reports = {
    render() {
        const content = document.getElementById('content-body');
        const isAdmin = Auth.isAdmin();

        content.innerHTML = `
            <div class="stagger-in">
                <div class="flex items-center justify-between mb-16">
                    <div class="tabs">
                        <button class="tab-btn active" onclick="Reports.switchTab(this, 'daily')">📅 ${t('daily')}</button>
                        <button class="tab-btn" onclick="Reports.switchTab(this, 'monthly')">📆 ${t('monthly')}</button>
                        ${isAdmin ? `<button class="tab-btn" onclick="Reports.switchTab(this, 'vat')">🏦 ${t('vat_report')}</button>` : ''}
                        ${isAdmin ? `<button class="tab-btn" onclick="Reports.switchTab(this, 'products')">📦 ${t('products_report')}</button>` : ''}
                    </div>
                    <div class="flex gap-12">
                        <button class="btn btn-sm btn-outline" onclick="Reports.printReport()">🖨️ ${t('print') || 'Print'}</button>
                        <button class="btn btn-sm btn-outline" onclick="Reports.emailReport()">✉️ ${t('email') || 'Email'}</button>
                        ${!isAdmin ? `<span class="badge badge-info" style="font-size:11px;">📊 ${t('your_reports')}</span>` : ''}
                    </div>
                </div>
                <div id="report-content">
                    ${this.renderDailyReport()}
                </div>
            </div>
        `;
    },

    switchTab(btn, tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = document.getElementById('report-content');
        switch (tab) {
            case 'daily': container.innerHTML = this.renderDailyReport(); break;
            case 'monthly': container.innerHTML = this.renderMonthlyReport(); break;
            case 'vat': container.innerHTML = this.renderVATReport(); break;
            case 'products': container.innerHTML = this.renderProductsReport(); break;
        }
    },

    // Helper: get sales filtered by user
    getUserSales(filterFn) {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        return db.query('sales', s => {
            if (!isAdmin && s.cashierId !== userId) return false;
            return filterFn ? filterFn(s) : true;
        });
    },

    renderDailyReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isAdmin = Auth.isAdmin();

        const sales = this.getUserSales(s => new Date(s.createdAt) >= today);
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const totalVAT = sales.reduce((sum, s) => sum + s.vatAmount, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
        const cashSales = sales.filter(s => s.paymentMethod === 'نقدي').reduce((sum, s) => sum + s.total, 0);
        const cardSales = sales.filter(s => s.paymentMethod === 'بطاقة').reduce((sum, s) => sum + s.total, 0);
        const transferSales = sales.filter(s => s.paymentMethod === 'تحويل').reduce((sum, s) => sum + s.total, 0);

        return `
            <div class="stat-cards mb-24">
                <div class="glass-card stat-card accent">
                    <div class="stat-card-icon">💰</div>
                    <h3>${Utils.formatCurrency(totalRevenue)}</h3>
                    <p>${isAdmin ? t('total_sales') : t('your_sales_today')} (${t('sar')})</p>
                </div>
                <div class="glass-card stat-card success">
                    <div class="stat-card-icon">🧾</div>
                    <h3>${sales.length}</h3>
                    <p>${t('invoice_count')}</p>
                </div>
                <div class="glass-card stat-card warning">
                    <div class="stat-card-icon">🏦</div>
                    <h3>${Utils.formatCurrency(totalVAT)}</h3>
                    <p>${t('vat_collected')} (${t('sar')})</p>
                </div>
                <div class="glass-card stat-card danger">
                    <div class="stat-card-icon">🏷️</div>
                    <h3>${Utils.formatCurrency(totalDiscount)}</h3>
                    <p>${t('total_discounts')} (${t('sar')})</p>
                </div>
            </div>

            <div class="grid-2 mb-24">
                <div class="glass-card p-20">
                    <h3 style="margin-bottom:16px; font-size:16px;">💵 ${t('payment_breakdown')}</h3>
                    <div style="margin-bottom:12px;">
                        <div class="flex justify-between mb-4"><span>💵 ${t('cash_sales')}</span><span style="font-family:Inter; font-weight:600;">${Utils.formatSAR(cashSales)}</span></div>
                        <div style="height:6px; background:var(--bg-glass); border-radius:3px; overflow:hidden;"><div style="height:100%; width:${totalRevenue > 0 ? (cashSales / totalRevenue * 100) : 0}%; background:var(--success); border-radius:3px;"></div></div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div class="flex justify-between mb-4"><span>💳 ${t('card_sales')}</span><span style="font-family:Inter; font-weight:600;">${Utils.formatSAR(cardSales)}</span></div>
                        <div style="height:6px; background:var(--bg-glass); border-radius:3px; overflow:hidden;"><div style="height:100%; width:${totalRevenue > 0 ? (cardSales / totalRevenue * 100) : 0}%; background:var(--accent-start); border-radius:3px;"></div></div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-4"><span>🏦 ${t('transfer_sales')}</span><span style="font-family:Inter; font-weight:600;">${Utils.formatSAR(transferSales)}</span></div>
                        <div style="height:6px; background:var(--bg-glass); border-radius:3px; overflow:hidden;"><div style="height:100%; width:${totalRevenue > 0 ? (transferSales / totalRevenue * 100) : 0}%; background:var(--warning); border-radius:3px;"></div></div>
                    </div>
                </div>
                <div class="glass-card p-20">
                    <h3 style="margin-bottom:16px; font-size:16px;">🕐 ${t('today_transactions')}</h3>
                    ${sales.slice(-5).reverse().map(s => `
                        <div style="display:flex; justify-content:space-between; padding:8px; margin-bottom:6px; background:var(--bg-glass); border-radius:6px;">
                            <span style="font-size:13px;">${s.invoiceNumber}</span>
                            <span style="font-family:Inter; font-weight:600; color:var(--accent-start);">${Utils.formatSAR(s.total)}</span>
                        </div>
                    `).join('') || `<p style="color:var(--text-muted); text-align:center; padding:20px;">${t('no_transactions_today')}</p>`}
                </div>
            </div>
        `;
    },

    renderMonthlyReport() {
        const now = new Date();
        const isAdmin = Auth.isAdmin();
        const months = [];
        const locale = I18n.currentLang === 'ur' ? 'ur-PK' : I18n.currentLang === 'en' ? 'en-US' : 'ar-SA';

        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            const sales = this.getUserSales(s => {
                const sd = new Date(s.createdAt);
                return sd >= d && sd < nextMonth;
            });
            months.push({
                label: d.toLocaleDateString(locale, { year: 'numeric', month: 'long' }),
                count: sales.length,
                total: sales.reduce((sum, s) => sum + s.total, 0),
                vat: sales.reduce((sum, s) => sum + s.vatAmount, 0)
            });
        }

        return `
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${t('month')}</th>
                            <th>${t('invoice_count')}</th>
                            <th>${isAdmin ? t('total_sales') : t('your_sales')}</th>
                            <th>${t('vat')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${months.map(m => `
                        <tr>
                            <td><strong>${m.label}</strong></td>
                            <td>${m.count}</td>
                            <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(m.total)}</td>
                            <td style="font-family:Inter; color:var(--warning);">${Utils.formatSAR(m.vat)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderVATReport() {
        // VAT report always shows ALL data (admin-only access)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sales = db.query('sales', s => new Date(s.createdAt) >= startOfMonth);
        const totalSales = sales.reduce((sum, s) => sum + (s.afterDiscount || s.subtotal), 0);
        const totalVAT = sales.reduce((sum, s) => sum + s.vatAmount, 0);
        const totalWithVAT = sales.reduce((sum, s) => sum + s.total, 0);
        const vatRate = db.getSetting('vat_rate', '15');
        const locale = I18n.currentLang === 'ur' ? 'ur-PK' : I18n.currentLang === 'en' ? 'en-US' : 'ar-SA';

        return `
            <div class="glass-card p-24 mb-24" style="background: linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,170,0,0.03)); border-color: rgba(255,170,0,0.2);">
                <h2 style="font-size:20px; margin-bottom:8px;">🏦 ${t('vat_report')}</h2>
                <p style="color:var(--text-secondary);">${t('current_month')}: ${now.toLocaleDateString(locale, { year: 'numeric', month: 'long' })} | ${t('tax_rate')}: ${vatRate}%</p>
            </div>

            <div class="stat-cards mb-24">
                <div class="glass-card stat-card accent">
                    <div class="stat-card-icon">📊</div>
                    <h3>${Utils.formatCurrency(totalSales)}</h3>
                    <p>${t('sales_before_tax')}</p>
                </div>
                <div class="glass-card stat-card warning">
                    <div class="stat-card-icon">🏦</div>
                    <h3>${Utils.formatCurrency(totalVAT)}</h3>
                    <p>${t('vat_collected')}</p>
                </div>
                <div class="glass-card stat-card success">
                    <div class="stat-card-icon">💰</div>
                    <h3>${Utils.formatCurrency(totalWithVAT)}</h3>
                    <p>${t('total_with_tax')}</p>
                </div>
            </div>

            <div class="glass-card p-20">
                <h3 style="margin-bottom:16px; font-size:16px;">📋 ${t('tax_declaration_summary')}</h3>
                <table class="data-table">
                    <tbody>
                        <tr><td><strong>${t('taxable_sales_total')}</strong></td><td style="font-family:Inter;">${Utils.formatSAR(totalSales)}</td></tr>
                        <tr><td><strong>${t('vat_rate')}</strong></td><td>${vatRate}%</td></tr>
                        <tr><td><strong>${t('output_tax_collected')}</strong></td><td style="font-family:Inter; font-weight:700; color:var(--warning);">${Utils.formatSAR(totalVAT)}</td></tr>
                        <tr><td><strong>${t('invoices_in_period')}</strong></td><td>${sales.length}</td></tr>
                        <tr><td><strong>${t('vat_number')}</strong></td><td style="font-family:Inter;">${db.getSetting('vat_number', '—')}</td></tr>
                    </tbody>
                </table>
                <div style="margin-top:16px;">
                    <button class="btn btn-primary" onclick="Reports.printVATReport()">🖨️ ${t('print_vat_report')}</button>
                </div>
            </div>
        `;
    },

    renderProductsReport() {
        // Products report always shows ALL data (admin-only access)
        const sales = db.getCollection('sales');
        const productStats = {};
        sales.forEach(s => {
            (s.items || []).forEach(item => {
                const id = item.productId || item.name; // Fallback to name if no ID (legacy)
                if (!productStats[id]) {
                    productStats[id] = {
                        id: item.productId,
                        name: item.name,
                        qty: 0,
                        revenue: 0
                    };
                }
                productStats[id].qty += item.qty;
                productStats[id].revenue += item.price * item.qty;
            });
        });

        const sorted = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

        return `
            <div class="glass-card" style="overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>${t('product')}</th>
                            <th>${t('qty_sold')}</th>
                            <th>${t('total_revenue')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((p, i) => {
            const product = p.id ? db.getById('products', p.id) : null;
            const displayName = product ? product.name : p.name;
            return `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${Utils.escapeHTML(displayName)}</strong></td>
                            <td>${p.qty}</td>
                            <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(p.revenue)}</td>
                        </tr>`;
        }).join('')}
                    </tbody>
                </table>
                ${sorted.length === 0 ? `<div class="empty-state p-24"><p>${t('no_sales_data')}</p></div>` : ''}
            </div>
        `;
    },

    /* ── Export Logic ── */
    printReport() {
        const content = document.getElementById('report-content');
        const brandHTML = App.getCompanyBrandHTML ? App.getCompanyBrandHTML(true) : '';
        const dir = I18n.getDir();
        const lang = I18n.currentLang;
        const fontFamily = lang === 'ur' ? "'Noto Nastaliq Urdu','Cairo',sans-serif" : "'Cairo',sans-serif";
        const title = document.querySelector('.tab-btn.active').innerText.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${dir}" lang="${lang}">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: ${fontFamily}; direction: ${dir}; padding: 30px; color: #333; }
                    h2, h3 { margin: 12px 0; }
                    /* Hide non-printable elements like buttons if they were cloned */
                    button { display: none !important; }
                    
                    /* Tables */
                    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                    th { background: #f0f0f0; padding: 10px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; border: 1px solid #ddd; font-size: 13px; font-weight: 700; }
                    td { padding: 10px; border: 1px solid #ddd; font-size: 13px; }
                    
                    /* Stat Cards */
                    .stat-cards { display: flex; gap: 15px; margin-bottom: 24px; }
                    .stat-card { flex: 1; padding: 16px; border: 1px solid #ddd; border-radius: 8px; text-align: center; background: #fafafa; }
                    .stat-card-icon { font-size: 24px; margin-bottom: 8px; }
                    .stat-card h3 { font-size: 20px; margin: 4px 0; font-weight: bold; color: #333; }
                    .stat-card p { font-size: 12px; color: #666; margin: 0; }

                    /* Grid Layouts restoration for print */
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .glass-card { border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 15px; }

                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${brandHTML}
                <h2 style="text-align:center; margin-bottom: 5px;">${title}</h2>
                <p style="text-align:center; color:#999; font-size:12px; margin-bottom: 30px;">${t('print_date')}: ${Utils.formatDateTime(new Date().toISOString())}</p>
                ${content.innerHTML}
                <script>
                    setTimeout(() => { window.print(); window.close(); }, 800);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    emailReport() {
        const title = document.querySelector('.tab-btn.active').innerText.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();
        const date = Utils.formatDate(new Date());

        let summary = `${title}\n${t('date')}: ${date}\n\n`;

        // Extract basic stats text
        const cards = document.querySelectorAll('#report-content .stat-card');
        if (cards.length > 0) {
            cards.forEach(card => {
                const label = card.querySelector('p')?.innerText || '';
                const value = card.querySelector('h3')?.innerText || '';
                summary += `${label}: ${value}\n`;
            });
        }

        // Extract table data if exists (Monthly report)
        const table = document.querySelector('#report-content table');
        if (table) {
            summary += `\n--------------------------------\n`;
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('th, td');
                const rowText = Array.from(cells).map(c => c.innerText.trim()).join(' | ');
                summary += `${rowText}\n`;
            });
        }

        const subject = encodeURIComponent(`${title} - ${date}`);
        const body = encodeURIComponent(summary);

        window.open(`mailto:?subject=${subject}&body=${body}`);
    }
};
