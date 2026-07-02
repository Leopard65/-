/**
 * 生成销售小票 HTML
 * @param {Object} sale - 销售数据
 * @returns {string} HTML 字符串
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

export function generateReceiptHTML(sale) {
  const paymentMap = {
    cash: '现金',
    wechat: '微信支付',
    alipay: '支付宝'
  };

  const items = sale.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const discountAmount = sale.originalTotal ? (sale.originalTotal - (sale.total || 0)) : 0;
  const receiptDate = sale.created_at ? new Date(sale.created_at) : new Date();
  const safePayment = paymentMap[sale.payment] || sale.payment || '-';

  return `
    <div class="receipt" style="width: 300px; font-family: 'Courier New', 'Consolas', monospace; padding: 15px; margin: 0 auto; color: #000;">
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin: 0; font-size: 22px; letter-spacing: 2px;">超市管理系统</h2>
        <p style="margin: 5px 0; font-size: 14px;">销 售 小 票</p>
        <p style="margin: 3px 0; font-size: 11px; color: #333;">日期: ${escapeHtml(receiptDate.toLocaleString('zh-CN'))}</p>
        <p style="margin: 3px 0; font-size: 11px; color: #333;">单号: ${escapeHtml(sale.id || '--')}</p>
        <p style="margin: 3px 0; font-size: 11px; color: #333;">收银员: ${escapeHtml(sale.cashier || 'admin')}</p>
      </div>

      <table style="width: 100%; margin: 8px 0; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding: 4px 0;">商品</th>
            <th style="text-align: right; padding: 4px 0;">单价</th>
            <th style="text-align: right; padding: 4px 0;">数量</th>
            <th style="text-align: right; padding: 4px 0;">小计</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="text-align: left; padding: 3px 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.name || item.product_name || '')}</td>
              <td style="text-align: right; padding: 3px 0;">¥${toMoney(item.price)}</td>
              <td style="text-align: right; padding: 3px 0;">${escapeHtml(item.quantity || 0)}</td>
              <td style="text-align: right; padding: 3px 0;">¥${toMoney((item.price || 0) * (item.quantity || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top: 2px dashed #000; padding-top: 8px; font-size: 12px;">
        ${sale.originalTotal && sale.originalTotal !== sale.total ? `
          <p style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>原价:</span>
            <span>¥${toMoney(sale.originalTotal)}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 3px 0; color: #f56c6c;">
            <span>会员折扣:</span>
            <span>-¥${toMoney(discountAmount)}</span>
          </p>
        ` : ''}
        <p style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold;">
          <span>合计:</span>
          <span style="font-size: 16px;">¥${toMoney(sale.total)}</span>
        </p>
        <p style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>支付方式:</span>
          <span>${escapeHtml(safePayment)}</span>
        </p>
        ${sale.member_name ? `
          <p style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>会员:</span>
            <span>${escapeHtml(sale.member_name)}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>获得积分:</span>
            <span>+${escapeHtml(sale.points ?? Math.floor(sale.total || 0))}</span>
          </p>
        ` : ''}
      </div>

      <div style="text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; color: #333;">
        <p style="margin: 3px 0;">谢谢惠顾，欢迎再来!</p>
        <p style="margin: 3px 0;">服务电话: 400-xxx-xxxx</p>
      </div>
    </div>
  `;
}

/**
 * 在当前页面弹窗预览小票（配合 window.print() 打印）
 * @param {Object} sale - 销售数据
 * @param {Function} onClose - 关闭回调
 */
export function previewReceipt(sale, onClose) {
  const html = generateReceiptHTML(sale);

  // 移除已有的预览层
  const existing = document.getElementById('receipt-preview-overlay');
  if (existing) existing.remove();

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'receipt-preview-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

  // 创建预览容器
  const container = document.createElement('div');
  container.style.cssText = 'background:#fff;border-radius:8px;max-height:90vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);position:relative;';

  // 操作栏
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 15px;border-bottom:1px solid #eee;background:#fafafa;border-radius:8px 8px 0 0;';
  const toolbarTitle = document.createElement('span');
  toolbarTitle.textContent = '小票预览';
  toolbarTitle.style.cssText = 'font-weight:bold;font-size:14px;';
  const toolbarActions = document.createElement('div');
  const printButton = document.createElement('button');
  printButton.id = 'receipt-print-btn';
  printButton.type = 'button';
  printButton.textContent = '打印';
  printButton.style.cssText = 'margin-right:8px;padding:6px 16px;background:#409eff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;';
  const closeButton = document.createElement('button');
  closeButton.id = 'receipt-close-btn';
  closeButton.type = 'button';
  closeButton.textContent = '关闭';
  closeButton.style.cssText = 'padding:6px 16px;background:#909399;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;';
  toolbarActions.appendChild(printButton);
  toolbarActions.appendChild(closeButton);
  toolbar.appendChild(toolbarTitle);
  toolbar.appendChild(toolbarActions);

  // 小票内容
  const content = document.createElement('div');
  content.id = 'receipt-content';
  content.style.cssText = 'padding:15px;';
  content.innerHTML = html;

  container.appendChild(toolbar);
  container.appendChild(content);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // 关闭逻辑
  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  document.getElementById('receipt-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 打印逻辑 - 仅打印小票区域
  document.getElementById('receipt-print-btn').addEventListener('click', () => {
    printReceiptArea(sale);
  });
}

/**
 * 使用 window.print() 打印小票区域
 * 通过 CSS @media print 隐藏非小票内容
 */
function printReceiptArea(sale) {
  const html = generateReceiptHTML(sale);
  const printWindow = window.open('', '_blank', 'width=400,height=600');

  if (!printWindow) {
    // 弹窗被阻止时回退：直接在当前页打印
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      document.body.querySelectorAll(':not(#receipt-preview-overlay)').forEach(el => {
        el.style.display = 'none';
      });
      window.print();
      // 恢复显示
      document.body.querySelectorAll(':not(#receipt-preview-overlay)').forEach(el => {
        el.style.display = '';
      });
    }
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>销售小票 - ${escapeHtml(sale.id || '')}</title>
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
            }, 300);
          };
        <\/script>
      </body>
    </html>
  `);
}

/**
 * 直接打印小票（旧版兼容）
 * @param {Object} sale - 销售数据
 */
export function printReceipt(sale) {
  previewReceipt(sale);
}
