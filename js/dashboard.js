/* ============================================================
   ARES Casher Pro — Dashboard Module
   ============================================================ */

const Dashboard = {
    render() {
        const content = document.getElementById('content-body');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        const currentBranch = Auth.getBranchId();

        // Get today's sales — filtered by user/branch
        const todaySales = db.query('sales', s => {
            // Branch Scope
            if (currentBranch && s.branchId !== currentBranch) return false;

            // Time Scope
            if (new Date(s.createdAt) < today) return false;

            // Role Scope (Cashiers only see their own sales? Or Shift sales?)
            // Usually Dashboard shows total for the branch if permissible.
            // If strictly cashier, maybe only own?
            // "Admin sees all" -> covered by isAdmin check for logic below, but here we gather data.
            // Let's assume Managers/Supervisors see Branch Total. Cashiers see Branch Total (or own?).
            // Existing code: if (!isAdmin && s.cashierId !== userId) return false;
            // This means non-admins ONLY see their own sales. 
            // If we have "Supervisor" role, they should probably see Branch Sales.
            if (!isAdmin && !Auth.isSupervisor() && s.cashierId !== userId) return false;

            return true;
        });

        const totalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
        const totalVAT = todaySales.reduce((sum, s) => sum + s.vatAmount, 0);
        const invoiceCount = todaySales.length;

        // Stats - Filtered by Branch
        const productsCount = db.getCollection('products').filter(p => !currentBranch || p.branchId === currentBranch).length;
        const customersCount = db.getCollection('customers').filter(c => !currentBranch || c.branchId === currentBranch).length;
        const lowStock = db.query('products', p =>
            (!currentBranch || p.branchId === currentBranch) &&
            p.type !== 'service' && p.stock !== undefined && p.stock <= (p.minStock || 5)
        );

        // Role label
        const scopeLabel = isAdmin ? t('all_sales') : t('your_sales');

        content.innerHTML = `
            <div class="stagger-in">
                <!-- Welcome Banner -->
                <div class="glass-card p-24 mb-24" style="background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.1)); border-color: rgba(102,126,234,0.2);">
                    <h2 style="font-size: 24px; margin-bottom: 8px;">${t('welcome')}، ${Auth.currentUser.name} 👋</h2>
                    <p style="color: var(--text-secondary);">${t('dashboard')} — ${Utils.formatDate(new Date())} | <span class="badge ${isAdmin ? 'badge-accent' : 'badge-info'}" style="font-size:11px;">${t('role_' + (Auth.currentUser.role === 'مدير' ? 'admin' : Auth.currentUser.role === 'مشرف' ? 'supervisor' : 'cashier'))}</span> <span style="font-size:12px; color:var(--text-muted);">(${scopeLabel})</span></p>
                </div>

                <!-- Stat Cards -->
                <div class="stat-cards">
                    <div class="glass-card stat-card accent">
                        <div class="stat-card-icon">💰</div>
                        <h3>${Utils.formatCurrency(totalRevenue)}</h3>
                        <p>${t('today_revenue')} (${t('sar')})</p>
                    </div>
                    <div class="glass-card stat-card success">
                        <div class="stat-card-icon">🧾</div>
                        <h3>${invoiceCount}</h3>
                        <p>${t('today_invoices')}</p>
                    </div>
                    <div class="glass-card stat-card warning">
                        <div class="stat-card-icon">🏦</div>
                        <h3>${Utils.formatCurrency(totalVAT)}</h3>
                        <p>${t('vat_collected')} (${t('sar')})</p>
                    </div>
                    ${isAdmin ? `
                    <div class="glass-card stat-card info">
                        <div class="stat-card-icon">📦</div>
                        <h3>${productsCount}</h3>
                        <p>${t('total_products')}</p>
                    </div>` : `
                    <div class="glass-card stat-card info">
                        <div class="stat-card-icon">📊</div>
                        <h3>${Utils.formatCurrency(totalRevenue > 0 ? totalRevenue / Math.max(invoiceCount, 1) : 0)}</h3>
                        <p>${t('avg_invoice')}</p>
                    </div>`}
                </div>

                <!-- Charts Row -->
                <div class="grid-2 mb-24">
                    <div class="glass-card p-20">
                        <h3 style="margin-bottom: 16px; font-size: 16px;">📈 ${isAdmin ? t('sales_7days') : t('your_sales_7days')}</h3>
                        <div class="chart-container">
                            <canvas id="salesChart"></canvas>
                        </div>
                    </div>
                    <div class="glass-card p-20">
                        <h3 style="margin-bottom: 16px; font-size: 16px;">💳 ${t('payment_methods') || 'طرق الدفع'}</h3>
                        <div class="chart-container">
                            <canvas id="paymentChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Middle Row (Top Products & Stock) -->
                <div class="grid-2 mb-24">
                    <div class="glass-card p-20">
                        <h3 style="margin-bottom: 16px; font-size: 16px;">🔝 ${isAdmin ? t('top_products') : t('your_top_products')}</h3>
                        <div id="topProductsChart" style="padding: 10px;">
                            ${this.renderTopProducts()}
                        </div>
                    </div>
                    
                    ${isAdmin ? `
                    <!-- Low Stock Alert (Admin only) -->
                    <div class="glass-card p-20">
                        <h3 style="margin-bottom: 16px; font-size: 16px;">⚠️ ${t('stock_alerts')}</h3>
                        ${lowStock.length > 0 ? lowStock.map(p => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 8px; background: var(--bg-glass); border-radius: var(--radius-sm);">
                                <span>${p.emoji || p.icon || '📦'} ${p.name}</span>
                                <span class="badge ${p.stock <= 5 ? 'badge-danger' : 'badge-warning'}">${p.stock} ${t('pieces')}</span>
                            </div>
                        `).join('') : `<div class="empty-state" style="padding: 30px;"><p style="color: var(--text-muted);">✅ ${t('stock_ok')}</p></div>`}
                    </div>` : `
                    <!-- Shift Info (Non-admin) -->
                    <div class="glass-card p-20">
                        <h3 style="margin-bottom: 16px; font-size: 16px;">⏰ ${t('shift_info')}</h3>
                        ${this.renderShiftInfo()}
                    </div>`}
                </div>

                <!-- Recent Sales -->
                <div class="glass-card p-20 mb-24">
                    <h3 style="margin-bottom: 16px; font-size: 16px;">🕐 ${isAdmin ? t('recent_sales') : t('your_recent_sales')}</h3>
                    ${this.renderRecentSales()}
                </div>

                <!-- Quick Actions -->
                <div class="glass-card p-20">
                    <h3 style="margin-bottom: 16px; font-size: 16px;">⚡ ${t('quick_actions')}</h3>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${Auth.hasPermission('access_pos') ? `<button class="btn btn-primary" onclick="App.navigate('pos')">🛒 ${t('start_sale')}</button>` : ''}
                        ${Auth.hasPermission('manage_products') ? `<button class="btn btn-success" onclick="App.navigate('products')">📦 ${t('manage_products')}</button>` : ''}
                        ${Auth.hasPermission('view_reports') ? `<button class="btn btn-ghost" onclick="App.navigate('reports')">📊 ${t('view_reports')}</button>` : ''}
                        ${Auth.hasPermission('view_invoices') ? `<button class="btn btn-ghost" onclick="App.navigate('invoices')">🧾 ${t('view_invoices')}</button>` : ''}
                        ${Auth.hasPermission('manage_shifts') ? `<button class="btn btn-ghost" onclick="App.navigate('shifts')">⏰ ${t('shifts')}</button>` : ''}
                        ${Auth.hasPermission('manage_settings') ? `<button class="btn btn-ghost" onclick="App.navigate('settings')">⚙️ ${t('settings')}</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Initialize Charts with Chart.js
        setTimeout(() => this.initCharts(), 100);
    },

    initCharts() {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        const currentBranch = Auth.getBranchId();
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const isDark = theme === 'dark';

        // 1. Prepare Sales Data (Last 7 Days)
        const salesData = [];
        const salesLabels = [];
        const locale = I18n.currentLang === 'ur' ? 'ur-PK' : I18n.currentLang === 'en' ? 'en-US' : 'ar-SA';

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const daySales = db.query('sales', s => {
                if (currentBranch && s.branchId !== currentBranch) return false;
                const d = new Date(s.createdAt);
                if (d < date || d >= nextDate) return false;
                if (!isAdmin && !Auth.isSupervisor() && s.cashierId !== userId) return false;
                return true;
            });
            salesData.push(daySales.reduce((sum, s) => sum + s.total, 0));
            salesLabels.push(date.toLocaleDateString(locale, { weekday: 'short' }));
        }

        // 2. Prepare Payment Method Data (All time or relevant period)
        const paymentMethods = { 'نقدي': 0, 'بطاقة': 0, 'تحويل': 0 };
        const allSales = db.query('sales', s => {
            if (currentBranch && s.branchId !== currentBranch) return false;
            if (!isAdmin && !Auth.isSupervisor() && s.cashierId !== userId) return false;
            return true;
        });

        allSales.forEach(s => {
            const method = s.paymentMethod || 'نقدي';
            if (paymentMethods.hasOwnProperty(method)) {
                paymentMethods[method] += s.total;
            }
        });

        // ── Chart Styles ──
        Chart.defaults.color = isDark ? '#a0a0c0' : '#666';
        Chart.defaults.font.family = "'Cairo', sans-serif";

        // ── Sales Chart (Line) ──
        const salesCtx = document.getElementById('salesChart');
        if (salesCtx) {
            new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: salesLabels,
                    datasets: [{
                        label: t('total_sales') || 'المبيعات',
                        data: salesData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#667eea',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // ── Payment Chart (Doughnut) ──
        const paymentCtx = document.getElementById('paymentChart');
        if (paymentCtx) {
            new Chart(paymentCtx, {
                type: 'doughnut',
                data: {
                    labels: [t('cash_sales'), t('card_sales'), t('transfer_sales')],
                    datasets: [{
                        data: [paymentMethods['نقدي'], paymentMethods['بطاقة'], paymentMethods['تحويل']],
                        backgroundColor: ['#00d68f', '#667eea', '#ffaa00'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20, usePointStyle: true }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    },

    renderRecentSales() {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        const currentBranch = Auth.getBranchId();

        let sales = db.getCollection('sales');
        if (currentBranch) sales = sales.filter(s => !s.branchId || s.branchId === currentBranch);
        if (!isAdmin && !Auth.isSupervisor()) sales = sales.filter(s => s.cashierId === userId);

        sales = sales.slice(-5).reverse();

        if (sales.length === 0) return `<div class="empty-state" style="padding: 30px;"><p style="color: var(--text-muted);">${t('no_sales_yet')}</p></div>`;

        return sales.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: var(--bg-glass); border-radius: var(--radius-sm);">
                <div>
                    <div style="font-weight: 700; font-size: 14px;">${s.invoiceNumber || '—'}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${Utils.formatDateTime(s.createdAt)}${isAdmin && s.cashierName ? ` — ${s.cashierName}` : ''}</div>
                </div>
                <div style="text-align: ${I18n.isRTL() ? 'left' : 'right'};">
                    <div style="font-weight: 800; color: var(--accent-start); font-family: Inter; font-size: 15px;">${Utils.formatSAR(s.total)}</div>
                    <span class="badge ${s.paymentMethod === 'نقدي' ? 'badge-success' : s.paymentMethod === 'بطاقة' ? 'badge-accent' : 'badge-warning'}" style="font-size: 10px;">${s.paymentMethod || t('cash_sales')}</span>
                </div>
            </div>
        `).join('');
    },

    renderTopProducts() {
        const isAdmin = Auth.isAdmin();
        const userId = Auth.currentUser.id;
        const currentBranch = Auth.getBranchId();

        let sales = db.getCollection('sales');
        if (currentBranch) sales = sales.filter(s => !s.branchId || s.branchId === currentBranch);
        if (!isAdmin && !Auth.isSupervisor()) sales = sales.filter(s => s.cashierId === userId);

        const productSales = {};
        sales.forEach(s => {
            (s.items || []).forEach(item => {
                if (!productSales[item.name]) productSales[item.name] = 0;
                productSales[item.name] += item.qty;
            });
        });

        const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sorted.length === 0) return `<div class="empty-state" style="padding: 30px;"><p style="color: var(--text-muted);">${t('not_enough_data')}</p></div>`;

        const maxQty = sorted[0][1];
        return sorted.map(([name, qty], i) => {
            const colors = ['#667eea', '#00d68f', '#ffaa00', '#00b4d8', '#ff6b81'];
            const width = (qty / maxQty * 100);
            return `
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-size: 13px; font-weight: 600;">${name}</span>
                        <span style="font-size: 13px; color: var(--text-muted); font-family: Inter;">${qty} ${t('sales_count')}</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-glass); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${width}%; background: ${colors[i]}; border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderShiftInfo() {
        const userId = Auth.currentUser.id;
        const openShift = db.query('shifts', s => s.userId === userId && s.status === 'open');

        if (openShift.length > 0) {
            const shift = openShift[0];
            const shiftSales = db.query('sales', s => s.shiftId === shift.id);
            const shiftTotal = shiftSales.reduce((sum, s) => sum + s.total, 0);
            return `
                <div style="padding: 16px; background: rgba(0,214,143,0.08); border-radius: var(--radius-md); border-${I18n.isRTL() ? 'right' : 'left'}: 4px solid var(--success);">
                    <div style="font-weight:700; color:var(--success); margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                        <span class="pulse-dot"></span> ${t('shift_open')}
                    </div>
                    <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
                        🗓️ ${Utils.formatDateTime(shift.createdAt)}
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div class="glass-card p-10" style="text-align:center;">
                            <div style="font-size:11px; color:var(--text-muted);">${t('shift_invoices')}</div>
                            <div style="font-weight:700; font-family:Inter;">${shiftSales.length}</div>
                        </div>
                        <div class="glass-card p-10" style="text-align:center;">
                            <div style="font-size:11px; color:var(--text-muted);">${t('total')}</div>
                            <div style="font-weight:700; font-family:Inter; color:var(--accent-start);">${Utils.formatSAR(shiftTotal)}</div>
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-sm btn-block mt-12" onclick="App.navigate('shifts')">⏰ ${t('manage_shift')}</button>
                </div>
            `;
        }
        return `
            <div class="empty-state" style="padding: 30px;">
                <p style="color: var(--text-muted); margin-bottom:12px;">${t('no_open_shift')}</p>
                <button class="btn btn-primary btn-sm" onclick="App.navigate('shifts')">⏰ ${t('open_new_shift')}</button>
            </div>
        `;
    }
};
