const categories = [
  '食品饮料',
  '日用百货',
  '生鲜水果',
  '粮油调味',
  '零食糖果',
  '冷冻速食',
  '清洁洗护',
  '文具杂货'
];

const products = [
  { name: '可口可乐 330ml', barcode: '6901234567890', category: '食品饮料', price: 3.5, cost: 2.0, stock: 100, min_stock: 20, unit: '瓶', image: '/products/kelecola.jpg' },
  { name: '农夫山泉 550ml', barcode: '6901234567891', category: '食品饮料', price: 2.0, cost: 1.0, stock: 200, min_stock: 30, unit: '瓶', image: '/products/nongfushanquan.jpg' },
  { name: '伊利纯牛奶', barcode: '6901234567892', category: '食品饮料', price: 5.8, cost: 3.5, stock: 80, min_stock: 15, unit: '盒', image: '/products/yili.jpg' },
  { name: '舒肤佳香皂', barcode: '6901234567893', category: '日用百货', price: 8.9, cost: 5.0, stock: 50, min_stock: 10, unit: '块', image: '/products/shufujia.jpg' },
  { name: '维达纸巾', barcode: '6901234567894', category: '日用百货', price: 12.9, cost: 7.0, stock: 60, min_stock: 10, unit: '提', image: '/products/vida.jpg' },
  { name: '红富士苹果', barcode: '6901234567895', category: '生鲜水果', price: 6.8, cost: 3.0, stock: 150, min_stock: 20, unit: '斤', image: '/products/hongfushi.jpg' },
  { name: '金龙鱼调和油', barcode: '6901234567896', category: '粮油调味', price: 59.9, cost: 40.0, stock: 30, min_stock: 5, unit: '桶', image: '/products/jinlongyu.jpg' },
  { name: '老干妈辣酱', barcode: '6901234567897', category: '粮油调味', price: 9.9, cost: 6.0, stock: 80, min_stock: 15, unit: '瓶', image: '/products/laoganma.jpg' },
  { name: '乐事薯片', barcode: '6901234567898', category: '零食糖果', price: 7.9, cost: 4.0, stock: 120, min_stock: 20, unit: '袋', image: '/products/leshisupian.jpg' },
  { name: '德芙巧克力', barcode: '6901234567899', category: '零食糖果', price: 15.9, cost: 9.0, stock: 60, min_stock: 10, unit: '盒', image: '/products/devor.jpg' },
  { name: '精品香蕉 600g', barcode: '6901234567900', category: '生鲜水果', price: 7.5, cost: 3.8, stock: 90, min_stock: 18, unit: '盒', image: '/products/generated/fresh-bananas.jpg' },
  { name: '盒装鲜鸡蛋 10枚', barcode: '6901234567901', category: '食品饮料', price: 12.8, cost: 8.2, stock: 70, min_stock: 12, unit: '盒', image: '/products/generated/eggs-carton.jpg' },
  { name: '原味酸奶 180g', barcode: '6901234567902', category: '食品饮料', price: 4.6, cost: 2.5, stock: 110, min_stock: 22, unit: '杯', image: '/products/generated/yogurt-cup.jpg' },
  { name: '红烧牛肉面', barcode: '6901234567903', category: '冷冻速食', price: 5.5, cost: 3.0, stock: 130, min_stock: 24, unit: '袋', image: '/products/generated/instant-noodles.jpg' },
  { name: '茉莉绿茶 500ml', barcode: '6901234567904', category: '食品饮料', price: 3.8, cost: 2.1, stock: 160, min_stock: 32, unit: '瓶', image: '/products/generated/jasmine-tea-bottle.jpg' },
  { name: '橙汁 1L', barcode: '6901234567905', category: '食品饮料', price: 9.9, cost: 5.8, stock: 85, min_stock: 16, unit: '盒', image: '/products/generated/orange-juice-carton.jpg' },
  { name: '鲜黄瓜 500g', barcode: '6901234567906', category: '生鲜水果', price: 4.9, cost: 2.2, stock: 100, min_stock: 20, unit: '盒', image: '/products/generated/cucumber-tray.jpg' },
  { name: '圣女果 250g', barcode: '6901234567907', category: '生鲜水果', price: 8.8, cost: 4.3, stock: 75, min_stock: 15, unit: '盒', image: '/products/generated/tomato-punnet.jpg' },
  { name: '速冻水饺 500g', barcode: '6901234567908', category: '冷冻速食', price: 18.9, cost: 11.5, stock: 65, min_stock: 14, unit: '袋', image: '/products/generated/frozen-dumplings.jpg' },
  { name: '东北大米 5kg', barcode: '6901234567909', category: '粮油调味', price: 39.9, cost: 26.0, stock: 45, min_stock: 8, unit: '袋', image: '/products/generated/rice-bag.jpg' },
  { name: '生抽酱油 500ml', barcode: '6901234567910', category: '粮油调味', price: 8.5, cost: 4.6, stock: 95, min_stock: 18, unit: '瓶', image: '/products/generated/soy-sauce-bottle.jpg' },
  { name: '蓝净洗衣液 2kg', barcode: '6901234567911', category: '清洁洗护', price: 29.9, cost: 18.0, stock: 55, min_stock: 10, unit: '瓶', image: '/products/generated/laundry-detergent.jpg' },
  { name: '清新牙膏 120g', barcode: '6901234567912', category: '清洁洗护', price: 13.9, cost: 7.2, stock: 80, min_stock: 16, unit: '盒', image: '/products/generated/toothpaste-box.jpg' },
  { name: '清爽洗发水 500ml', barcode: '6901234567913', category: '清洁洗护', price: 32.9, cost: 19.5, stock: 50, min_stock: 9, unit: '瓶', image: '/products/generated/shampoo-bottle.jpg' },
  { name: '学生笔记本 3本装', barcode: '6901234567914', category: '文具杂货', price: 10.9, cost: 5.5, stock: 70, min_stock: 12, unit: '包', image: '/products/generated/notebook-pack.jpg' },
  { name: '5号电池 2粒装', barcode: '6901234567915', category: '文具杂货', price: 6.9, cost: 3.4, stock: 95, min_stock: 18, unit: '板', image: '/products/generated/battery-pack.jpg' },
  { name: '混合坚果礼盒', barcode: '6901234567916', category: '零食糖果', price: 45.9, cost: 28.0, stock: 40, min_stock: 8, unit: '盒', image: '/products/generated/mixed-nuts-box.jpg' }
];

const suppliers = [
  { name: '华润万家批发部', contact: '张经理', phone: '13800001111', address: '北京市朝阳区' },
  { name: '百事可乐经销商', contact: '李经理', phone: '13800002222', address: '北京市海淀区' },
  { name: '鲜达生鲜配送中心', contact: '陈主管', phone: '13800003333', address: '北京市丰台区' },
  { name: '北方粮油供应链', contact: '赵经理', phone: '13800004444', address: '北京市通州区' },
  { name: '洁净日化仓配', contact: '吴经理', phone: '13800005555', address: '北京市顺义区' }
];

const members = [
  { name: '王小明', phone: '13900001111', points: 200, total_spent: 1580.5 },
  { name: '李芳', phone: '13900002222', points: 50, total_spent: 320.0 },
  { name: '赵敏', phone: '13900003333', points: 860, total_spent: 4230.8 },
  { name: '孙强', phone: '13900004444', points: 1280, total_spent: 8120.2 },
  { name: '周娜', phone: '13900005555', points: 420, total_spent: 2188.0 },
  { name: '吴磊', phone: '13900006666', points: 160, total_spent: 920.5 }
];

module.exports = {
  categories,
  products,
  suppliers,
  members
};
