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
