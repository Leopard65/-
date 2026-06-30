// 批量将生成的图片链接更新到商品数据库
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/supermarket.db');
const db = new Database(dbPath);

// 图片映射 - 使用 Vite public/ 目录下的路径（部署时自动包含在前端包中）
const productImages = {
    1: '/products/kelecola.jpg',      // 可口可乐
    2: '/products/nongfushanquan.jpg', // 农夫山泉
    3: '/products/yili.jpg',           // 伊利纯牛奶
    4: '/products/shufujia.jpg',       // 舒肤佳香皂
    5: '/products/vida.jpg',           // 维达纸巾
    6: '/products/hongfushi.jpg',      // 红富士苹果
    7: '/products/jinlongyu.jpg',      // 金龙鱼调和油
    8: '/products/laoganma.jpg',       // 老干妈辣酱
    9: '/products/leshisupian.jpg',    // 乐事薯片
    10: '/products/devor.jpg'          // 德芙巧克力
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
