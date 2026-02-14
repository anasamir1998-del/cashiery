/* ============================================================
   ARES Casher Pro — Receipt Service (Thermal Printer 80mm)
   ============================================================ */

const Receipt = {
    /**
     * Print a thermal receipt for a sale/invoice.
     * Reads company settings dynamically from db each time.
     */
    print(sale) {
        if (!sale) return;

        // Read settings dynamically every time
        const shopName = db.getSetting('company_name', 'ARES Casher Pro');
        const shopNameEn = db.getSetting('company_name_en', '');
        const shopPhone = db.getSetting('company_phone', '');
        const shopAddress = db.getSetting('company_address', '');
        const vatNumber = db.getSetting('vat_number', '');
        const logo = db.getSetting('company_logo', '');
        const currency = db.getSetting('currency', 'ر.س');

        // Invoice Customization Settings
        const getBool = (key) => db.getSetting(key, 'true') === 'true';
        const showLogo = getBool('inv_show_logo');
        const showCompanyName = getBool('inv_show_company_name');
        const showCompanyAddress = getBool('inv_show_company_address');
        const showCompanyPhone = getBool('inv_show_company_phone');
        const showVatNumber = getBool('inv_show_vat_number');

        const showCashier = getBool('inv_show_cashier');
        const showCustomer = getBool('inv_show_customer');
        const showDiscount = getBool('inv_show_discount');
        const showPaymentMethod = getBool('inv_show_payment_method');
        const showPaidChange = getBool('inv_show_paid_change');

        const showQr = getBool('inv_show_qr');
        // For thermal receipt.js, we'll default QR to bottom if enabled, or simple handling

        const showFooter = getBool('inv_show_footer');
        const footerText = db.getSetting('inv_footer_text', t('thank_you') || 'Thank you');

        const fontSizeSetting = db.getSetting('inv_font_size', 'medium'); // small, medium, large
        const paperWidth = db.getSetting('inv_paper_width', '80mm'); // 58mm, 80mm

        // CSS Values
        const baseFontSize = fontSizeSetting === 'small' ? '10px' : fontSizeSetting === 'large' ? '14px' : '12px';
        const bodyWidth = paperWidth === '58mm' ? '54mm' : '76mm';
        const bodyPadding = paperWidth === '58mm' ? '2mm' : '2mm';

        // Build items HTML
        const items = sale.items || [];
        const itemsHtml = items.map(item => {
            const qty = item.qty || item.quantity || 1;
            const price = item.price || 0;
            const total = (price * qty).toFixed(2);
            return `
            <tr>
                <td style="text-align:start;">${Utils.escapeHTML(Utils.getName(db.getById('products', item.productId)) || item.name)}</td>
                <td style="text-align:center;">${qty}</td>
                <td style="text-align:end;">${price.toFixed(2)}</td>
                <td style="text-align:end;">${total}</td>
            </tr>`;
        }).join('');

        // Calculate totals from sale data
        const subtotal = sale.subtotal || sale.total || 0;
        const vatAmount = sale.vatAmount || sale.tax || 0;
        const total = sale.total || 0;
        const paid = sale.paid || sale.total || 0;
        const change = sale.change || 0;
        const paymentMethod = sale.paymentMethod || sale.method || 'نقدي';
        const invoiceNumber = sale.invoiceNumber || sale.id || '—';
        const cashierName = sale.cashierName || sale.cashier || '—';
        const customerName = sale.customerName || '';
        const saleDate = sale.createdAt || sale.date || new Date().toISOString();
        const vatRate = sale.vatRate || db.getSetting('vat_rate', '15');

        const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';

        const html = `
            <!DOCTYPE html>
            <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: ${paperWidth} auto; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', 'Cairo', monospace;
                        width: ${bodyWidth};
                        margin: 2mm auto;
                        color: black;
                        background: white;
                        font-size: ${baseFontSize};
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 8px;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                    }
                    .header img {
                        max-width: 60px;
                        max-height: 60px;
                        margin-bottom: 4px;
                    }
                    .header h2 { font-size: 1.4em; font-weight: bold; margin: 4px 0 2px; }
                    .header .sub { font-size: 0.9em; color: #444; }
                    .info {
                        margin-bottom: 8px;
                        font-size: 0.95em;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 6px;
                    }
                    .info .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                    th {
                        border-bottom: 1px solid #000;
                        padding: 3px 2px;
                        font-size: 0.9em;
                        font-weight: bold;
                    }
                    td { padding: 3px 2px; font-size: 0.95em; }
                    .totals {
                        border-top: 2px dashed #000;
                        padding-top: 6px;
                        margin-top: 6px;
                    }
                    .totals .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 0.95em; }
                    .totals .total-row { font-weight: bold; font-size: 1.2em; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
                    .footer {
                        text-align: center;
                        margin-top: 12px;
                        font-size: 0.9em;
                        border-top: 2px dashed #000;
                        padding-top: 8px;
                    }
                    .footer p { margin-bottom: 2px; }
                    @media print {
                        body { margin: 0; padding: ${bodyPadding}; width: ${paperWidth}; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${showLogo && logo ? `<img src="${logo}" alt="logo">` : ''}
                    ${showCompanyName ? `<h2>${Utils.escapeHTML(shopName)}</h2>` : ''}
                    ${showCompanyName && shopNameEn ? `<div class="sub">${Utils.escapeHTML(shopNameEn)}</div>` : ''}
                    ${showCompanyAddress && shopAddress ? `<div class="sub">${Utils.escapeHTML(shopAddress)}</div>` : ''}
                    ${showCompanyPhone && shopPhone ? `<div class="sub">📞 ${shopPhone}</div>` : ''}
                    ${showVatNumber && vatNumber ? `<div class="sub">${t('vat_number')}: ${vatNumber}</div>` : ''}
                </div>

                <div class="info">
                    <div class="row"><span>${t('invoice_number')}</span><span>${invoiceNumber}</span></div>
                    <div class="row"><span>${t('date')}</span><span>${Utils.formatDateTime(saleDate)}</span></div>
                    ${showCashier ? `<div class="row"><span>${t('cashier')}</span><span>${Utils.escapeHTML(cashierName)}</span></div>` : ''}
                    ${showCustomer && customerName ? `<div class="row"><span>${t('customer')}</span><span>${Utils.escapeHTML(customerName)}</span></div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align:start; width:40%;">${t('product')}</th>
                            <th style="text-align:center; width:15%;">${t('qty')}</th>
                            <th style="text-align:end; width:20%;">${t('price')}</th>
                            <th style="text-align:end; width:25%;">${t('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="row">
                        <span>${t('subtotal')}</span>
                        <span>${Number(subtotal).toFixed(2)} ${currency}</span>
                    </div>
                    <div class="row">
                        <span>${t('vat')} (${vatRate}%)</span>
                        <span>${Number(vatAmount).toFixed(2)} ${currency}</span>
                    </div>
                    ${showDiscount && sale.discount ? `
                    <div class="row">
                        <span>${t('discount')}</span>
                        <span>- ${Number(sale.discount).toFixed(2)} ${currency}</span>
                    </div>` : ''}
                    <div class="row total-row">
                        <span>${t('grand_total')}</span>
                        <span>${Number(total).toFixed(2)} ${currency}</span>
                    </div>
                    
                    ${showPaymentMethod ? `
                    <div class="row">
                        <span>${t('paid')} (${paymentMethod})</span>
                        <span>${Number(paid).toFixed(2)} ${currency}</span>
                    </div>` : ''}
                    
                    ${showPaidChange && change > 0 ? `
                    <div class="row">
                        <span>${t('change')}</span>
                        <span>${Number(change).toFixed(2)} ${currency}</span>
                    </div>` : ''}
                </div>

                ${showFooter ? `
                <div class="footer">
                    <p>${Utils.escapeHTML(footerText).replace(/\n/g, '<br>')}</p>
                    <p>Powered by ARES Casher Pro</p>
                </div>` : ''}

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 1000);
                    }
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=700');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        } else {
            Toast.show(t('warning'), t('popup_blocked') || 'يرجى السماح بالنوافذ المنبثقة', 'warning');
        }
    }
};
