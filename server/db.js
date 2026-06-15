const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

// DB_PATH 为相对路径时相对于 server/ 目录解析（默认仍为 server/supermarket.db）
const dbPath = path.isAbsolute(config.DB_PATH)
  ? config.DB_PATH
  : path.resolve(__dirname, config.DB_PATH);

const db = new Database(dbPath);

// 启用 WAL 模式提高性能
db.pragma('journal_mode = WAL');

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    category_id INTEGER,
    price REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    unit TEXT DEFAULT '个',
    image TEXT,
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    level TEXT DEFAULT '普通会员',
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    address TEXT,
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    total REAL DEFAULT 0,
    payment TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'cashier',
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    reason TEXT,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    operator TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  );

  CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (return_id) REFERENCES returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS member_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    min_spent REAL NOT NULL,
    discount REAL DEFAULT 1.0,
    points_rate REAL DEFAULT 1.0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// 创建触发器自动更新 updated_at
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
  AFTER UPDATE ON categories
  BEGIN
    UPDATE categories SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_products_timestamp
  AFTER UPDATE ON products
  BEGIN
    UPDATE products SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_members_timestamp
  AFTER UPDATE ON members
  BEGIN
    UPDATE members SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_suppliers_timestamp
  AFTER UPDATE ON suppliers
  BEGIN
    UPDATE suppliers SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_purchases_timestamp
  AFTER UPDATE ON purchases
  BEGIN
    UPDATE purchases SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_sales_timestamp
  AFTER UPDATE ON sales
  BEGIN
    UPDATE sales SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_users_timestamp
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_returns_timestamp
  AFTER UPDATE ON returns
  BEGIN
    UPDATE returns SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;
`);

// 轻量迁移：为旧库补充缺失字段（首次升级时执行，幂等）
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some(c => c.name === 'status')) {
  db.exec("ALTER TABLE users ADD COLUMN status INTEGER DEFAULT 1");
  console.log('已为 users 表新增 status 字段');
}

// 插入示例数据（仅在表为空时）
const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (count === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const cats = ['食品饮料', '日用百货', '生鲜水果', '粮油调味', '零食糖果'];
  const catIds = cats.map(name => insertCategory.run(name).lastInsertRowid);

  const insertProduct = db.prepare(
    'INSERT INTO products (name, barcode, category_id, price, cost, stock, min_stock, unit) VALUES (?,?,?,?,?,?,?,?)'
  );
  const products = [
    ['可口可乐 330ml', '6901234567890', catIds[0], 3.5, 2.0, 100, 20, '瓶'],
    ['农夫山泉 550ml', '6901234567891', catIds[0], 2.0, 1.0, 200, 30, '瓶'],
    ['伊利纯牛奶', '6901234567892', catIds[0], 5.8, 3.5, 80, 15, '盒'],
    ['舒肤佳香皂', '6901234567893', catIds[1], 8.9, 5.0, 50, 10, '块'],
    ['维达纸巾', '6901234567894', catIds[1], 12.9, 7.0, 60, 10, '提'],
    ['红富士苹果', '6901234567895', catIds[2], 6.8, 3.0, 150, 20, '斤'],
    ['金龙鱼调和油', '6901234567896', catIds[3], 59.9, 40.0, 30, 5, '桶'],
    ['老干妈辣酱', '6901234567897', catIds[3], 9.9, 6.0, 80, 15, '瓶'],
    ['乐事薯片', '6901234567898', catIds[4], 7.9, 4.0, 120, 20, '袋'],
    ['德芙巧克力', '6901234567899', catIds[4], 15.9, 9.0, 60, 10, '盒'],
  ];
  products.forEach(p => insertProduct.run(...p));

  const insertSupplier = db.prepare(
    'INSERT INTO suppliers (name, contact, phone, address) VALUES (?,?,?,?)'
  );
  insertSupplier.run('华润万家批发部', '张经理', '13800001111', '北京市朝阳区');
  insertSupplier.run('百事可乐经销商', '李经理', '13800002222', '北京市海淀区');

  const insertMember = db.prepare(
    'INSERT INTO members (name, phone, points, total_spent) VALUES (?,?,?,?)'
  );
  insertMember.run('王小明', '13900001111', 200, 1580.5);
  insertMember.run('李芳', '13900002222', 50, 320.0);

  console.log('示例数据已插入');
}

// 插入默认会员等级（如果不存在）
const levelCount = db.prepare('SELECT COUNT(*) as c FROM member_levels').get().c;
if (levelCount === 0) {
  const insertLevel = db.prepare('INSERT INTO member_levels (name, min_spent, discount, points_rate) VALUES (?, ?, ?, ?)');
  insertLevel.run('普通会员', 0, 1.0, 1);
  insertLevel.run('银卡会员', 1000, 0.98, 1.5);
  insertLevel.run('金卡会员', 5000, 0.95, 2);
  insertLevel.run('钻石会员', 20000, 0.90, 3);
  console.log('默认会员等级已创建');
}

// 创建默认管理员账号（如果不存在）
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  console.log('默认管理员账号已创建: admin/admin123');
}

module.exports = db;
