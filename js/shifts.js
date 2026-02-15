/* ============================================================
   ARES Casher Pro — Shift Management Module
   ============================================================ */

const Shifts = {
    render() {
        console.log('[Shifts] Render called');
        try {
            const content = document.getElementById('content-body');
            if (!content) {
                console.error('[Shifts] Content body not found');
                return;
            }

            let shifts = [];
            try {
                const allShifts = db.getCollection('shifts') || [];
                const currentBranch = Auth.getBranchId();

                // Scope
                shifts = currentBranch
                    ? allShifts.filter(s => !s.branchId || s.branchId === currentBranch)
                    : allShifts;

                console.log(`[Shifts] Loaded ${shifts.length} shifts (Branch: ${currentBranch || 'Global'})`);

                if (Array.isArray(shifts)) {
                    shifts = [...shifts].reverse();
                } else {
                    shifts = [];
                }
            } catch (e) {
                console.error('[Shifts] Error loading shifts from DB:', e);
                shifts = [];
            }

            const activeShiftId = App.activeShiftId;
            console.log(`[Shifts] Active Shift ID: ${activeShiftId}`);

            let activeShift = null;
            if (activeShiftId) {
                activeShift = shifts.find(s => s.id === activeShiftId);
                if (!activeShift) {
                    console.warn('[Shifts] Active shift ID found but shift missing in DB. Clearing.');
                    App.activeShiftId = null;
                } else {
                    console.log('[Shifts] Active shift found:', activeShift);
                }
            }

            const debugControls = `
                <div style="margin-bottom: 20px; text-align: right; opacity: 0.5;">
                    <button class="btn btn-sm btn-ghost" onclick="Shifts.hardReset()" title="${t('fix_stuck_page') || 'Fix Stuck Page'}">
                        🛠️ ${t('fix') || 'Fix'}
                    </button>
                </div>
            `;

            content.innerHTML = debugControls + `
                <div class="stagger-in">
                    <!-- Active Shift Status -->
                    <div class="glass-card p-24 mb-24" style="background: ${activeShift ? 'linear-gradient(135deg, rgba(0,214,143,0.1), rgba(0,214,143,0.03))' : 'linear-gradient(135deg, rgba(255,77,106,0.1), rgba(255,77,106,0.03))'}; border-color: ${activeShift ? 'rgba(0,214,143,0.2)' : 'rgba(255,77,106,0.2)'};">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 style="font-size: 20px; margin-bottom: 8px;">
                                    ${activeShift ? `🟢 ${t('shift_open')}` : `🔴 ${t('no_open_shift')}`}
                                </h2>
                                ${activeShift ? `
                                    <p style="color: var(--text-secondary);">
                                        ${t('shift_started')}: ${Utils.formatDateTime(activeShift.startTime)} |
                                        ${t('opening_cash')}: ${Utils.formatSAR(activeShift.openingCash || 0)}
                                    </p>
                                ` : `<p style="color: var(--text-secondary);">${t('open_shift_hint')}</p>`}
                            </div>
                            <div>
                                ${activeShift
                    ? `<button class="btn btn-danger btn-lg" onclick="Shifts.closeShift()">🔒 ${t('close_shift')}</button>`
                    : `<button class="btn btn-success btn-lg" onclick="Shifts.openShift()">🔓 ${t('open_new_shift')}</button>`
                }
                            </div>
                        </div>
                    </div>

                    ${activeShift ? this.renderActiveShiftStats() : ''}

                    <!-- Shift History -->
                    <div class="glass-card" style="overflow: hidden;">
                        <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
                            <h3 style="font-size: 16px;">📋 ${t('shift_history')}</h3>
                        </div>
                        <div style="overflow-x: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>${t('employee')}</th>
                                        <th>${t('shift_start')}</th>
                                        <th>${t('shift_end')}</th>
                                        <th>${t('opening_cash')}</th>
                                        <th>${t('total_sales')}</th>
                                        <th>${t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${shifts.map(s => {
                    try {
                        const shiftSales = db.query('sales', sale => sale.shiftId === s.id);
                        const totalSales = shiftSales.reduce((sum, sale) => sum + sale.total, 0);
                        return `
                                            <tr>
                                                <td><strong>${s.userName || '—'}</strong></td>
                                                <td style="font-size:13px;">${Utils.formatDateTime(s.startTime)}</td>
                                                <td style="font-size:13px;">${s.endTime ? Utils.formatDateTime(s.endTime) : '—'}</td>
                                                <td style="font-family:Inter;">${Utils.formatSAR(s.openingCash || 0)}</td>
                                                <td style="font-family:Inter; font-weight:600;">${Utils.formatSAR(totalSales)}</td>
                                                <td>
                                                    <span class="badge ${s.status === 'open' ? 'badge-success' : 'badge-info'}">${s.status === 'open' ? t('status_open') : t('status_closed')}</span>
                                                    ${s.status === 'closed' ? `<button class="btn btn-ghost btn-sm" onclick="Shifts.printShiftReport('${s.id}')" title="${t('print')}">🖨️</button>` : ''}
                                                </td>
                                            </tr>`;
                    } catch (err) {
                        console.error('Error rendering shift row:', s, err);
                        return '';
                    }
                }).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${shifts.length === 0 ? `<div class="empty-state p-24"><p>${t('no_shift_history')}</p></div>` : ''}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('[Shifts] Render error:', e);
            const content = document.getElementById('content-body');
            if (content) {
                content.innerHTML = `
                    <div class="text-center p-24">
                        <h3 style="color:var(--danger)">⚠️ Error loading shifts</h3>
                        <p>${e.message}</p>
                        <button class="btn btn-primary mt-4" onclick="location.reload()">Reload</button>
                    </div>
                `;
            }
        }
    },

    renderActiveShiftStats() {
        const shiftSales = db.query('sales', s => s.shiftId === App.activeShiftId);
        const totalSales = shiftSales.reduce((sum, s) => sum + s.total, 0);
        const totalVAT = shiftSales.reduce((sum, s) => sum + s.vatAmount, 0);
        const cashTotal = shiftSales.filter(s => s.paymentMethod === 'نقدي').reduce((sum, s) => sum + s.total, 0);

        return `
            <div class="stat-cards mb-24">
                <div class="glass-card stat-card accent">
                    <div class="stat-card-icon">💰</div>
                    <h3>${Utils.formatCurrency(totalSales)}</h3>
                    <p>${t('shift_sales')} (${t('sar')})</p>
                </div>
                <div class="glass-card stat-card success">
                    <div class="stat-card-icon">🧾</div>
                    <h3>${shiftSales.length}</h3>
                    <p>${t('operations_count')}</p>
                </div>
                <div class="glass-card stat-card warning">
                    <div class="stat-card-icon">💵</div>
                    <h3>${Utils.formatCurrency(cashTotal)}</h3>
                    <p>${t('cash_sales')} (${t('sar')})</p>
                </div>
                <div class="glass-card stat-card info">
                    <div class="stat-card-icon">🏦</div>
                    <h3>${Utils.formatCurrency(totalVAT)}</h3>
                    <p>${t('vat_collected')} (${t('sar')})</p>
                </div>
            </div>
        `;
    },

    openShift() {
        if (!Auth.currentUser) {
            Toast.show(t('error'), 'User session invalid. Please relogin.', 'error');
            return;
        }

        try {
            Modal.show(`🔓 ${t('open_new_shift')}`, `
                <div class="form-group">
                    <label>${t('opening_cash')} (${t('sar')})</label>
                    <input type="number" class="form-control" id="opening-cash" value="0" min="0" step="0.01">
                </div>
                <div class="glass-card p-20" style="background: var(--info-bg); border-color: rgba(0,180,216,0.2);">
                    <p style="font-size: 13px; color: var(--info);">
                        ℹ️ ${t('shift_register_msg')}: <strong>${Auth.currentUser.name}</strong>
                    </p>
                </div>
            `, `
                <button class="btn btn-success" onclick="Shifts.confirmOpen()">✅ ${t('open_shift')}</button>
                <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
            `);
        } catch (e) {
            console.error('[Shifts] openShift error:', e);
            Toast.show(t('error'), 'Error opening shift dialog', 'error');
        }
    },

    confirmOpen() {
        if (!Auth.currentUser) {
            Toast.show(t('error'), 'User session lost', 'error');
            return;
        }

        try {
            const openingCashInput = document.getElementById('opening-cash');
            const openingCash = openingCashInput ? (parseFloat(openingCashInput.value) || 0) : 0;

            const shift = db.insert('shifts', {
                userId: Auth.currentUser.id,
                userName: Auth.currentUser.name,
                branchId: Auth.getBranchId(), // Tag with Branch
                startTime: Utils.isoDate(),
                openingCash,
                status: 'open'
            });

            App.activeShiftId = shift.id;
            Modal.hide();
            Toast.show(t('success'), t('shift_opened'), 'success');
            this.render();
            // Force re-render of dashboard if we are there
            if (App.currentScreen === 'dashboard') Dashboard.render();
        } catch (e) {
            console.error('[Shifts] confirmOpen error:', e);
            Toast.show(t('error'), 'Failed to create shift in database', 'error');
        }
    },

    closeShift() {
        const shiftSales = db.query('sales', s => s.shiftId === App.activeShiftId);
        const totalSales = shiftSales.reduce((sum, s) => sum + s.total, 0);
        const cashSales = shiftSales.filter(s => s.paymentMethod === 'نقدي').reduce((sum, s) => sum + s.total, 0);
        const activeShift = db.getById('shifts', App.activeShiftId);
        const expectedCash = (activeShift?.openingCash || 0) + cashSales;

        Modal.show(`🔒 ${t('close_shift')}`, `
            <div class="glass-card p-20 mb-20" style="text-align:center;">
                <div style="font-size:14px; color:var(--text-muted); margin-bottom:8px;">${t('shift_total_sales')}</div>
                <div style="font-size:32px; font-weight:800; font-family:Inter;" class="text-gradient">${Utils.formatSAR(totalSales)}</div>
            </div>
            
            <div class="form-group">
                <label>${t('cash_in_drawer')} (${t('sar')})</label>
                <input type="number" class="form-control" id="closing-cash" value="${expectedCash.toFixed(2)}" step="0.01">
                <small style="color:var(--text-muted); font-size:12px;">${t('expected_amount')}: ${Utils.formatSAR(expectedCash)}</small>
            </div>

            <div class="glass-card p-20" style="background: var(--bg-glass);">
                <div class="flex justify-between" style="margin-bottom:8px;"><span>${t('operations_count')}</span><span style="font-weight:600;">${shiftSales.length}</span></div>
                <div class="flex justify-between" style="margin-bottom:8px;"><span>${t('cash_sales')}</span><span style="font-weight:600;">${Utils.formatSAR(cashSales)}</span></div>
                <div class="flex justify-between"><span>${t('opening_cash')}</span><span style="font-weight:600;">${Utils.formatSAR(activeShift?.openingCash || 0)}</span></div>
            </div>
        `, `
            <button class="btn btn-danger" onclick="Shifts.confirmClose()">🔒 ${t('confirm_close')}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    confirmClose() {
        const closingCash = parseFloat(document.getElementById('closing-cash').value) || 0;
        const shiftId = App.activeShiftId; // Capture ID before clearing

        db.update('shifts', shiftId, {
            endTime: Utils.isoDate(),
            closingCash,
            status: 'closed'
        });

        App.activeShiftId = null;
        Modal.hide();

        // Prompt to print report
        Modal.show(`✅ ${t('shift_closed_msg')}`, `
            <div style="text-align:center; padding:20px;">
                <p>${t('print_shift_report_manual') || 'Do you want to print the shift report?'}</p>
            </div>
        `, `
            <button class="btn btn-primary" onclick="Shifts.printShiftReport('${shiftId}'); Modal.hide()">${t('print_report') || 'Print Report'}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('close')}</button>
        `);

        this.render();
    },

    printShiftReport(shiftId) {
        const shift = db.getById('shifts', shiftId);
        if (!shift) return;

        const shiftSales = db.query('sales', s => s.shiftId === shiftId);
        const totalSales = shiftSales.reduce((sum, s) => sum + s.total, 0);
        const totalVAT = shiftSales.reduce((sum, s) => sum + s.vatAmount, 0);
        const cashSales = shiftSales.filter(s => s.paymentMethod === 'نقدي').reduce((sum, s) => sum + s.total, 0);
        const cardSales = shiftSales.filter(s => s.paymentMethod === 'بطاقة').reduce((sum, s) => sum + s.total, 0);
        const transferSales = shiftSales.filter(s => s.paymentMethod === 'تحويل').reduce((sum, s) => sum + s.total, 0);

        const expectedCash = (shift.openingCash || 0) + cashSales;
        const diff = (shift.closingCash || 0) - expectedCash;

        const brandHTML = App.getCompanyBrandHTML ? App.getCompanyBrandHTML(true) : '';
        const dir = I18n.getDir();

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${dir}">
            <head>
                <meta charset="UTF-8">
                <title>${t('shift_report')} #${shiftId.substr(0, 8)}</title>
                <style>
                    body { font-family: 'Cairo', sans-serif; padding: 20px; text-align: center; direction: ${dir}; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    th, td { padding: 5px; border-bottom: 1px solid #ddd; text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
                    .summary { background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    .total { font-size: 18px; font-weight: bold; margin: 10px 0; }
                </style>
            </head>
            <body>
                ${brandHTML}
                <h3>${t('shift_report')}</h3>
                <p>${t('employee')}: ${shift.userName}</p>
                <p style="font-size:12px;">${Utils.formatDateTime(shift.startTime)} <br>⬇<br> ${shift.endTime ? Utils.formatDateTime(shift.endTime) : '...'}</p>
                
                <div class="summary">
                    <table>
                        <tr><td>${t('opening_cash')}</td><td>${Utils.formatSAR(shift.openingCash || 0)}</td></tr>
                        <tr><td>${t('cash_sales')}</td><td>${Utils.formatSAR(cashSales)}</td></tr>
                        <tr><td>${t('card_sales')}</td><td>${Utils.formatSAR(cardSales)}</td></tr>
                        <tr><td>${t('transfer_sales')}</td><td>${Utils.formatSAR(transferSales)}</td></tr>
                        <tr style="font-weight:bold; border-top:2px solid #000;">
                            <td>${t('total_sales')}</td>
                            <td>${Utils.formatSAR(totalSales)}</td>
                        </tr>
                    </table>
                </div>

                ${shift.status === 'closed' ? `
                <div class="summary" style="border:1px dashed #333;">
                    <p><strong>${t('cash_reconciliation') || 'Cash Reconciliation'}</strong></p>
                    <table>
                        <tr><td>${t('expected_amount')}</td><td>${Utils.formatSAR(expectedCash)}</td></tr>
                        <tr><td>${t('actual_amount')}</td><td>${Utils.formatSAR(shift.closingCash || 0)}</td></tr>
                        <tr>
                            <td>${t('difference')}</td>
                            <td style="color:${diff < 0 ? 'red' : diff > 0 ? 'green' : 'black'}; font-weight:bold;">
                                ${Utils.formatSAR(diff)}
                            </td>
                        </tr>
                    </table>
                </div>
                ` : ''}
                
                <p style="font-size:12px; margin-top:20px;">${Utils.formatDateTime(new Date().toISOString())}</p>
                <script>
                    setTimeout(() => { window.print(); window.close(); }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    hardReset() {
        Modal.show(t('warning'), t('confirm_reset_shifts') || 'Are you sure? This will reset local shift state.', `
            <button class="btn btn-danger" onclick="Shifts.performHardReset()">${t('yes_reset') || 'Yes, Reset'}</button>
            <button class="btn btn-ghost" onclick="Modal.hide()">${t('cancel')}</button>
        `);
    },

    performHardReset() {
        App.activeShiftId = null;
        this.render();
        Modal.hide();
        Toast.show(t('success'), t('reset_done') || 'Reset done', 'success');
    }
};
