-- =============================================
-- 流浪动物救助与领养管理系统 - 数据库初始化脚本
-- =============================================
-- 可重复执行：建表用 IF NOT EXISTS，初始数据用 INSERT IGNORE / ON DUPLICATE KEY，
-- 重复执行不会报错也不会产生重复数据。
-- 字符集：脚本与数据均为 UTF-8，导入前请确保客户端字符集为 utf8mb4，
--   命令行导入示例： mysql -u root -p --default-character-set=utf8mb4 < database/init.sql
-- 默认管理员：admin / admin123（password 字段为 admin123 的 bcrypt 哈希）
-- =============================================

-- 确保本次会话以 utf8mb4 解析后续中文字符串，避免导入乱码
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS stray_animal_rescue
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stray_animal_rescue;

-- -------------------------------------------
-- 1. 用户表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名',
  password      VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  nickname      VARCHAR(50)  DEFAULT '' COMMENT '昵称',
  email         VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  phone         VARCHAR(20)  DEFAULT '' COMMENT '手机号',
  avatar        VARCHAR(255) DEFAULT '' COMMENT '头像URL',
  role          ENUM('user','admin') DEFAULT 'user' COMMENT '角色',
  status        TINYINT      DEFAULT 1 COMMENT '状态 0=禁用 1=正常',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- -------------------------------------------
-- 2. 动物分类表（猫、狗、兔等）
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS animal_categories (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL UNIQUE COMMENT '分类名称',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动物分类表';

-- -------------------------------------------
-- 3. 动物品种表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS animal_breeds (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id   INT UNSIGNED NOT NULL COMMENT '所属分类ID',
  name          VARCHAR(50)  NOT NULL COMMENT '品种名称',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_breed_category_name (category_id, name),
  FOREIGN KEY (category_id) REFERENCES animal_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动物品种表';

-- -------------------------------------------
-- 4. 动物信息表（核心表）
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS animals (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50)  DEFAULT '未命名' COMMENT '动物名称/昵称',
  category_id   INT UNSIGNED NOT NULL COMMENT '分类ID',
  breed_id      INT UNSIGNED DEFAULT NULL COMMENT '品种ID',
  gender        ENUM('unknown','male','female') DEFAULT 'unknown' COMMENT '性别',
  age           VARCHAR(20)  DEFAULT '未知' COMMENT '年龄描述',
  weight        DECIMAL(5,2) DEFAULT NULL COMMENT '体重(kg)',
  color         VARCHAR(30)  DEFAULT '' COMMENT '毛色',
  health_status VARCHAR(200) DEFAULT '' COMMENT '健康状况',
  is_vaccinated TINYINT      DEFAULT 0 COMMENT '是否已接种疫苗',
  is_sterilized TINYINT      DEFAULT 0 COMMENT '是否已绝育',
  personality   VARCHAR(200) DEFAULT '' COMMENT '性格描述',
  description   TEXT         COMMENT '详细描述',
  image_url     VARCHAR(500) DEFAULT '' COMMENT '封面图片',
  images        TEXT         COMMENT '图片列表JSON',
  status        ENUM('rescued','available','adopted','fostered') DEFAULT 'rescued'
                COMMENT '状态: rescued=已救助待领养, available=可领养, adopted=已领养, fostered=被寄养',
  rescue_date   DATE         DEFAULT NULL COMMENT '救助日期',
  location      VARCHAR(200) DEFAULT '' COMMENT '救助地点',
  created_by    INT UNSIGNED DEFAULT NULL COMMENT '录入人',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES animal_categories(id),
  FOREIGN KEY (breed_id) REFERENCES animal_breeds(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动物信息表';

-- -------------------------------------------
-- 5. 领养申请表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS adoption_applications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL COMMENT '申请人ID',
  animal_id     INT UNSIGNED NOT NULL COMMENT '动物ID',
  applicant_name VARCHAR(50) NOT NULL COMMENT '申请人姓名',
  phone         VARCHAR(20)  NOT NULL COMMENT '联系电话',
  id_card       VARCHAR(20)  DEFAULT '' COMMENT '身份证号',
  address       VARCHAR(200) DEFAULT '' COMMENT '居住地址',
  housing_type  VARCHAR(50)  DEFAULT '' COMMENT '住房类型(自有/租房)',
  has_pet_exp   TINYINT      DEFAULT 0 COMMENT '是否有养宠经验',
  pet_experience TEXT         COMMENT '养宠经历描述',
  reason        TEXT         NOT NULL COMMENT '领养理由',
  status        ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending'
                COMMENT '状态',
  reject_reason VARCHAR(500) DEFAULT '' COMMENT '拒绝原因',
  reviewed_by   INT UNSIGNED DEFAULT NULL COMMENT '审核人',
  reviewed_at   DATETIME     DEFAULT NULL COMMENT '审核时间',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='领养申请表';

-- -------------------------------------------
-- 6. 领养回访表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS adoption_followups (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL COMMENT '领养申请ID',
  visit_date    DATE         NOT NULL COMMENT '回访日期',
  content       TEXT         NOT NULL COMMENT '回访内容',
  animal_condition VARCHAR(200) DEFAULT '' COMMENT '动物状况',
  photos        TEXT         COMMENT '回访照片JSON',
  operator_id   INT UNSIGNED DEFAULT NULL COMMENT '操作人',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES adoption_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='领养回访表';

-- -------------------------------------------
-- 7. 救助求助表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS rescue_requests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED DEFAULT NULL COMMENT '提交人ID',
  reporter_name VARCHAR(50)  NOT NULL COMMENT '报告人姓名',
  phone         VARCHAR(20)  NOT NULL COMMENT '联系电话',
  location      VARCHAR(200) NOT NULL COMMENT '发现地点',
  description   TEXT         NOT NULL COMMENT '情况描述',
  image_url     VARCHAR(500) DEFAULT '' COMMENT '现场照片',
  animal_type   VARCHAR(50)  DEFAULT '' COMMENT '动物类型',
  urgency       ENUM('low','medium','high','critical') DEFAULT 'medium' COMMENT '紧急程度',
  status        ENUM('pending','processing','resolved','closed') DEFAULT 'pending'
                COMMENT '状态',
  assigned_to   INT UNSIGNED DEFAULT NULL COMMENT '分配给',
  resolved_at   DATETIME     DEFAULT NULL COMMENT '解决时间',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='救助求助表';

-- -------------------------------------------
-- 8. 公告表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL COMMENT '标题',
  content       TEXT         NOT NULL COMMENT '内容',
  is_top        TINYINT      DEFAULT 0 COMMENT '是否置顶',
  status        TINYINT      DEFAULT 1 COMMENT '状态 0=草稿 1=发布',
  created_by    INT UNSIGNED DEFAULT NULL COMMENT '发布人',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';

-- -------------------------------------------
-- 9. 文章表（科普/领养须知）
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL COMMENT '标题',
  content       LONGTEXT     NOT NULL COMMENT '正文内容',
  cover_image   VARCHAR(500) DEFAULT '' COMMENT '封面图',
  category      ENUM('guide','knowledge','story') DEFAULT 'knowledge'
                COMMENT '分类: guide=领养须知, knowledge=科普, story=领养故事',
  status        TINYINT      DEFAULT 1 COMMENT '状态 0=草稿 1=发布',
  view_count    INT UNSIGNED DEFAULT 0 COMMENT '浏览量',
  created_by    INT UNSIGNED DEFAULT NULL COMMENT '作者',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- -------------------------------------------
-- 10. 轮播图表
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(100) DEFAULT '' COMMENT '标题',
  image_url     VARCHAR(500) NOT NULL COMMENT '图片URL',
  link_url      VARCHAR(500) DEFAULT '' COMMENT '跳转链接',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  status        TINYINT      DEFAULT 1 COMMENT '状态 0=隐藏 1=显示',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播图表';

-- -------------------------------------------
-- 初始数据
-- -------------------------------------------

-- 默认管理员账号（用户名 admin，密码 admin123，下方为其 bcrypt 哈希）
-- 使用 ON DUPLICATE KEY UPDATE：重复执行会把管理员密码重置为 admin123，便于找回。
INSERT INTO users (username, password, nickname, role, status) VALUES
('admin', '$2a$10$NHDgLhS1B7Rrtp.8Ktx0NebjOuAybruvqOqAcqIY4MLbxM15jDLTy', '系统管理员', 'admin', 1)
ON DUPLICATE KEY UPDATE
  password = VALUES(password), role = 'admin', status = 1;

-- 动物分类
INSERT IGNORE INTO animal_categories (name, sort_order) VALUES
('猫', 1), ('狗', 2), ('兔', 3), ('仓鼠', 4), ('其他', 5);

-- 常见品种
INSERT IGNORE INTO animal_breeds (category_id, name) VALUES
(1, '中华田园猫'), (1, '英短'), (1, '美短'), (1, '布偶猫'), (1, '橘猫'),
(2, '中华田园犬'), (2, '金毛'), (2, '拉布拉多'), (2, '柯基'), (2, '哈士奇'),
(3, '垂耳兔'), (3, '侏儒兔'), (3, '安哥拉兔'),
(4, '银狐仓鼠'), (4, '三线仓鼠');

-- 示例公告（仅当公告表为空时插入，避免重复执行产生重复数据）
INSERT INTO announcements (title, content, is_top, status, created_by)
SELECT '欢迎来到流浪动物救助中心',
       '我们致力于为流浪动物提供庇护和关爱，帮助它们找到温暖的家。', 1, 1,
       (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM announcements);
