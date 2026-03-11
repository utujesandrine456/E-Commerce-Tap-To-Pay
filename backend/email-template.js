// Email Receipt Template
function generateReceiptEmail(transaction) {
  const date = new Date(transaction.timestamp);
  
  // Build items HTML
  let itemsHtml = '';
  if (transaction.items && transaction.items.length > 0) {
    itemsHtml = `
      <div style="margin-top:30px;">
        <h3 style="color:#6366f1;margin:0 0 15px 0;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🛍️ Items Purchased</h3>
        <table style="width:100%;border-collapse:collapse;">`;
    
    transaction.items.forEach(item => {
      const qty = item.qty || item.quantity || 1;
      const itemTotal = item.price * qty;
      itemsHtml += `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:12px 0;color:#374151;font-size:14px;">${item.name} <span style="color:#6b7280;">x${qty}</span></td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:#111827;font-size:14px;">Frw ${itemTotal.toLocaleString()}</td>
          </tr>`;
    });
    
    itemsHtml += `
        </table>
      </div>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; 
          background: #f3f4f6; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.6;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 16px; 
          overflow: hidden; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
          padding: 40px 30px; 
          text-align: center; 
          color: white; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 36px; 
          font-weight: 800; 
          letter-spacing: -0.5px;
        }
        .header p { 
          margin: 8px 0 0 0; 
          font-size: 15px; 
          opacity: 0.95; 
          font-weight: 500;
        }
        .receipt-id { 
          background: rgba(255,255,255,0.25); 
          display: inline-block; 
          padding: 10px 20px; 
          border-radius: 8px; 
          margin-top: 20px; 
          font-family: 'Courier New', monospace; 
          font-size: 14px; 
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 14px 0; 
          border-bottom: 1px solid #e5e7eb; 
          align-items: center;
        }
        .detail-row:last-of-type {
          border-bottom: none;
        }
        .detail-label { 
          color: #6b7280; 
          font-size: 14px; 
          font-weight: 500;
        }
        .detail-value { 
          color: #111827; 
          font-weight: 600; 
          font-size: 14px; 
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 25px 20px; 
          margin-top: 25px; 
          border-top: 3px solid #6366f1; 
          align-items: center;
          background: linear-gradient(to right, rgba(99,102,241,0.05), rgba(139,92,246,0.05));
          border-radius: 8px;
        }
        .total-label { 
          color: #6366f1; 
          font-size: 20px; 
          font-weight: 700; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .total-value { 
          color: #6366f1; 
          font-size: 28px; 
          font-weight: 800; 
        }
        .footer { 
          background: #f9fafb; 
          padding: 35px 30px; 
          text-align: center; 
          color: #6b7280; 
          font-size: 13px; 
          border-top: 1px solid #e5e7eb;
        }
        .footer p { 
          margin: 8px 0; 
        }
        .footer strong {
          color: #374151;
          font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .container { border-radius: 12px; }
          .header { padding: 30px 20px; }
          .header h1 { font-size: 28px; }
          .content { padding: 30px 20px; }
          .total-row { padding: 20px 15px; }
          .total-label { font-size: 16px; }
          .total-value { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 TAP & PAY</h1>
          <p>Payment Receipt</p>
          <div class="receipt-id">: ${transaction.receiptId || 'N/A'}</div>
        </div>
        <div class="content">
          <div class="detail-row">
            <span class="detail-label">📅 Date</span>
            <span class="detail-value">: ${date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Time</span>
            <span class="detail-value">: ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👤 Card Holder</span>
            <span class="detail-value">: ${transaction.holderName || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🔖 Card UID</span>
            <span class="detail-value" style="font-family:'Courier New',monospace;font-size:13px;">: ${transaction.uid || 'N/A'}</span>
          </div>
          ${itemsHtml}
          <div class="total-row">
            <span class="total-label">💰 Total Paid</span>
            <span class="total-value">: Frw ${transaction.amount.toLocaleString()}</span>
          </div>
          <div style="margin-top:25px;padding-top:25px;border-top:1px solid #e5e7eb;">
            <div class="detail-row" style="border-bottom:none;padding:8px 0;">
              <span class="detail-label">Balance Before</span>
              <span class="detail-value" style="color:#6b7280;">: Frw ${transaction.balanceBefore.toLocaleString()}</span>
            </div>
            <div class="detail-row" style="border-bottom:none;padding:8px 0;">
              <span class="detail-label">Balance After</span>
              <span class="detail-value" style="color:#10b981;font-size:16px;">: Frw ${transaction.balanceAfter.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p><strong>Thank you for using TAP & PAY! 🎉</strong></p>
          <p style="margin-top:12px;">Powered by Team RDF</p>
          <p style="margin-top:20px;font-size:11px;color:#9ca3af;">This is an automated receipt. Please do not reply to this email.</p>
          <p style="margin-top:8px;font-size:11px;color:#9ca3af;">For support, contact your system administrator.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { generateReceiptEmail };
