import { ORDER_STATUS, STORAGE_KEYS } from '@/constants/status'

export const categories = [
  { _id: 'cat-life', name: '生活方式', icon: '/static/demo/goods-lamp-main.png', sort: 1 },
  { _id: 'cat-wear', name: '衣橱精选', icon: '/static/demo/goods-shirt-main.png', sort: 2 },
  { _id: 'cat-digital', name: '轻数码', icon: '/static/demo/goods-earbuds-main.png', sort: 3 },
  { _id: 'cat-beauty', name: '个护美妆', icon: '/static/demo/goods-bodywash-main.png', sort: 4 },
  { _id: 'cat-food', name: '风味食品', icon: '/static/demo/goods-granola-main.png', sort: 5 }
]

export const subCategories = [
  { _id: 'sub-home-textile', parent_id: 'cat-life', name: '家纺', icon: '/static/demo/goods-towel-main.png' },
  { _id: 'sub-cup', parent_id: 'cat-life', name: '杯壶', icon: '/static/demo/goods-cup-main.png' },
  { _id: 'sub-lighting', parent_id: 'cat-life', name: '灯具', icon: '/static/demo/goods-lamp-main.png' },
  { _id: 'sub-men', parent_id: 'cat-wear', name: '基础穿搭', icon: '/static/demo/goods-shirt-main.png' },
  { _id: 'sub-bags', parent_id: 'cat-wear', name: '包袋', icon: '/static/demo/goods-tote-main.png' },
  { _id: 'sub-audio', parent_id: 'cat-digital', name: '音频', icon: '/static/demo/goods-earbuds-main.png' },
  { _id: 'sub-power', parent_id: 'cat-digital', name: '充电设备', icon: '/static/demo/goods-charger-main.png' },
  { _id: 'sub-keyboard', parent_id: 'cat-digital', name: '键盘', icon: '/static/demo/goods-keyboard-main.png' },
  { _id: 'sub-care', parent_id: 'cat-beauty', name: '身体护理', icon: '/static/demo/goods-bodywash-main.png' },
  { _id: 'sub-snack', parent_id: 'cat-food', name: '轻食零嘴', icon: '/static/demo/goods-granola-main.png' },
  { _id: 'sub-drink', parent_id: 'cat-food', name: '茶饮', icon: '/static/demo/goods-tea-main.png' }
]

export const goods = [
  {
    _id: 'goods-shirt',
    name: '云朵感基础款短袖 T 恤',
    subtitle: '细密棉感，适合通勤与周末',
    price: 129,
    original_price: 169,
    image: '/static/demo/goods-shirt-main.png',
    images: ['/static/demo/goods-shirt-main.png', '/static/demo/goods-shirt-detail.png'],
    category_id: 'cat-wear',
    sub_category_id: 'sub-men',
    brand: 'LUMA',
    stock: 72,
    sales: 1280,
    status: 1,
    is_new: true,
    is_hot: true,
    is_recommend: 1,
    tags: ['亲肤棉', '不易透', '可机洗'],
    detail: '精选长绒棉混纺，版型干净，领口和袖口做了更稳的定型处理。'
  },
  {
    _id: 'goods-earbuds',
    name: '轻巧无线蓝牙耳机',
    subtitle: '通勤降噪，低延迟连接',
    price: 259,
    original_price: 329,
    image: '/static/demo/goods-earbuds-main.png',
    images: ['/static/demo/goods-earbuds-main.png', '/static/demo/goods-earbuds-detail.png'],
    category_id: 'cat-digital',
    sub_category_id: 'sub-audio',
    brand: 'MORI',
    stock: 38,
    sales: 856,
    status: 1,
    is_new: false,
    is_hot: true,
    is_recommend: 1,
    tags: ['蓝牙5.3', '24h续航', '轻降噪'],
    detail: '半入耳舒适佩戴，适合会议、运动和日常听歌。'
  },
  {
    _id: 'goods-cup',
    name: '便携保温杯 480ml',
    subtitle: '一手可握，整日保温',
    price: 89,
    original_price: 119,
    image: '/static/demo/goods-cup-main.png',
    images: ['/static/demo/goods-cup-main.png', '/static/demo/goods-cup-detail.png'],
    category_id: 'cat-life',
    sub_category_id: 'sub-cup',
    brand: 'NEST',
    stock: 120,
    sales: 2140,
    status: 1,
    is_new: false,
    is_hot: true,
    is_recommend: 1,
    tags: ['316不锈钢', '防漏', '轻量'],
    detail: '杯口细腻，密封稳定，适合办公室、车载和短途旅行。'
  },
  {
    _id: 'goods-towel',
    name: '柔软亲肤浴巾套装',
    subtitle: '高克重棉，吸水蓬松',
    price: 159,
    original_price: 199,
    image: '/static/demo/goods-towel-main.png',
    images: ['/static/demo/goods-towel-main.png', '/static/demo/goods-towel-detail.png'],
    category_id: 'cat-life',
    sub_category_id: 'sub-home-textile',
    brand: 'NEST',
    stock: 64,
    sales: 532,
    status: 1,
    is_new: true,
    is_hot: false,
    is_recommend: 1,
    tags: ['A类棉', '双条装', '柔软'],
    detail: '蓬松触感，洗后不易发硬，为浴室带来安静的高级感。'
  },
  {
    _id: 'goods-lamp',
    name: '柔光便携氛围灯',
    subtitle: '轻触调光，陪伴床头与露台时光',
    price: 169,
    original_price: 219,
    image: '/static/demo/goods-lamp-main.png',
    images: ['/static/demo/goods-lamp-main.png', '/static/demo/goods-lamp-detail.png'],
    category_id: 'cat-life',
    sub_category_id: 'sub-lighting',
    brand: 'NEST',
    stock: 86,
    sales: 746,
    status: 1,
    is_new: true,
    is_hot: true,
    is_recommend: 1,
    tags: ['三档调光', 'Type-C充电', '轻巧便携'],
    detail: '磨砂灯罩过滤刺眼光线，内置电池支持自由移动，适合卧室、餐桌与轻户外场景。'
  },
  {
    _id: 'goods-tote',
    name: '城市通勤帆布托特包',
    subtitle: '挺括有序，装下每日通勤所需',
    price: 139,
    original_price: 179,
    image: '/static/demo/goods-tote-main.png',
    images: ['/static/demo/goods-tote-main.png', '/static/demo/goods-tote-detail.png'],
    category_id: 'cat-wear',
    sub_category_id: 'sub-bags',
    brand: 'LUMA',
    stock: 90,
    sales: 638,
    status: 1,
    is_new: true,
    is_hot: false,
    is_recommend: 1,
    tags: ['加厚帆布', '内部分区', '可肩背'],
    detail: '高密帆布配合宽肩带，内置水杯位与拉链袋，兼顾通勤秩序和周末松弛感。'
  },
  {
    _id: 'goods-charger',
    name: '65W 氮化镓充电器',
    subtitle: '三口快充，一枚满足多设备',
    price: 199,
    original_price: 249,
    image: '/static/demo/goods-charger-main.png',
    images: ['/static/demo/goods-charger-main.png', '/static/demo/goods-charger-detail.png'],
    category_id: 'cat-digital',
    sub_category_id: 'sub-power',
    brand: 'MORI',
    stock: 102,
    sales: 1690,
    status: 1,
    is_new: false,
    is_hot: true,
    is_recommend: 1,
    tags: ['65W快充', '双C一A', '折叠插脚'],
    detail: '紧凑机身支持笔记本、平板与手机智能分配功率，出差只需携带一枚充电器。'
  },
  {
    _id: 'goods-keyboard',
    name: '静音便携机械键盘',
    subtitle: '紧凑配列，安静而清晰的手感',
    price: 359,
    original_price: 429,
    image: '/static/demo/goods-keyboard-main.png',
    images: ['/static/demo/goods-keyboard-main.png', '/static/demo/goods-keyboard-detail.png'],
    category_id: 'cat-digital',
    sub_category_id: 'sub-keyboard',
    brand: 'MORI',
    stock: 54,
    sales: 462,
    status: 1,
    is_new: true,
    is_hot: false,
    is_recommend: 1,
    tags: ['75%配列', '三模连接', '静音轴'],
    detail: '保留常用功能键与方向区，支持有线、蓝牙和 2.4G 连接，适合共享办公室与移动桌面。'
  },
  {
    _id: 'goods-bodywash',
    name: '氨基酸清润沐浴露',
    subtitle: '细腻泡沫，洗后清爽不紧绷',
    price: 79,
    original_price: 99,
    image: '/static/demo/goods-bodywash-main.png',
    images: ['/static/demo/goods-bodywash-main.png', '/static/demo/goods-bodywash-detail.png'],
    category_id: 'cat-beauty',
    sub_category_id: 'sub-care',
    brand: 'AMI',
    stock: 138,
    sales: 1186,
    status: 1,
    is_new: false,
    is_hot: true,
    is_recommend: 1,
    tags: ['氨基酸表活', '淡雅香气', '易冲洗'],
    detail: '温和清洁配方带来绵密泡沫，清新的草木香气适合每日沐浴与运动后使用。'
  },
  {
    _id: 'goods-handcream',
    name: '植萃修护护手霜',
    subtitle: '轻盈吸收，随身照顾干燥双手',
    price: 59,
    original_price: 75,
    image: '/static/demo/goods-handcream-main.png',
    images: ['/static/demo/goods-handcream-main.png', '/static/demo/goods-handcream-detail.png'],
    category_id: 'cat-beauty',
    sub_category_id: 'sub-care',
    brand: 'AMI',
    stock: 124,
    sales: 924,
    status: 1,
    is_new: true,
    is_hot: false,
    is_recommend: 1,
    tags: ['乳木果油', '不黏腻', '便携铝管'],
    detail: '柔润乳霜推开后快速吸收，帮助改善指缘与手背干燥，适合办公室和差旅随身使用。'
  },
  {
    _id: 'goods-granola',
    name: '烘焙坚果燕麦脆',
    subtitle: '谷物酥香，为早餐增加好口感',
    price: 49,
    original_price: 59,
    image: '/static/demo/goods-granola-main.png',
    images: ['/static/demo/goods-granola-main.png', '/static/demo/goods-granola-detail.png'],
    category_id: 'cat-food',
    sub_category_id: 'sub-snack',
    brand: 'FIELD',
    stock: 160,
    sales: 1864,
    status: 1,
    is_new: false,
    is_hot: true,
    is_recommend: 1,
    tags: ['整粒坚果', '低温烘焙', '独立封口'],
    detail: '燕麦、扁桃仁与南瓜籽低温烘焙，搭配牛奶、酸奶或直接食用都保持清脆口感。'
  },
  {
    _id: 'goods-tea',
    name: '白桃乌龙冷泡茶',
    subtitle: '清甜果香，冷水也能轻松泡开',
    price: 39,
    original_price: 49,
    image: '/static/demo/goods-tea-main.png',
    images: ['/static/demo/goods-tea-main.png', '/static/demo/goods-tea-detail.png'],
    category_id: 'cat-food',
    sub_category_id: 'sub-drink',
    brand: 'FIELD',
    stock: 144,
    sales: 1328,
    status: 1,
    is_new: true,
    is_hot: false,
    is_recommend: 1,
    tags: ['原叶三角包', '冷泡友好', '清甜不腻'],
    detail: '乌龙茶底融合自然白桃香气，三角茶包充分舒展，冷藏四小时即可得到清爽茶汤。'
  }
]

export const skus = [
  { _id: 'sku-shirt-white-m', goods_id: 'goods-shirt', spec_values: '颜色:雾白,尺码:M', price: 129, stock: 24, image: '/static/demo/goods-shirt-main.png' },
  { _id: 'sku-shirt-white-l', goods_id: 'goods-shirt', spec_values: '颜色:雾白,尺码:L', price: 129, stock: 20, image: '/static/demo/goods-shirt-main.png' },
  { _id: 'sku-shirt-black-m', goods_id: 'goods-shirt', spec_values: '颜色:墨黑,尺码:M', price: 139, stock: 18, image: '/static/demo/goods-shirt-main.png' },
  { _id: 'sku-earbuds-cream', goods_id: 'goods-earbuds', spec_values: '颜色:瓷白', price: 259, stock: 20, image: '/static/demo/goods-earbuds-main.png' },
  { _id: 'sku-earbuds-black', goods_id: 'goods-earbuds', spec_values: '颜色:曜黑', price: 259, stock: 18, image: '/static/demo/goods-earbuds-main.png' },
  { _id: 'sku-cup-sand', goods_id: 'goods-cup', spec_values: '颜色:岩砂', price: 89, stock: 52, image: '/static/demo/goods-cup-main.png' },
  { _id: 'sku-cup-green', goods_id: 'goods-cup', spec_values: '颜色:松绿', price: 89, stock: 68, image: '/static/demo/goods-cup-main.png' },
  { _id: 'sku-towel-set', goods_id: 'goods-towel', spec_values: '组合:两条装', price: 159, stock: 64, image: '/static/demo/goods-towel-main.png' },
  { _id: 'sku-lamp-cream', goods_id: 'goods-lamp', spec_values: '颜色:奶油白', price: 169, stock: 46, image: '/static/demo/goods-lamp-main.png' },
  { _id: 'sku-lamp-green', goods_id: 'goods-lamp', spec_values: '颜色:苔藓绿', price: 169, stock: 40, image: '/static/demo/goods-lamp-main.png' },
  { _id: 'sku-tote-ecru', goods_id: 'goods-tote', spec_values: '颜色:原色帆布', price: 139, stock: 52, image: '/static/demo/goods-tote-main.png' },
  { _id: 'sku-tote-green', goods_id: 'goods-tote', spec_values: '颜色:松柏绿', price: 149, stock: 38, image: '/static/demo/goods-tote-main.png' },
  { _id: 'sku-charger-white', goods_id: 'goods-charger', spec_values: '颜色:瓷白', price: 199, stock: 58, image: '/static/demo/goods-charger-main.png' },
  { _id: 'sku-charger-gray', goods_id: 'goods-charger', spec_values: '颜色:雾灰', price: 199, stock: 44, image: '/static/demo/goods-charger-main.png' },
  { _id: 'sku-keyboard-cream', goods_id: 'goods-keyboard', spec_values: '配列:75%,颜色:米白', price: 359, stock: 30, image: '/static/demo/goods-keyboard-main.png' },
  { _id: 'sku-keyboard-green', goods_id: 'goods-keyboard', spec_values: '配列:75%,颜色:森林绿', price: 379, stock: 24, image: '/static/demo/goods-keyboard-main.png' },
  { _id: 'sku-bodywash-herb', goods_id: 'goods-bodywash', spec_values: '香型:雨后草木,容量:500ml', price: 79, stock: 76, image: '/static/demo/goods-bodywash-main.png' },
  { _id: 'sku-bodywash-citrus', goods_id: 'goods-bodywash', spec_values: '香型:清新柑橘,容量:500ml', price: 79, stock: 62, image: '/static/demo/goods-bodywash-main.png' },
  { _id: 'sku-handcream-fig', goods_id: 'goods-handcream', spec_values: '香型:无花果,容量:50g', price: 59, stock: 68, image: '/static/demo/goods-handcream-main.png' },
  { _id: 'sku-handcream-cedar', goods_id: 'goods-handcream', spec_values: '香型:雪松,容量:50g', price: 59, stock: 56, image: '/static/demo/goods-handcream-main.png' },
  { _id: 'sku-granola-nut', goods_id: 'goods-granola', spec_values: '口味:经典坚果,净含量:400g', price: 49, stock: 88, image: '/static/demo/goods-granola-main.png' },
  { _id: 'sku-granola-berry', goods_id: 'goods-granola', spec_values: '口味:莓果酸奶,净含量:400g', price: 52, stock: 72, image: '/static/demo/goods-granola-main.png' },
  { _id: 'sku-tea-peach', goods_id: 'goods-tea', spec_values: '口味:白桃乌龙,规格:12包', price: 39, stock: 82, image: '/static/demo/goods-tea-main.png' },
  { _id: 'sku-tea-grape', goods_id: 'goods-tea', spec_values: '口味:葡萄茉莉,规格:12包', price: 39, stock: 62, image: '/static/demo/goods-tea-main.png' }
]

export const banners = [
  {
    _id: 'banner-living',
    image: '/static/demo/banner-living.png',
    title: '安静而有质感的日常',
    subtitle: '精选衣物、家居与个护好物',
    link: ''
  },
  {
    _id: 'banner-tech',
    image: '/static/demo/banner-tech.png',
    title: '轻装出发，也保留效率',
    subtitle: '通勤数码与随行器物焕新',
    link: ''
  }
]

export const coupons = [
  { _id: 'coupon-20', title: '新人礼券', amount: 20, threshold: 99, status: 'available', expire: '2026-12-31' },
  { _id: 'coupon-50', title: '精品满减券', amount: 50, threshold: 299, status: 'available', expire: '2026-12-31' },
  { _id: 'coupon-care-15', title: '个护专享券', amount: 15, threshold: 79, status: 'available', expire: '2026-10-31' }
]

export const defaultUserCoupons = [
  {
    _id: 'uc-mock-coupon-20',
    user_id: 'mock-user',
    coupon_id: 'coupon-20',
    status: 'available',
    receive_time: Date.now() - 86400000,
    create_date: Date.now() - 86400000,
    update_date: Date.now() - 86400000
  }
]

export const messages = [
  { _id: 'msg-1', type: 'order', title: '订单提醒', content: '你的待付款订单将在 30 分钟后自动取消。', read: false, create_date: Date.now() - 3600000 },
  { _id: 'msg-2', type: 'promo', title: '精选上新', content: '本周生活方式新品已经上架。', read: true, create_date: Date.now() - 86400000 },
  { _id: 'msg-3', type: 'coupon', title: '个护专享券到账', content: '满 79 元可减 15 元，去挑选温和护理好物。', read: false, create_date: Date.now() - 2 * 86400000 },
  { _id: 'msg-4', type: 'system', title: '服务升级完成', content: '订单、物流与售后记录现已支持更清晰的状态追踪。', read: true, create_date: Date.now() - 4 * 86400000 }
]

export const evaluations = [
  { _id: 'eval-shirt', goods_id: 'goods-shirt', user_name: '周女士', star: 5, score: 5, content: '面料细密，白色也不会明显透，版型很适合通勤。', images: [], create_date: Date.now() - 12 * 86400000 },
  { _id: 'eval-earbuds', goods_id: 'goods-earbuds', user_name: '陈先生', star: 4, score: 4, content: '连接稳定，通勤听播客很轻便，充电盒手感不错。', images: [], create_date: Date.now() - 11 * 86400000 },
  { _id: 'eval-cup', goods_id: 'goods-cup', user_name: '林女士', star: 5, score: 5, content: '杯身质感很好，放在通勤包里没有漏水。', images: [], create_date: Date.now() - 10 * 86400000 },
  { _id: 'eval-towel', goods_id: 'goods-towel', user_name: '许先生', star: 5, score: 5, content: '吸水快，洗过两次依旧蓬松，颜色也很耐看。', images: [], create_date: Date.now() - 9 * 86400000 },
  { _id: 'eval-lamp', goods_id: 'goods-lamp', user_name: '杨女士', star: 5, score: 5, content: '床头使用亮度刚好，轻触调光比预想更顺手。', images: [], create_date: Date.now() - 8 * 86400000 },
  { _id: 'eval-tote', goods_id: 'goods-tote', user_name: '沈女士', star: 4, score: 4, content: '电脑和水杯都能分开放，肩带宽度背久了也舒服。', images: [], create_date: Date.now() - 7 * 86400000 },
  { _id: 'eval-charger', goods_id: 'goods-charger', user_name: '赵先生', star: 5, score: 5, content: '出差少带了两个充电头，给轻薄本充电速度够用。', images: [], create_date: Date.now() - 6 * 86400000 },
  { _id: 'eval-keyboard', goods_id: 'goods-keyboard', user_name: '顾先生', star: 4, score: 4, content: '声音克制，连接切换快，桌面终于清爽了很多。', images: [], create_date: Date.now() - 5 * 86400000 },
  { _id: 'eval-bodywash', goods_id: 'goods-bodywash', user_name: '唐女士', star: 5, score: 5, content: '泡沫细，冲洗后没有滑腻感，草木香很自然。', images: [], create_date: Date.now() - 4 * 86400000 },
  { _id: 'eval-handcream', goods_id: 'goods-handcream', user_name: '叶女士', star: 5, score: 5, content: '吸收很快，敲键盘前用也不会留下油印。', images: [], create_date: Date.now() - 3 * 86400000 },
  { _id: 'eval-granola', goods_id: 'goods-granola', user_name: '韩先生', star: 4, score: 4, content: '坚果比例足，搭配无糖酸奶就是很方便的早餐。', images: [], create_date: Date.now() - 2 * 86400000 },
  { _id: 'eval-tea', goods_id: 'goods-tea', user_name: '宋女士', star: 5, score: 5, content: '冷藏一晚茶汤很清爽，白桃香不会过分甜腻。', images: [], create_date: Date.now() - 86400000 }
]

const demoOrderAddress = {
  name: '曾先生',
  phone: '13800138000',
  province: '广东省',
  city: '深圳市',
  district: '南山区',
  detail: '科技园精品公寓 8 栋 1201'
}

export const demoOrders = [
  {
    _id: 'order-demo-pending', order_no: 'XCDEMO20260719001', status: ORDER_STATUS.pendingPay,
    address: demoOrderAddress,
    goods_list: [{ goods_id: 'goods-lamp', sku_id: 'sku-lamp-cream', goods_name: '柔光便携氛围灯', goods_image: '/static/demo/goods-lamp-main.png', price: 169, quantity: 1, subtotal: 169, sku_info: '颜色:奶油白' }],
    total_amount: 169, freight: 0, discount_amount: 20, pay_amount: 149, coupon_id: 'coupon-20', remark: '', pay_method: '',
    create_date: Date.now() - 12 * 60000, pay_expire_time: Date.now() + 18 * 60000
  },
  {
    _id: 'order-demo-shipped', order_no: 'XCDEMO20260715002', status: ORDER_STATUS.pendingReceive,
    address: demoOrderAddress,
    goods_list: [{ goods_id: 'goods-charger', sku_id: 'sku-charger-white', goods_name: '65W 氮化镓充电器', goods_image: '/static/demo/goods-charger-main.png', price: 199, quantity: 1, subtotal: 199, sku_info: '颜色:瓷白' }],
    total_amount: 199, freight: 0, discount_amount: 0, pay_amount: 199, coupon_id: '', remark: '工作日送达', pay_method: 'wechat',
    logistics_company: '顺丰速运', tracking_no: 'SFDEMO20260715002', create_date: Date.now() - 4 * 86400000, pay_time: Date.now() - 4 * 86400000 + 300000, ship_time: Date.now() - 3 * 86400000
  },
  {
    _id: 'order-demo-completed', order_no: 'XCDEMO20260708003', status: ORDER_STATUS.completed,
    address: demoOrderAddress,
    goods_list: [
      { goods_id: 'goods-tote', sku_id: 'sku-tote-ecru', goods_name: '城市通勤帆布托特包', goods_image: '/static/demo/goods-tote-main.png', price: 139, quantity: 1, subtotal: 139, sku_info: '颜色:原色帆布' },
      { goods_id: 'goods-handcream', sku_id: 'sku-handcream-fig', goods_name: '植萃修护护手霜', goods_image: '/static/demo/goods-handcream-main.png', price: 59, quantity: 1, subtotal: 59, sku_info: '香型:无花果,容量:50g' }
    ],
    total_amount: 198, freight: 0, discount_amount: 0, pay_amount: 198, coupon_id: '', remark: '', pay_method: 'alipay',
    create_date: Date.now() - 11 * 86400000, pay_time: Date.now() - 11 * 86400000 + 180000, ship_time: Date.now() - 10 * 86400000, confirm_time: Date.now() - 8 * 86400000, evaluate_time: Date.now() - 7 * 86400000
  }
]

export const demoAfterSales = [
  {
    _id: 'aftersale-demo-completed', aftersale_no: 'ASDEMO20260712001', order_id: 'order-demo-completed', prev_order_status: ORDER_STATUS.completed,
    goods_ids: ['goods-handcream'], goods_list: [demoOrders[2].goods_list[1]], type: 'refund', reason: '包装轻微挤压', refund_amount: 12,
    description: '商品可正常使用，客服协商补偿部分金额。', images: [], status: 4, audit_result: 'approved', audit_remark: '已完成部分退款',
    create_date: Date.now() - 7 * 86400000, audit_time: Date.now() - 6 * 86400000, complete_time: Date.now() - 6 * 86400000
  }
]

export const operationLogs = [
  { _id: 'oplog-demo-seed', operator_id: 'mock-user', operator_name: '薪超体验官', action: 'seedDemoData', target: 'system', target_id: 'demo', remark: '初始化演示数据', create_date: Date.now() - 5 * 86400000 },
  { _id: 'oplog-demo-goods', operator_id: 'mock-user', operator_name: '薪超体验官', action: 'updateGoodsStatus', target: 'goods', target_id: 'goods-lamp', remark: '确认新品上架', create_date: Date.now() - 4 * 86400000 },
  { _id: 'oplog-demo-order', operator_id: 'mock-user', operator_name: '薪超体验官', action: 'shipOrder', target: 'order', target_id: 'order-demo-shipped', remark: '录入顺丰物流', create_date: Date.now() - 3 * 86400000 },
  { _id: 'oplog-demo-aftersale', operator_id: 'mock-user', operator_name: '薪超体验官', action: 'completeAfterSale', target: 'after_sale', target_id: 'aftersale-demo-completed', remark: '完成部分退款', create_date: Date.now() - 2 * 86400000 }
]

export const defaultUser = {
  _id: 'mock-user',
  mobile: '13800138000',
  nickname: '薪超会员',
  avatar: '/static/default-avatar.png',
  role: ['admin', 'operator'],
  roles: ['admin', 'operator']
}

export const defaultAddress = {
  _id: 'addr-default',
  user_id: 'mock-user',
  name: '曾先生',
  phone: '13800138000',
  province: '广东省',
  city: '深圳市',
  district: '南山区',
  detail: '科技园精品公寓 8 栋 1201',
  is_default: true
}

export const seedStorage = () => {
  if (!uni.getStorageSync(STORAGE_KEYS.goods)) {
    uni.setStorageSync(STORAGE_KEYS.goods, goods)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.goodsSkus)) {
    uni.setStorageSync(STORAGE_KEYS.goodsSkus, skus)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.addresses)) {
    uni.setStorageSync(STORAGE_KEYS.addresses, [defaultAddress])
  }
  if (!uni.getStorageSync(STORAGE_KEYS.coupons)) {
    uni.setStorageSync(STORAGE_KEYS.coupons, coupons)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.userCoupons)) {
    uni.setStorageSync(STORAGE_KEYS.userCoupons, defaultUserCoupons)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.messages)) {
    uni.setStorageSync(STORAGE_KEYS.messages, messages)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.orders)) {
    uni.setStorageSync(STORAGE_KEYS.orders, demoOrders)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.cart)) {
    uni.setStorageSync(STORAGE_KEYS.cart, [])
  }
  if (!uni.getStorageSync(STORAGE_KEYS.collects)) {
    uni.setStorageSync(STORAGE_KEYS.collects, ['goods-cup'])
  }
  if (!uni.getStorageSync(STORAGE_KEYS.afterSales)) {
    uni.setStorageSync(STORAGE_KEYS.afterSales, demoAfterSales)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.evaluations)) {
    uni.setStorageSync(STORAGE_KEYS.evaluations, evaluations)
  }
  if (!uni.getStorageSync(STORAGE_KEYS.operationLogs)) {
    uni.setStorageSync(STORAGE_KEYS.operationLogs, operationLogs)
  }
}

export const createDemoOrder = (goodsList, address, coupon) => {
  const total = goodsList.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const freight = total >= 99 ? 0 : 10
  const discount = coupon && total >= coupon.threshold ? coupon.amount : 0
  const payAmount = Math.max(total + freight - discount, 0)
  return {
    _id: `order-${Date.now()}`,
    order_no: `XC${Date.now()}`,
    status: ORDER_STATUS.pendingPay,
    address,
    goods_list: goodsList,
    total_amount: total,
    freight,
    discount_amount: discount,
    pay_amount: payAmount,
    coupon_id: coupon?._id || '',
    user_coupon_id: coupon?.user_coupon_id || coupon?.userCouponId || '',
    remark: '',
    pay_method: '',
    create_date: Date.now(),
    pay_expire_time: Date.now() + 30 * 60 * 1000
  }
}
