/* ============================================================
   ARES Casher Pro — Reports Module (Premium Edition)
   ============================================================ */

const Reports = {
    currentTab: 'daily',
    filters: {
        daily: new Date().toISOString().split('T')[0],
        monthly: new Date().toISOString().slice(0, 7),
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    },

    render() {
        const content = document.getElementById('content-body');
        const isAdmin = Auth.isAdmin();

        content.innerHTML = `
            <div class="stagger-in report-container">
                <!-- Header & Premium Tabs -->
                <div class="flex items-center justify-between mb-24 flex-wrap gap-12">
                    <div class="tabs-premium">
                        <button class="tab-p-btn ${this.currentTab === 'daily' ? 'active' : ''}" onclick="Reports.switchTab('daily')">📅 ${t('daily')}</button>
                        <button class="tab-p-btn ${this.currentTab === 'monthly' ? 'active' : ''}" onclick="Reports.switchTab('monthly')">📆 ${t('monthly')}</button>
                        <button class="tab-p-btn ${this.currentTab === 'profitLoss' ? 'active' : ''}" onclick="Reports.switchTab('profitLoss')">📊 ${t('profit_loss_report')}</button>
                        ${isAdmin ? `<button class="tab-p-btn ${this.currentTab === 'purchases' ? 'active' : ''}" onclick="Reports.switchTab('purchases')">🛒 ${t('purchases_report')}</button>` : ''}
                        ${isAdmin ? `<button class="tab-p-btn ${this.currentTab === 'vat' ? 'active' : ''}" onclick="Reports.switchTab('vat')">🏦 ${t('vat_report')}</button>` : ''}
                        ${isAdmin ? `<button class="tab-p-btn ${this.currentTab === 'products' ? 'active' : ''}" onclick="Reports.switchTab('products')">📦 ${t('products_report')}</button>` : ''}
                        <button class="tab-p-btn ${this.currentTab === 'custom' ? 'active' : ''}" onclick="Reports.switchTab('custom')">🎯 ${t('custom_report')}</button>
                    </div>
                    <div class="flex gap-12 no-print">
                        <button class="btn btn-sm btn-glass-premium" onclick="Reports.printReport()">🖨️ ${t('print')}</button>
                    </div>
                </div>

                <!-- Universal Filter Bar -->
                <div class="filter-bar-premium mb-24 anim-fade-in no-print">
                    <div id="filter-container" class="flex items-center gap-16 flex-wrap">
                        <!-- Dynamic filters load here -->
                    </div>
                </div>

                <!-- Report Results -->
                <div id="report-content" class="anim-slide-up">
                    ${this.renderActiveTab()}
                </div>
            </div>

            <style>
                :root {
                    --rp-bg: #0f172a;
                    --rp-card: #1e293b;
                    --rp-accent: #3b82f6;
                    --rp-success: #10b981;
                    --rp-warning: #f59e0b;
                    --rp-danger: #ef4444;
                    --rp-text: #f1f5f9;
                    --rp-muted: #94a3b8;
                    --rp-border: rgba(255, 255, 255, 0.08);
                }

                .tabs-premium { display: flex; gap: 4px; background: rgba(30, 41, 59, 0.7); padding: 4px; border-radius: 14px; border: 1px solid var(--rp-border); backdrop-filter: blur(10px); }
                .tab-p-btn { border: none; background: none; color: var(--rp-muted); padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 13px; white-space: nowrap; }
                .tab-p-btn.active { background: var(--rp-accent); color: white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); }
                .tab-p-btn:hover:not(.active) { background: rgba(255,255,255,0.05); color: white; }

                .filter-bar-premium { background: var(--rp-card); border: 1px solid var(--rp-border); padding: 12px 20px; border-radius: 16px; display: flex; align-items: center; }
                .card-premium { background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }

                .stat-grid-modern { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 24px; }
                .stat-box-p { background: rgba(255,255,255,0.02); border: 1px solid var(--rp-border); padding: 24px; border-radius: 20px; position: relative; overflow: hidden; transition: transform 0.3s; }
                .stat-box-p:hover { transform: translateY(-5px); border-color: var(--rp-accent); }
                .stat-box-p label { font-size: 11px; font-weight: 700; color: var(--rp-muted); text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px; }
                .stat-box-p h2 { font-size: 28px; font-weight: 800; margin: 0; color: #fff; }
                .stat-box-p .icon-fade { position: absolute; top: -10px; right: -10px; font-size: 64px; opacity: 0.05; transform: rotate(-15deg); }

                .btn-glass-premium { background: rgba(255,255,255,0.03); border: 1px solid var(--rp-border); color: var(--rp-text); padding: 8px 16px; border-radius: 10px; font-weight: 600; backdrop-filter: blur(5px); }
                .btn-glass-premium:hover { background: var(--rp-accent); border-color: var(--rp-accent); color: white; }

                .pl-row-p { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: center; }
                .pl-label-p { color: var(--rp-muted); font-size: 14px; }
                .pl-value-p { font-weight: 700; color: white; }

                .progress-bar-container { height: 8px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; margin-top: 8px; }
                .progress-bar-fill { height: 100%; border-radius: 10px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

                .hover-scale { transition: transform 0.2s; }
                .hover-scale:hover { transform: scale(1.02); background: rgba(255,255,255,0.05); }

                @media print { .no-print { display: none !important; } .card-premium { border: 1px solid #ddd; background: #fff !important; color: #000 !important; box-shadow: none; } }
            </style>
        `;

        this.updateFilterBar();
        this.initPickers();
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    updateFilterBar() {
        const container = document.getElementById('filter-container');
        if (!container) return;
        let html = '';
        const inputStyle = "background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:white; padding:10px 14px; border-radius:10px; font-size:14px; outline:none;";
        const btnHtml = `<button class="btn btn-primary btn-sm px-20" onclick="Reports.applyFilters()">⚡ ${t('show_report')}</button>`;

        if (this.currentTab === 'daily') {
            html = `<div class="flex items-center gap-12">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">${t('date')}</label>
                        <input type="text" id="p-date" style="${inputStyle} width:160px;" value="${this.filters.daily}">
                        ${btnHtml}
                    </div>`;
        } else if (this.currentTab === 'monthly') {
            html = `<div class="flex items-center gap-12">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">${t('month')}</label>
                        <input type="text" id="p-month" style="${inputStyle} width:160px;" value="${this.filters.monthly}">
                        ${btnHtml}
                    </div>`;
        } else {
            html = `<div class="flex items-center gap-16 flex-wrap">
                        <div class="flex items-center gap-8">
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">${t('start_date')}</label>
                            <input type="text" id="p-start" style="${inputStyle} width:140px;" value="${this.filters.start}">
                        </div>
                        <div class="flex items-center gap-8">
                            <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">${t('end_date')}</label>
                            <input type="text" id="p-end" style="${inputStyle} width:140px;" value="${this.filters.end}">
                        </div>
                        ${btnHtml}
                    </div>`;
        }
        container.innerHTML = html;
    },

    initPickers() {
        if (typeof flatpickr === 'undefined') return;
        const cfg = {
            theme: "dark", locale: I18n.currentLang === 'ar' ? 'ar' : 'default', disableMobile: true, onChange: () => {
                if (this.currentTab === 'daily' || this.currentTab === 'monthly') this.applyFilters();
            }
        };
        if (document.getElementById('p-date')) flatpickr("#p-date", { ...cfg, defaultDate: this.filters.daily });
        if (document.getElementById('p-month')) flatpickr("#p-month", { ...cfg, defaultDate: this.filters.monthly });
        if (document.getElementById('p-start')) {
            flatpickr("#p-start", { ...cfg, defaultDate: this.filters.start });
            flatpickr("#p-end", { ...cfg, defaultDate: this.filters.end });
        }
    },

    applyFilters() {
        if (document.getElementById('p-date')) this.filters.daily = document.getElementById('p-date').value;
        if (document.getElementById('p-month')) this.filters.monthly = document.getElementById('p-month').value;
        if (document.getElementById('p-start')) {
            this.filters.start = document.getElementById('p-start').value;
            this.filters.end = document.getElementById('p-end').value;
        }
        const container = document.getElementById('report-content');
        container.innerHTML = `<div class="flex justify-center p-80"><div class="loading"></div></div>`;
        setTimeout(() => { container.innerHTML = this.renderActiveTab(); }, 100);
    },

    renderActiveTab() {
        switch (this.currentTab) {
            case 'daily':
            case 'monthly':
            case 'custom': return this.renderSalesReport();
            case 'profitLoss': return this.renderProfitLossTab();
            case 'purchases': return this.renderPurchasesTab();
            case 'vat': return this.renderVATTab();
            case 'products': return this.renderProductsTab();
            default: return '';
        }
    },

    getScopedData(col) {
        let start, end;
        if (this.currentTab === 'daily') {
            const d = new Date(this.filters.daily);
            start = new Date(d.setHours(0, 0, 0, 0));
            end = new Date(d.setHours(23, 59, 59, 999));
        } else if (this.currentTab === 'monthly') {
            const [y, m] = this.filters.monthly.split('-').map(Number);
            start = new Date(y, m - 1, 1);
            end = new Date(y, m, 0, 23, 59, 59, 999);
        } else {
            const s = new Date(this.filters.start);
            const e = new Date(this.filters.end);
            start = new Date(s.setHours(0, 0, 0, 0));
            end = new Date(e.setHours(23, 59, 59, 999));
        }

        const isAdmin = Auth.isAdmin();
        const branchId = Auth.getBranchId();
        const userId = Auth.currentUser.id;

        return db.query(col, item => {
            const d = new Date(item.date || item.createdAt);
            if (d < start || d > end) return false;
            if (branchId && item.branchId && item.branchId !== branchId) return false;
            if (col === 'sales' && !isAdmin && !Auth.isSupervisor() && item.cashierId !== userId) return false;
            return true;
        });
    },

    renderSalesReport() {
        const sales = this.getScopedData('sales');
        const rev = sales.reduce((s, x) => s + x.total, 0);
        const vat = sales.reduce((s, x) => s + x.vatAmount, 0);
        const disc = sales.reduce((s, x) => s + (x.discount || 0), 0);
        const cash = sales.filter(s => s.paymentMethod === 'نقدي').reduce((s, x) => s + x.total, 0);
        const card = sales.filter(s => s.paymentMethod === 'بطاقة').reduce((s, x) => s + x.total, 0);

        return `
            <div class="stat-grid-modern">
                ${this.renderStatSquare(t('revenue'), Utils.formatSAR(rev), '💰', 'var(--rp-accent)')}
                ${this.renderStatSquare(t('invoice_count'), sales.length, '🧾', 'var(--rp-success)')}
                ${this.renderStatSquare(t('vat_collected'), Utils.formatSAR(vat), '🏦', 'var(--rp-warning)')}
            </div>
            <div class="grid-2">
                <div class="card-premium">
                    <h4 class="mb-24 flex items-center gap-12">💎 ${t('payment_breakdown')}</h4>
                    ${this.renderPaymentRow(t('cash'), cash, rev, 'var(--rp-success)')}
                    ${this.renderPaymentRow(t('card'), card, rev, 'var(--rp-accent)')}
                    ${this.renderPaymentRow(t('transfer'), rev - cash - card, rev, 'var(--rp-warning)')}
                </div>
                <div class="card-premium">
                    <h4 class="mb-24 flex items-center gap-12">⚡ ${t('recent_transactions')}</h4>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${sales.slice(-5).reverse().map(s => `
                            <div class="flex justify-between items-center p-14 mb-10 bg-black-20 rounded-16 border-glass hover-scale" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);">
                                <div><div class="bold text-slate-200">${s.invoiceNumber}</div><div class="text-xs text-muted">${Utils.formatTime(s.createdAt)}</div></div>
                                <div class="bold text-accent">${Utils.formatSAR(s.total)}</div>
                            </div>
                        `).join('') || '<p class="text-center text-muted p-20">No transactions in this period</p>'}
                    </div>
                </div>
            </div>
        `;
    },

    renderStatSquare(lbl, val, icon, color) {
        return `<div class="stat-box-p" style="border-bottom: 3px solid ${color}">
                    <label>${lbl}</label>
                    <h2 style="color:${color}">${val}</h2>
                    <span class="icon-fade">${icon}</span>
                </div>`;
    },

    renderPaymentRow(lbl, val, tot, col) {
        const p = tot > 0 ? (val / tot * 100).toFixed(0) : 0;
        return `<div class="mb-20">
                    <div class="flex justify-between text-xs mb-6 uppercase tracking-wider text-slate-400"><span>${lbl}</span><span class="bold" style="color:${col}">${Utils.formatSAR(val)} (${p}%)</span></div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${p}%; background:${col}; box-shadow: 0 0 10px ${col}44;"></div>
                    </div>
                </div>`;
    },

    renderProfitLossTab() {
        const sales = this.getScopedData('sales');
        const purchases = this.getScopedData('purchases');

        // 1. Revenue Calculations
        const grossSales = sales.reduce((s, x) => s + (x.subtotal || x.total + (x.discount || 0)), 0);
        const totalDiscounts = sales.reduce((s, x) => s + (x.discount || 0), 0);
        const netSales = grossSales - totalDiscounts;

        // 2. COGS Calculation
        let cogs = 0;
        const categoryStats = {};
        sales.forEach(s => {
            (s.items || []).forEach(i => {
                const product = db.getById('products', i.productId);
                const itemCost = (product ? product.costPrice : (i.cost || 0)) || 0;
                const totalItemCost = itemCost * i.qty;
                cogs += totalItemCost;

                // Category Breakdown logic
                const catId = product?.categoryId || 'uncategorized';
                const cat = db.getById('categories', catId);
                const catName = cat ? cat.name : t('no_category');
                if (!categoryStats[catName]) categoryStats[catName] = { revenue: 0, profit: 0 };
                categoryStats[catName].revenue += (i.price * i.qty);
                categoryStats[catName].profit += (i.price * i.qty) - totalItemCost;
            });
        });

        // 3. Gross Profit & Purchases
        const grossProfit = netSales - cogs;
        const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
        const netCash = netSales - totalPurchases;

        // 4. Margins & KPIs
        const grossMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0;
        const netMargin = netSales > 0 ? ((netCash / netSales) * 100).toFixed(1) : 0;
        const avgOrderValue = sales.length > 0 ? (netSales / sales.length).toFixed(2) : 0;

        const sortedCats = Object.entries(categoryStats)
            .sort((a, b) => b[1].profit - a[1].profit)
            .slice(0, 5);

        return `
            <div class="report-grid-p">
                <!-- Main Income Statement -->
                <div class="card-premium pl-main-card anim-slide-up">
                    <div class="flex justify-between items-center mb-32 border-b-glass pb-20">
                        <div>
                            <h2 class="m-0 text-white" style="font-size:24px; font-weight:800;">📊 ${t('income_statement')}</h2>
                            <p class="text-xs text-muted mt-4">${t('period_summary')}</p>
                        </div>
                        <div class="text-right">
                            <span class="badge badge-glass px-12 py-6">${this.filters.start} ⮕ ${this.filters.end}</span>
                        </div>
                    </div>

                    <div class="finance-section">
                        <h4 class="section-title-p text-accent">${t('revenue')}</h4>
                        <div class="pl-row-p"><span class="pl-label-p">${t('gross_sales')}</span><span class="pl-value-p">+ ${Utils.formatSAR(grossSales)}</span></div>
                        <div class="pl-row-p"><span class="pl-label-p">${t('total_discounts')}</span><span class="pl-value-p text-danger">- ${Utils.formatSAR(totalDiscounts)}</span></div>
                        <div class="pl-row-p highlight-row"><span class="pl-label-p bold text-white">${t('net_sales')}</span><span class="pl-value-p text-success bold">${Utils.formatSAR(netSales)}</span></div>
                    </div>

                    <div class="finance-section mt-24">
                        <h4 class="section-title-p text-warning">${t('expenses')} / COGS</h4>
                        <div class="pl-row-p"><span class="pl-label-p">📦 ${t('cogs')} (Cost of Goods Sold)</span><span class="pl-value-p text-danger">- ${Utils.formatSAR(cogs)}</span></div>
                        <div class="pl-row-p highlight-row"><span class="pl-label-p bold text-white">${t('gross_profit')}</span><span class="pl-value-p text-accent bold">${Utils.formatSAR(grossProfit)}</span></div>
                    </div>

                    <div class="finance-section mt-24">
                        <h4 class="section-title-p text-muted">${t('cash_flow')}</h4>
                        <div class="pl-row-p"><span class="pl-label-p">🛒 ${t('total_purchases')}</span><span class="pl-value-p text-danger">- ${Utils.formatSAR(totalPurchases)}</span></div>
                    </div>

                    <div class="net-profit-box-p mt-32">
                        <div class="flex justify-between items-center">
                            <div>
                                <label class="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4 d-block">${t('net_profit')} (CASH FLOW)</label>
                                <h1 class="m-0 ${netCash >= 0 ? 'text-success' : 'text-danger'}" style="font-size:36px; font-weight:900;">${Utils.formatSAR(netCash)}</h1>
                            </div>
                            <div class="text-right">
                                <label class="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4 d-block">MARG. %</label>
                                <h2 class="m-0 text-white">${netMargin}%</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Side Panel: KPIs & Category Analysis -->
                <div class="flex flex-col gap-24 anim-slide-up" style="animation-delay: 0.1s;">
                    <div class="card-premium">
                        <h4 class="mb-20 flex items-center gap-10">🎯 ${t('kpi_analysis')}</h4>
                        <div class="kpi-grid-p">
                            <div class="kpi-box-p">
                                <label>${t('gross_margin')}</label>
                                <div class="kpi-val-p text-accent">${grossMargin}%</div>
                                <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${grossMargin}%; background:var(--rp-accent);"></div></div>
                            </div>
                            <div class="kpi-box-p">
                                <label>${t('avg_order')}</label>
                                <div class="kpi-val-p text-success">${Utils.formatSAR(avgOrderValue)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-premium">
                        <h4 class="mb-20 flex items-center gap-10">🏷️ ${t('category_contribution')}</h4>
                        <div class="cat-list-p">
                            ${sortedCats.map(([name, stats]) => `
                                <div class="mb-16">
                                    <div class="flex justify-between text-xs mb-6">
                                        <span class="text-slate-200">${name}</span>
                                        <span class="bold text-accent">${Utils.formatSAR(stats.profit)}</span>
                                    </div>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar-fill" style="width:${(stats.profit / (grossProfit || 1) * 100)}%; background:var(--rp-success); opacity:0.6;"></div>
                                    </div>
                                </div>
                            `).join('') || `<p class="text-center text-muted py-20">${t('no_data')}</p>`}
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .report-grid-p { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
                @media (max-width: 1024px) { .report-grid-p { grid-template-columns: 1fr; } }

                .finance-section { padding: 12px 0; }
                .section-title-p { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
                
                .highlight-row { background: rgba(255,255,255,0.02); margin: 8px -12px; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); }
                
                .net-profit-box-p { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1)); border: 1px solid rgba(255,255,255,0.08); padding: 24px; border-radius: 20px; }
                
                .kpi-grid-p { display: grid; grid-template-columns: 1fr; gap: 20px; }
                .kpi-box-p label { font-size: 11px; color: var(--rp-muted); text-transform: uppercase; display: block; margin-bottom: 6px; }
                .kpi-val-p { font-size: 24px; font-weight: 900; margin-bottom: 8px; }

                .cat-list-p { max-height: 400px; overflow-y: auto; }
                .border-b-glass { border-bottom: 1px solid rgba(255,255,255,0.08); }
            </style>
        `;
    },

    renderPurchasesTab() {
        const purchases = this.getScopedData('purchases');
        const tot = purchases.reduce((s, x) => s + x.total, 0);
        return `
            <div class="stat-grid-modern">
                ${this.renderStatSquare(t('total_purchases'), Utils.formatSAR(tot), '🛒', 'var(--rp-danger)')}
                ${this.renderStatSquare(t('suppliers'), new Set(purchases.map(p => p.supplierId)).size, '🚚', 'var(--rp-accent)')}
            </div>
            <div class="card-premium p-0 overflow-hidden">
                <table class="data-table">
                    <thead><tr><th>#</th><th>${t('supplier')}</th><th>${t('date')}</th><th>${t('total')}</th></tr></thead>
                    <tbody>${purchases.map(p => `<tr><td class="bold">${p.purchaseNumber}</td><td>${(db.getById('suppliers', p.supplierId) || {}).name || '-'}</td><td>${p.date}</td><td class="bold text-danger">${Utils.formatSAR(p.total)}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    },

    renderVATTab() {
        const sales = this.getScopedData('sales');
        const vat = sales.reduce((s, x) => s + x.vatAmount, 0);
        const taxable = sales.reduce((s, x) => s + (x.afterDiscount || x.subtotal), 0);
        return `
            <div class="card-premium text-center p-80" style="background: radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent);">
                <span class="uppercase tracking-widest text-warning bold text-xs">${t('vat_report')}</span>
                <h1 style="font-size:64px; font-weight:900; color:white; margin:20px 0;">${Utils.formatSAR(vat)}</h1>
                <p class="text-muted">على إيرادات خاضعة للضريبة بقيمة ${Utils.formatSAR(taxable)}</p>
                <div class="flex justify-center gap-12 mt-32">
                    <span class="badge badge-warning px-16 py-8">${t('tax_rate')}: ${db.getSetting('vat_rate', '15')}%</span>
                </div>
            </div>
        `;
    },

    renderProductsTab() {
        const sales = this.getScopedData('sales');
        const stats = {};
        sales.forEach(s => (s.items || []).forEach(i => {
            const id = i.productId || i.name;
            if (!stats[id]) stats[id] = { name: i.name, qty: 0, revenue: 0 };
            stats[id].qty += i.qty; stats[id].revenue += i.price * i.qty;
        }));
        const sorted = Object.values(stats).sort((a, b) => b.revenue - a.revenue);
        return `<div class="card-premium p-0 overflow-hidden"><table class="data-table">
            <thead><tr><th>#</th><th>${t('product')}</th><th>${t('qty')}</th><th>${t('revenue')}</th></tr></thead>
            <tbody>${sorted.map((p, i) => `<tr><td>${i + 1}</td><td class="bold text-slate-200">${p.name}</td><td>${p.qty}</td><td class="bold text-success">${Utils.formatSAR(p.revenue)}</td></tr>`).join('')}</tbody>
        </table></div>`;
    },

    printReport() {
        const brand = App.getCompanyBrandHTML ? App.getCompanyBrandHTML(true) : `<h2>Cashiery</h2>`;
        const content = document.getElementById('report-content').innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Print Report</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #111; direction: ${I18n.getDir()}; } 
            table { width:100%; border-collapse:collapse; margin-top:30px; }
            th, td { border:1px solid #ddd; padding:12px; text-align:inherit; font-size:13px; } th { background:#f8f9fa; font-weight:bold; }
            .card-premium { border:1px solid #eee; padding:24px; border-radius:12px; margin-bottom:24px; background:#fff !important; color:#000 !important; } 
            .no-print { display:none !important; }
            .text-success { color:#10b981 !important; } .text-danger { color:#ef4444 !important; } .text-accent { color:#3b82f6 !important; }
            .bold { font-weight:700; } .flex { display:flex; } .justify-between { justify-content:space-between; } .items-center { align-items:center; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .report-grid-p { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }
            .pl-row-p { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .highlight-row { background: #f9f9f9 !important; padding: 10px; border: 1px solid #eee; }
            .net-profit-box-p { background: #f0fdf4 !important; border: 2px solid #10b981 !important; padding: 20px; border-radius: 12px; }
            .progress-bar-container { height: 8px; background: #eee; border-radius: 10px; margin-top: 5px; }
            .progress-bar-fill { height: 100%; background: #3b82f6; border-radius: 10px; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; background: #eee; }
            h1, h2, h3, h4 { margin: 10px 0; }
            .section-title-p { font-weight: bold; font-size: 12px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 20px; }
            @media print { .card-premium { box-shadow: none !important; } }
        </style></head><body><div style="text-align:center; border-bottom:3px solid #000; padding-bottom:30px; margin-bottom:40px;">${brand}</div>${content}<script>setTimeout(()=>window.print(),1000);</script></body></html>`);
        win.document.close();
    },

    emailReport() {
        const title = document.querySelector('.tab-p-btn.active').innerText;
        const subject = encodeURIComponent(`${title} - ${Utils.formatDate(new Date())}`);
        const body = encodeURIComponent(`Please review the attached ${title}.\nTotal Revenue: ${document.querySelector('.stat-box-p h2')?.innerText || 'N/A'}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
    }
};
