/**
 * 生成销售小票 HTML
 * @param {Object} sale - 销售数据
 * @returns {string} HTML 字符串
 */
export function generateReceiptHTML(sale) {
  const paymentMap = {
    cash: '现金',
    wechat: '微信支付',
    alipay: '支付宝'
  };

  return `
    <div class="receipt" style="width: 300px; font-family: 'Courier New', monospace; padding: 20px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin: 0; font-size: 24px;">超市管理系统</h2>
        <p style="margin: 5px 0; font-size: 14px;">销售小票</p>
        <p style="margin: 5px 0; font-size: 12px;">日期: ${new Date(sale.created_at).toLocaleString()}</p>
        <p style="margin: 5px 0; font-size: 12px;">单号: ${sale.id}</p>
      </div>

      <table style="width: 100%; margin: 10px 0; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding: 5px 0;">商品</th>
            <th style="text-align: right; padding: 5px 0;">单价</th>
            <th style="text-align: right; padding: 5px 0;">数量</th>
            <th style="text-align: right; padding: 5px 0;">小计</th>
          </tr>
        </thead>
        <tbody>
          ${(sale.items || []).map(item => `
            <tr>
              <td style="text-align: left; padding: 3px 0;">${item.product_name || ''}</td>
              <td style="text-align: right; padding: 3px 0;">¥${(item.price || 0).toFixed(2)}</td>
              <td style="text-align: right; padding: 3px 0;">${item.quantity || 0}</td>
              <td style="text-align: right; padding: 3px 0;">¥${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top: 2px dashed #000; padding-top: 10px; font-size: 14px;">
        <p style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>合计:</span>
          <span style="font-weight: bold; font-size: 18px;">¥${(sale.total || 0).toFixed(2)}</span>
        </p>
        <p style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>支付方式:</span>
          <span>${paymentMap[sale.payment] || sale.payment}</span>
        </p>
        ${sale.member_name ? `
          <p style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>会员:</span>
            <span>${sale.member_name}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>获得积分:</span>
            <span>+${Math.floor(sale.total || 0)}</span>
          </p>
        ` : ''}
      </div>

      <div style="text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px;">
        <p style="margin: 5px 0;">谢谢惠顾，欢迎再来!</p>
        <p style="margin: 5px 0;">服务电话: 400-xxx-xxxx</p>
      </div>
    </div>
  `;
}

/**
 * 打印销售小票
 * @param {Object} sale - 销售数据
 */
export function printReceipt(sale) {
  const html = generateReceiptHTML(sale);
  const printWindow = window.open('', '_blank', 'width=400,height=600');

  if (!printWindow) {
    console.error('无法打开打印窗口，请检查浏览器弹窗设置');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>销售小票 - ${sale.id}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; }
            .receipt { page-break-after: always; }
          }
          body {
            display: flex;
            justify-content: center;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        <\/script>
      </body>
    </html>
  `);
}
