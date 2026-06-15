import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 导出数据为 Excel
 * @param {Array} data - 数据数组
 * @param {Array} columns - 列配置 [{prop, label}]
 * @param {String} filename - 文件名
 */
export function exportToExcel(data, columns, filename = 'export') {
  // 准备表头
  const headers = columns.map(col => col.label);

  // 准备数据
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.prop];
      // 处理日期格式
      if (col.prop.includes('date') || col.prop.includes('created_at') || col.prop.includes('updated_at')) {
        return value ? new Date(value).toLocaleString() : '';
      }
      // 处理金额
      if (col.prop.includes('price') || col.prop.includes('cost') || col.prop.includes('total') || col.prop.includes('spent')) {
        return typeof value === 'number' ? value.toFixed(2) : value;
      }
      return value;
    })
  );

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 设置列宽
  ws['!cols'] = columns.map(() => ({ wch: 15 }));

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 导出文件
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * 导出商品数据
 */
export function exportProducts(products) {
  const columns = [
    { prop: 'id', label: 'ID' },
    { prop: 'name', label: '商品名称' },
    { prop: 'barcode', label: '条形码' },
    { prop: 'category_name', label: '分类' },
    { prop: 'price', label: '售价' },
    { prop: 'cost', label: '成本' },
    { prop: 'stock', label: '库存' },
    { prop: 'min_stock', label: '最低库存' },
    { prop: 'unit', label: '单位' },
    { prop: 'created_at', label: '创建时间' }
  ];

  exportToExcel(products, columns, '商品数据');
}

/**
 * 导出销售数据
 */
export function exportSales(sales) {
  const columns = [
    { prop: 'id', label: '订单号' },
    { prop: 'member_name', label: '会员' },
    { prop: 'total', label: '金额' },
    { prop: 'payment', label: '支付方式' },
    { prop: 'created_at', label: '销售时间' }
  ];

  exportToExcel(sales, columns, '销售记录');
}

/**
 * 导出会员数据
 */
export function exportMembers(members) {
  const columns = [
    { prop: 'id', label: 'ID' },
    { prop: 'name', label: '姓名' },
    { prop: 'phone', label: '手机号' },
    { prop: 'level', label: '等级' },
    { prop: 'points', label: '积分' },
    { prop: 'total_spent', label: '累计消费' },
    { prop: 'created_at', label: '注册时间' }
  ];

  exportToExcel(members, columns, '会员数据');
}

/**
 * 导出供应商数据
 */
export function exportSuppliers(suppliers) {
  const columns = [
    { prop: 'id', label: 'ID' },
    { prop: 'name', label: '供应商名称' },
    { prop: 'contact', label: '联系人' },
    { prop: 'phone', label: '电话' },
    { prop: 'address', label: '地址' },
    { prop: 'created_at', label: '创建时间' }
  ];

  exportToExcel(suppliers, columns, '供应商数据');
}

// ===== Excel 导入（商品）=====

// 导入模板表头（与导出对称，去掉 ID/创建时间），及到字段的映射
const PRODUCT_IMPORT_HEADERS = ['商品名称', '条码', '分类', '售价', '成本', '库存', '最低库存', '单位'];
const PRODUCT_HEADER_MAP = {
  商品名称: 'name',
  条码: 'barcode',
  分类: 'category_name',
  售价: 'price',
  成本: 'cost',
  库存: 'stock',
  最低库存: 'min_stock',
  单位: 'unit'
};

/**
 * 解析商品 Excel 文件为对象数组（按中文表头映射到字段）
 * @param {File} file
 * @returns {Promise<Array>}
 */
export function parseProductsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const rows = json.map(r => {
          const obj = {};
          for (const [zh, key] of Object.entries(PRODUCT_HEADER_MAP)) {
            obj[key] = r[zh] !== undefined ? r[zh] : '';
          }
          return obj;
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 下载商品导入模板
 */
export function downloadProductTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    PRODUCT_IMPORT_HEADERS,
    ['示例可乐 330ml', '6900000000001', '食品饮料', 3.5, 2.0, 100, 20, '瓶']
  ]);
  ws['!cols'] = PRODUCT_IMPORT_HEADERS.map(() => ({ wch: 15 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), '商品导入模板.xlsx');
}
