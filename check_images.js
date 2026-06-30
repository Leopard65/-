const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');
const today = new Date().toISOString().split('T')[0];
const datedDir = path.join(uploadsDir, today);

console.log('检查图片生成状态...');
console.log(`上传目录: ${uploadsDir}`);
console.log(`今日目录: ${datedDir}`);

if (!fs.existsSync(uploadsDir)) {
    console.log('上传目录不存在');
    process.exit(1);
}

if (!fs.existsSync(datedDir)) {
    console.log('今日目录不存在，图片可能尚未生成');
    process.exit(1);
}

const files = fs.readdirSync(datedDir);
console.log(`\n在 ${datedDir} 中找到 ${files.length} 个文件:`);

files.forEach(file => {
    console.log(`- ${file}`);
});

console.log('\n提示：');
console.log('1. 图片生成完成后，需要手动将图片复制到 uploads 目录');
console.log('2. 然后需要更新数据库中的商品图片URL');
console.log('3. 图片路径格式: /uploads/2026-06-29/文件名');