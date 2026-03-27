/* ============================================================
   ARES Casher Pro — Utility Functions
   ============================================================ */

const Utils = {
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Get name (simplified)
    getName(product) {
        return product ? product.name : '';
    },

    // Format currency (SAR)
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    // Format currency with symbol (reads from settings)
    formatSAR(amount) {
        const currency = (typeof db !== 'undefined') ? db.getSetting('currency', 'ر.س') : 'ر.س';
        return `${this.formatCurrency(amount)} ${currency}`;
    },

    // Format date
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    // Format date/time
    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format time only
    formatTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // ISO date string (for storage)
    isoDate(date) {
        return (date || new Date()).toISOString();
    },

    // Generate invoice number
    generateInvoiceNumber(prefix = 'INV') {
        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        return `${prefix}-${y}${m}${d}-${seq}`;
    },

    // TLV encoding for ZATCA QR code
    // Tag-Length-Value format per ZATCA specifications
    tlvEncode(tag, value) {
        const encoder = new TextEncoder();
        const valueBytes = encoder.encode(value);
        const result = new Uint8Array(2 + valueBytes.length);
        result[0] = tag;
        result[1] = valueBytes.length;
        result.set(valueBytes, 2);
        return result;
    },

    // Generate ZATCA QR code data (Base64 TLV)
    generateZATCAQR(sellerName, vatNumber, timestamp, totalWithVAT, vatAmount) {
        const total = typeof totalWithVAT === 'number' ? totalWithVAT.toFixed(2) : String(totalWithVAT);
        const vat = typeof vatAmount === 'number' ? vatAmount.toFixed(2) : String(vatAmount);
        const tag1 = this.tlvEncode(1, sellerName);
        const tag2 = this.tlvEncode(2, vatNumber);
        const tag3 = this.tlvEncode(3, timestamp);
        const tag4 = this.tlvEncode(4, total);
        const tag5 = this.tlvEncode(5, vat);

        const combined = new Uint8Array(tag1.length + tag2.length + tag3.length + tag4.length + tag5.length);
        let offset = 0;
        [tag1, tag2, tag3, tag4, tag5].forEach(tag => {
            combined.set(tag, offset);
            offset += tag.length;
        });

        return btoa(String.fromCharCode(...combined));
    },

    // Calculate VAT
    calculateVAT(subtotal, vatRate = 0.15) {
        return subtotal * vatRate;
    },

    // Debounce
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Escape HTML
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Print element
    printElement(elementId) {
        const content = document.getElementById(elementId);
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #1a1a1a; }
                    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                    th { background: #f5f5f5; padding: 10px 8px; font-size: 13px; font-weight: 700; text-align: right; border: 1px solid #ddd; }
                    td { padding: 10px 8px; font-size: 13px; border: 1px solid #ddd; }
                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    h1, h2, h3 { margin: 8px 0; }
                    .inv-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px; }
                    .qr-section { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px solid #333; }
                    .summary-table { margin-top: 12px; }
                    .summary-table td { border: none; padding: 4px 8px; }
                    hr { border: 1px dashed #ccc; margin: 12px 0; }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    },

    // Compress Image (Canvas)
    compressImage(img, quality = 0.7, maxWidth = 800) {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', quality);
    },

    // Export JSON data
    exportJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Import JSON file
    importJSON() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return reject('No file selected');
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        resolve(JSON.parse(ev.target.result));
                    } catch (err) {
                        reject('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
};
