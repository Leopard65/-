const fs = require('fs');
const path = require('path');

console.log('=== 详细图片生成检查 ===');
console.log(`当前时间: ${new Date().toLocaleString()}`);

// 检查各个可能的保存位置
const possiblePaths = [
    {
        name: '项目uploads目录',
        path: path.join(__dirname, 'uploads')
    },
    {
        name: '桌面默认目录',
        path: path.join('C:\\Users\\曾令雄\\Desktop\\Seedream-Images\\claudecode')
    },
    {
        name: '当前日期目录',
        path: path.join(__dirname, 'uploads', new Date().toISOString().split('T')[0])
    },
    {
        name: '桌面今日目录',
        path: path.join('C:\\Users\\曾令雄\\Desktop\\Seedream-Images\\claudecode', new Date().toISOString().split('T')[0])
    }
];

possiblePaths.forEach(({ name, path: dirPath }) => {
    console.log(`\n检查: ${name}`);
    console.log(`路径: ${dirPath}`);

    if (!fs.existsSync(dirPath)) {
        console.log('❌ 目录不存在');
        return;
    }

    console.log('✅ 目录存在');

    // 检查子目录和文件
    try {
        const items = fs.readdirSync(dirPath);
        console.log(`📁 包含 ${items.length} 个项目:`);

        let imageCount = 0;
        items.forEach(item => {
            const itemPath = path.join(dirPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
                console.log(`  📁 ${item}/`);

                // 递归检查子目录中的图片
                try {
                    const subItems = fs.readdirSync(itemPath);
                    const images = subItems.filter(f =>
                        f.match(/\.(jpg|jpeg|png|webp)$/i)
                    );
                    if (images.length > 0) {
                        console.log(`    🖼️ ${images.length} 张图片: ${images.slice(0, 3).join(', ')}${images.length > 3 ? '...' : ''}`);
                        imageCount += images.length;
                    }
                } catch (e) {
                    // 忽略权限错误
                }
            } else if (item.match(/\.(jpg|jpeg|png|webp)$/i)) {
                console.log(`  🖼️ ${item}`);
                imageCount++;
            }
        });

        if (imageCount > 0) {
            console.log(`✅ 共找到 ${imageCount} 张图片`);
        }
    } catch (e) {
        console.log('❌ 无法读取目录（可能没有权限）');
    }
});

console.log('\n=== 检查完成 ===');