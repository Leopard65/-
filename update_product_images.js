// 批量将生成的图片链接更新到商品数据库
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/supermarket.db');
const db = new Database(dbPath);

// 图片映射 - 根据商品ID和对应的图片路径
const productImages = {
    1: '/uploads/products/2026-06-30/kelecola.jpg',   // 可口可乐
    2: '/uploads/products/2026-06-30/nongfushanquan.jpg', // 农夫山泉
    3: '/uploads/products/2026-06-30/yili.jpg',         // 伊利纯牛奶
    4: '/uploads/products/2026-06-30/shufujia.jpg',     // 舒肤佳香皂
    5: '/uploads/products/2026-06-30/vida.jpg',         // 维达纸巾
    6: '/uploads/products/2026-06-30/hongfushi.jpg',    // 红富士苹果
    7: '/uploads/products/2026-06-30/jinlongyu.jpg',    // 金龙鱼调和油
    8: '/uploads/products/2026-06-30/laoganma.jpg',    // 老干妈辣酱
    9: '/uploads/products/2026-06-30/leshisupian.jpg', // 乐事薯片
    10: '/uploads/products/2026-06-30/devor.jpg'       // 德芙巧克力
};

// 更新商品图片
const update = db.prepare('UPDATE products SET image = ? WHERE id = ?');
let count = 0;
for (const [productId, imagePath] of Object.entries(productImages)) {
    const result = update.run(imagePath, parseInt(productId));
    if (result.changes > 0) {
        console.log(`✅ 更新商品 ${productId} 的图片为: ${imagePath}`);
        count++;
    } else {
        console.log(`⚠️ 商品 ${productId} 未找到，跳过`);
    }
}
console.log(`\n共更新 ${count} 个商品图片！`);
db.close();
