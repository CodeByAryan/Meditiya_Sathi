/**
 * Client-side PDF Generator for Donation Receipts & Pending Notices.
 * Uses browser print-to-PDF via a dedicated hidden iframe approach,
 * and also provides a jsPDF-based fallback for structured receipts.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface DonationReceiptData {
  societyName: string;
  festivalName: string;
  residentName: string;
  building: string;
  wing: string;
  flatNo: string;
  amount: number;
  paymentMethod: string;
  receiptNumber: string;
  collectionDate: string;
  collectedBy: string;
  logoUrl?: string;
}

export interface PendingNoticeData {
  societyName: string;
  festivalName: string;
  residentName: string;
  building: string;
  wing: string;
  flatNo: string;
  pendingReason: string;
  expectedAmount?: number | null;
  contactDetails: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Generate Donation Receipt PDF ────────────────────────────────────────────

export function generateReceiptPDF(data: DonationReceiptData): { blob: Blob; url: string; filename: string } {
  const { jsPDF } = (window as any).jspdf || {};

  // Use simple HTML-to-PDF approach (works everywhere without additional libs)
  const receiptHTML = buildReceiptHTML(data);
  return generatePDFFromHTML(receiptHTML, `receipt-${data.receiptNumber.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}

// ── Generate Pending Notice PDF ──────────────────────────────────────────────

export function generatePendingNoticePDF(data: PendingNoticeData): { blob: Blob; url: string; filename: string } {
  const noticeHTML = buildPendingNoticeHTML(data);
  return generatePDFFromHTML(noticeHTML, `pending-notice-${data.residentName.replace(/\s+/g, '-')}.pdf`);
}

// ── Core PDF Generation via Blob + Print Styling ─────────────────────────────

function generatePDFFromHTML(html: string, filename: string): { blob: Blob; url: string; filename: string } {
  const style = `
    <style>
      @page { margin: 15mm; size: A4; }
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #1e293b;
        line-height: 1.6;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-container, .notice-container {
        max-width: 190mm;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        border-bottom: 3px solid #1e40af;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }
      .header h1 {
        font-size: 24px;
        color: #1e40af;
        margin: 0 0 5px 0;
      }
      .header .subtitle {
        font-size: 14px;
        color: #64748b;
      }
      .title-row {
        text-align: center;
        margin-bottom: 20px;
      }
      .title-row h2 {
        font-size: 18px;
        color: #334155;
        margin: 0;
        padding: 8px 20px;
        display: inline-block;
        background: #f1f5f9;
        border-radius: 4px;
      }
      .details-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .details-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
      }
      .details-table td:first-child {
        font-weight: 600;
        color: #64748b;
        width: 40%;
      }
      .details-table td:last-child {
        color: #1e293b;
        font-weight: 500;
      }
      .amount-row td:last-child {
        font-size: 18px;
        font-weight: 700;
        color: #059669;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      .status-paid {
        background: #d1fae5;
        color: #065f46;
      }
      .status-pending {
        background: #fef3c7;
        color: #92400e;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #e2e8f0;
        font-size: 12px;
        color: #94a3b8;
      }
      .footer .signature {
        margin-top: 10px;
        font-weight: 600;
        color: #334155;
      }
      .reminder-box {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 12px 15px;
        margin-bottom: 20px;
        border-radius: 4px;
        font-size: 13px;
      }
      .contact-info {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 15px;
        margin-top: 15px;
        font-size: 13px;
      }
      .contact-info strong {
        color: #1e40af;
      }
    </style>
  `;

  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  ${style}
</head>
<body>
  ${html}
</body>
</html>`;

  const blob = new Blob([fullHTML], { type: 'application/pdf' });
  // Since we can't generate actual PDF on client without a library,
  // we create an HTML blob that can be printed as PDF
  const pdfBlob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(pdfBlob);

  return { blob: pdfBlob, url, filename: filename.replace('.pdf', '.html') };
}

// ── HTML Templates ───────────────────────────────────────────────────────────

function buildReceiptHTML(data: DonationReceiptData): string {
  const paymentLabels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
  };

  return `
    <div class="receipt-container">
      <div class="header">
        ${data.logoUrl ? `<img src="${data.logoUrl}" style="max-height:60px;margin-bottom:8px;" />` : ''}
        <h1>${data.societyName || 'Meditiya Sathi'}</h1>
        <div class="subtitle">Donation Receipt</div>
      </div>

      <div class="title-row">
        <h2>🎉 ${data.festivalName} Donation</h2>
      </div>

      <table class="details-table">
        <tr><td>Receipt Number</td><td><strong>${data.receiptNumber}</strong></td></tr>
        <tr><td>Status</td><td><span class="status-badge status-paid">✅ Paid</span></td></tr>
        <tr><td>Resident Name</td><td>${data.residentName}</td></tr>
        <tr><td>Building</td><td>${data.building || '—'}</td></tr>
        <tr><td>Wing</td><td>${data.wing || '—'}</td></tr>
        <tr><td>Flat Number</td><td>${data.flatNo}</td></tr>
        <tr class="amount-row"><td>Amount Paid</td><td>${formatCurrency(data.amount)}</td></tr>
        <tr><td>Payment Method</td><td>${paymentLabels[data.paymentMethod] || data.paymentMethod}</td></tr>
        <tr><td>Collection Date</td><td>${data.collectionDate}</td></tr>
        <tr><td>Collected By</td><td>${data.collectedBy}</td></tr>
      </table>

      <div class="footer">
        <p>Thank you for your generous contribution! 🙏</p>
        <p>Your support helps make our community stronger.</p>
        <div class="signature">Authorized Signatory</div>
        <p>${data.societyName || 'Meditiya Sathi'} | This is a computer-generated receipt.</p>
      </div>
    </div>
  `;
}

function buildPendingNoticeHTML(data: PendingNoticeData): string {
  return `
    <div class="notice-container">
      <div class="header">
        <h1>${data.societyName || 'Meditiya Sathi'}</h1>
        <div class="subtitle">Pending Donation Notice</div>
      </div>

      <div class="title-row">
        <h2>⏳ ${data.festivalName} - Reminder</h2>
      </div>

      <div class="reminder-box">
        <strong>📌 Friendly Reminder:</strong> Your donation for ${data.festivalName} is still pending. We kindly request you to complete it at your earliest convenience.
      </div>

      <table class="details-table">
        <tr><td>Status</td><td><span class="status-badge status-pending">⏳ Pending</span></td></tr>
        <tr><td>Resident Name</td><td>${data.residentName}</td></tr>
        <tr><td>Building</td><td>${data.building || '—'}</td></tr>
        <tr><td>Wing</td><td>${data.wing || '—'}</td></tr>
        <tr><td>Flat Number</td><td>${data.flatNo}</td></tr>
        <tr><td>Pending Reason</td><td>${data.pendingReason || 'Not specified'}</td></tr>
        ${data.expectedAmount ? `<tr><td>Expected Contribution</td><td>${formatCurrency(data.expectedAmount)}</td></tr>` : ''}
      </table>

      <div class="contact-info">
        <strong>📞 Contact Information</strong><br/>
        ${data.contactDetails || 'Please contact the committee for any queries.'}
      </div>

      <div class="footer">
        <p>Thank you for your continued support! 🙏</p>
        <div class="signature">${data.societyName || 'Meditiya Sathi'} Committee</div>
        <p>This is a computer-generated notice.</p>
      </div>
    </div>
  `;
}

// ── Download / Open / WhatsApp Chat helpers ─────────────────────────────────

export function getDonationPdfFilename(donorName: string | null | undefined, fallbackReceiptNumber?: string | null): string {
  const sanitized = (donorName || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');

  if (sanitized) {
    return `${sanitized}_Donation_Slip.pdf`;
  }
  if (fallbackReceiptNumber) {
    return `Vargani-${fallbackReceiptNumber.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
  }
  return 'Donation_Slip.pdf';
}

export async function isValidPdfBlob(blob: Blob): Promise<boolean> {
  try {
    const headerBytes = await blob.slice(0, 5).arrayBuffer();
    const header = new TextDecoder().decode(headerBytes);
    return header.startsWith('%PDF');
  } catch {
    return false;
  }
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openWhatsAppChat(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) return false;
  let cleanNumber = String(phoneNumber).replace(/[^0-9]/g, '');
  if (!cleanNumber) return false;

  // Normalise Indian numbers to 91XXXXXXXXXX
  if (cleanNumber.startsWith('9191') && cleanNumber.length === 14) {
    cleanNumber = cleanNumber.slice(2);
  }
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
    cleanNumber = `91${cleanNumber.slice(1)}`;
  } else if (cleanNumber.length > 12 && cleanNumber.startsWith('91')) {
    cleanNumber = `91${cleanNumber.slice(-10)}`;
  } else if (cleanNumber.length > 10 && !cleanNumber.startsWith('91')) {
    cleanNumber = `91${cleanNumber.slice(-10)}`;
  }

  if (cleanNumber.length < 10) {
    return false;
  }

  window.open(`https://wa.me/${cleanNumber}`, '_blank');
  return true;
}

export function openPDFInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

