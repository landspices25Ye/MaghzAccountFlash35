import { escapeHtml } from '@/core/utils/html';

export interface PrintLine {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

export interface PrintDocumentData {
  type: 'sales-invoice' | 'purchase-invoice' | 'purchase-order' | 'purchase-return' | 'receipt-voucher' | 'payment-voucher' | 'journal-entry' | 'ledger';
  docNumber: string;
  date: string;
  dueDate?: string;
  partyName: string;
  partyLabel: string;
  lines: PrintLine[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string;
  companyName?: string;
  currency?: string;
}

const typeTitles: Record<string, string> = {
  'sales-invoice': 'فاتورة ضريبية مبسطة',
  'purchase-invoice': 'فاتورة مشتريات',
  'purchase-order': 'أمر شراء',
  'purchase-return': 'مردود مشتريات',
  'receipt-voucher': 'سند قبض',
  'payment-voucher': 'سند صرف',
};

const typeColors: Record<string, string> = {
  'sales-invoice': '#1e40af',
  'purchase-invoice': '#0f766e',
  'purchase-order': '#7c3aed',
  'purchase-return': '#be185d',
  'receipt-voucher': '#047857',
  'payment-voucher': '#b45309',
};

function formatCurrency(amount: number, currency = 'YER'): string {
  return `${new Intl.NumberFormat('ar-YE').format(amount)} ${currency === 'YER' ? 'ريال' : currency}`;
}

function escapeLineBreaks(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function generateHtml(data: PrintDocumentData): string {
  const color = typeColors[data.type];
  const title = typeTitles[data.type];
  const isInvoice = data.type.includes('invoice') || data.type === 'purchase-order' || data.type === 'purchase-return';

  const linesHtml = data.lines.map((line, i) => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">${escapeLineBreaks(line.description)}</td>
      ${isInvoice ? `
        <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center">${line.quantity ?? '-'}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;direction:ltr">${line.unitPrice !== undefined ? new Intl.NumberFormat('ar-YE').format(line.unitPrice) : '-'}</td>
      ` : ''}
      <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;direction:ltr;font-weight:600">${new Intl.NumberFormat('ar-YE').format(line.total)}</td>
    </tr>
  `).join('');

  const totalsHtml = isInvoice ? `
    <div style="margin-top:16px;border-top:2px solid ${color};padding-top:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#64748b">المجموع الفرعي:</span>
        <span style="font-weight:600;direction:ltr">${formatCurrency(data.subtotal, data.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#64748b">ضريبة القيمة المضافة:</span>
        <span style="font-weight:600;direction:ltr">${formatCurrency(data.vatAmount, data.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px dashed #cbd5e1">
        <span style="font-size:16px;font-weight:700;color:${color}">الإجمالي:</span>
        <span style="font-size:16px;font-weight:700;color:${color};direction:ltr">${formatCurrency(data.totalAmount, data.currency)}</span>
      </div>
    </div>
  ` : `
    <div style="margin-top:16px;border-top:2px solid ${color};padding-top:12px">
      <div style="display:flex;justify-content:space-between;padding-top:8px">
        <span style="font-size:16px;font-weight:700;color:${color}">المبلغ:</span>
        <span style="font-size:16px;font-weight:700;color:${color};direction:ltr">${formatCurrency(data.totalAmount, data.currency)}</span>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - ${escapeHtml(data.docNumber)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', sans-serif;
      background: #f1f5f9;
      padding: 24px;
      color: #1e293b;
    }
    .page {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid ${color};
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-info h2 {
      font-size: 20px;
      font-weight: 700;
      color: ${color};
      margin-bottom: 4px;
    }
    .company-info p {
      font-size: 12px;
      color: #64748b;
    }
    .doc-title {
      text-align: center;
      background: ${color};
      color: white;
      padding: 8px 24px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 16px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    .meta-box h4 {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-box p {
      font-size: 14px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 16px;
    }
    th {
      background: ${color};
      color: white;
      padding: 10px 12px;
      border: 1px solid ${color};
      font-weight: 600;
    }
    td {
      border: 1px solid #e2e8f0;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      margin-top: 48px;
      padding-top: 8px;
      font-size: 12px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 32px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-info">
        <h2>${escapeHtml(data.companyName || 'الشركة')}</h2>
        <p>نظام محاسبي متكامل - maghzaccount-pro</p>
      </div>
      <div class="doc-title">${escapeHtml(title)}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>${escapeHtml(data.partyLabel)}</h4>
        <p>${escapeHtml(data.partyName)}</p>
      </div>
      <div class="meta-box">
        <h4>رقم المستند</h4>
        <p>${escapeHtml(data.docNumber)}</p>
      </div>
      <div class="meta-box">
        <h4>تاريخ المستند</h4>
        <p>${escapeHtml(data.date)}</p>
      </div>
      ${data.dueDate ? `
      <div class="meta-box">
        <h4>تاريخ الاستحقاق</h4>
        <p>${escapeHtml(data.dueDate)}</p>
      </div>
      ` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>البيان</th>
          ${isInvoice ? `<th style="width:80px">الكمية</th><th style="width:100px">السعر</th>` : ''}
          <th style="width:120px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    ${totalsHtml}

    ${data.notes ? `<div style="margin-top:16px;font-size:12px;color:#64748b;background:#f8fafc;padding:8px 12px;border-radius:4px"><strong>ملاحظات:</strong> ${escapeLineBreaks(data.notes)}</div>` : ''}

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">توقيع المستلم</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">توقيع المدير المالي</div>
      </div>
    </div>

    <div class="footer-note">
      تم إصدار هذا المستند إلكترونياً من نظام maghzaccount-pro | لا يعتد به بدون ختم وتوقيع
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px">
    <button onclick="window.print()" style="padding:12px 32px;background:${color};color:white;border:none;border-radius:6px;cursor:pointer;font-family:Cairo;font-size:14px;font-weight:600">
      طباعة / حفظ PDF
    </button>
  </div>
</body>
</html>
  `;
}

export function printDocument(data: PrintDocumentData): void {
  const html = generateHtml(data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
