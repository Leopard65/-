/**
 * 数据库初始化脚本
 * 运行: npm run init-db
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function initDatabase() {
  console.log('🔧 开始初始化数据库...\n');

  // 先创建数据库连接（不指定数据库），显式使用 utf8mb4 避免中文乱码
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    // 读取 SQL 文件
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../../database/init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf-8');

    // 兼容旧版脚本：若仍存在占位符则替换为真实 bcrypt hash。
    // 使用函数式替换，避免 hash 中的 $ 被当作替换模式处理。
    if (sql.includes('$2b$10$YourHashedPasswordHere')) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      sql = sql.replace(/\$2b\$10\$YourHashedPasswordHere/g, () => adminPassword);
    }

    // 执行 SQL（脚本可重复执行）
    await conn.query(sql);
    console.log('✅ 数据库表创建/校验成功');

    // 验证
    await conn.query(`USE ${config.db.database}`);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`\n📊 共创建 ${tables.length} 张表：`);
    tables.forEach(t => {
      const name = Object.values(t)[0];
      console.log(`   - ${name}`);
    });

    console.log('\n🎉 数据库初始化完成！');
    console.log('   管理员账号: admin / admin123');
  } catch (err) {
    console.error('❌ 初始化失败:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

initDatabase();
