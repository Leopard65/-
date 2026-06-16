/**
 * 演示数据播种脚本（可选）
 *
 * 用途：在已初始化（npm run init-db）的数据库上，灌入一批演示数据，
 *      让首页、列表、文章、轮播、仪表盘图表/回访提醒等都有内容可展示。
 * 用法：在 server 目录执行  npm run seed
 * 幂等：仅当 animals 表为空时才播种，避免重复或覆盖真实数据。
 * 图片：引用前端 client/public/seed/ 下的 SVG 占位图（同源 /seed/*.svg）。
 */
require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function main() {
  const [[{ c }]] = await db.execute('SELECT COUNT(*) AS c FROM animals');
  if (c > 0) {
    console.log('⚠️  animals 表已有数据，跳过演示数据播种（避免重复/覆盖）。');
    console.log('    如需重新播种，请先清空业务表后再执行 npm run seed。');
    process.exit(0);
  }

  console.log('开始播种演示数据...');

  // 管理员 id
  const [[admin]] = await db.execute("SELECT id FROM users WHERE username='admin' LIMIT 1");
  const adminId = admin ? admin.id : null;

  // 演示普通用户 demo / demo123
  const hash = bcrypt.hashSync('demo123', 10);
  await db.execute(
    `INSERT INTO users (username,password,nickname,email,phone,role,status)
     VALUES ('demo',?, '演示用户','demo@example.com','13800000000','user',1)
     ON DUPLICATE KEY UPDATE password=VALUES(password)`,
    [hash]
  );
  const [[demo]] = await db.execute("SELECT id FROM users WHERE username='demo' LIMIT 1");
  const demoId = demo.id;

  // 品种映射
  const [breeds] = await db.execute('SELECT id,name FROM animal_breeds');
  const bid = (n) => (breeds.find((b) => b.name === n)?.id ?? null);

  // ===== 动物 =====
  const animals = [
    ['小橘', 1, '橘猫', 'male', '约1岁', 4.2, '橘白', '健康，已驱虫', 1, 1, '亲人粘人，爱撒娇', '在小区门口被发现，亲人会蹭腿，适合有耐心的家庭。', '/seed/animal-cat-orange.svg', 'available', '阳光小区南门'],
    ['雪球', 1, '英短', 'female', '约2岁', 3.8, '蓝白', '健康', 1, 1, '安静乖巧', '性格温顺，喜欢趴在窗边晒太阳，适合上班族。', '/seed/animal-cat-british.svg', 'available', '中心公园'],
    ['大黄', 2, '金毛', 'male', '约3岁', 28.0, '金黄', '健康，已绝育', 1, 1, '温顺友善', '非常聪明，会握手坐下，对小孩友好。', '/seed/animal-dog-golden.svg', 'adopted', '城西工业园'],
    ['短腿', 2, '柯基', 'female', '约1岁', 9.5, '三色', '健康', 1, 0, '元气满满', '活泼好动，喜欢追球，需要每天遛弯。', '/seed/animal-dog-corgi.svg', 'adopted', '河滨路'],
    ['棉花', 3, '垂耳兔', 'female', '约8个月', 1.8, '白色', '健康', 0, 0, '软萌安静', '安静爱吃草，适合公寓饲养。', '/seed/animal-rabbit.svg', 'fostered', '大学城'],
    ['团子', 4, '银狐仓鼠', 'male', '约5个月', 0.1, '银白', '健康', 0, 0, '小巧呆萌', '巴掌大的小家伙，夜间活跃。', '/seed/animal-hamster.svg', 'rescued', '步行街'],
    ['花花', 1, '中华田园猫', 'female', '约1岁', 3.5, '狸花', '健康，待绝育', 1, 0, '机灵活泼', '会自己用猫砂，亲人，适合新手。', '/seed/animal-cat-grey.svg', 'available', '老城区菜场'],
    ['旺财', 2, '中华田园犬', 'male', '约2岁', 15.0, '黄色', '健康，已绝育', 1, 1, '忠诚护家', '看家一流，认主，适合有院子的家庭。', '/seed/animal-dog-golden.svg', 'adopted', '城南村'],
  ];
  const animalId = {};
  for (const a of animals) {
    const [r] = await db.execute(
      `INSERT INTO animals (name,category_id,breed_id,gender,age,weight,color,health_status,is_vaccinated,is_sterilized,personality,description,image_url,status,rescue_date,location,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, DATE_SUB(CURDATE(), INTERVAL 60 DAY), ?, ?)`,
      [a[0], a[1], bid(a[2]), a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], adminId]
    );
    animalId[a[0]] = r.insertId;
  }

  // ===== 文章 =====
  const articles = [
    ['新手养猫完全指南', '<p>第一次养猫需要准备猫砂盆、猫粮、饮水机和磨爪板……</p><p>定期驱虫与疫苗必不可少，建议每年体检一次。</p>', '/seed/article-care.svg', 'knowledge', 128],
    ['领养须知与流程说明', '<p>领养需年满 18 周岁，有稳定住所与收入。</p><p>提交申请→工作人员审核→线下见面→签署领养协议→定期回访。</p>', '/seed/article-adopt.svg', 'guide', 96],
    ['大黄的领养故事', '<p>大黄曾是城西工业园的流浪犬，经过救助、治疗与三个月的等待，终于被一个有爱的家庭领养。</p>', '/seed/article-story.svg', 'story', 215],
    ['如何科学地给狗狗社会化', '<p>幼犬社会化的黄金期是 3-14 周龄，多接触不同的人和环境有助于性格养成。</p>', '/seed/article-care.svg', 'knowledge', 73],
  ];
  for (const [title, content, cover, cat, vc] of articles) {
    await db.execute(
      'INSERT INTO articles (title,content,cover_image,category,status,view_count,created_by) VALUES (?,?,?,?,1,?,?)',
      [title, content, cover, cat, vc, adminId]
    );
  }

  // ===== 轮播图 =====
  const banners = [
    ['给它一个温暖的家', '/seed/banner-1.svg', 1],
    ['让每个生命都被温柔以待', '/seed/banner-2.svg', 2],
    ['爱心救助 在行动', '/seed/banner-3.svg', 3],
  ];
  for (const [title, img, sort] of banners) {
    await db.execute('INSERT INTO banners (title,image_url,link_url,sort_order,status) VALUES (?,?,"",?,1)', [title, img, sort]);
  }

  // ===== 公告 =====
  await db.execute(
    `INSERT INTO announcements (title,content,is_top,status,created_by) VALUES
     ('周末领养日活动','本周六上午 9:00-12:00 在中心公园举办领养日活动，欢迎来现场与毛孩子见面！',0,1,?),
     ('疫苗接种与绝育补贴','即日起领养本中心动物，可享受首针疫苗与绝育费用补贴。',0,1,?)`,
    [adminId, adminId]
  );

  // ===== 救助求助 =====
  const rescues = [
    [demoId, '王女士', '13900001111', '滨江路桥洞下', '有一只受伤的橘猫，后腿可能骨折，无法行走。', '猫', 'high', 'pending'],
    [null, '李先生', '13900002222', '科技园B区停车场', '一窝小奶猫被遗弃，约4只，需要奶粉。', '猫', 'critical', 'processing'],
    [demoId, '张同学', '13900003333', '大学城宿舍区', '流浪狗在垃圾桶附近徘徊，比较温顺。', '狗', 'medium', 'resolved'],
  ];
  for (const r of rescues) {
    await db.execute(
      `INSERT INTO rescue_requests (user_id,reporter_name,phone,location,description,animal_type,urgency,status,resolved_at,created_at)
       VALUES (?,?,?,?,?,?,?,?, ${'resolved' === r[7] ? 'NOW()' : 'NULL'}, DATE_SUB(NOW(), INTERVAL 7 DAY))`,
      r
    );
  }

  // ===== 领养申请 + 回访 =====
  // A: 已通过(近期) + 有回访(含照片) -> 不进提醒
  const [adA] = await db.execute(
    `INSERT INTO adoption_applications (user_id,animal_id,applicant_name,phone,address,housing_type,has_pet_exp,pet_experience,reason,status,reviewed_by,reviewed_at,created_at)
     VALUES (?,?,?,?,?,?,1,'养过一只猫','一直想养金毛，家有大阳台。','approved',?, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY))`,
    [demoId, animalId['大黄'], '演示用户', '13800000000', '幸福路18号', '自有', adminId]
  );
  await db.execute(
    `INSERT INTO adoption_followups (application_id,visit_date,content,animal_condition,photos,operator_id)
     VALUES (?, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '上门回访，大黄适应良好，已熟悉新环境。', '健康活泼，体重正常', ?, ?)`,
    [adA.insertId, JSON.stringify(['/seed/animal-dog-golden.svg']), adminId]
  );

  // B: 已通过满 40 天 + 无回访 -> 触发回访提醒
  await db.execute(
    `INSERT INTO adoption_applications (user_id,animal_id,applicant_name,phone,address,housing_type,has_pet_exp,reason,status,reviewed_by,reviewed_at,created_at)
     VALUES (?,?,?,?,?,?,0,'喜欢柯基，家有院子。','approved',?, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 42 DAY))`,
    [demoId, animalId['短腿'], '演示用户', '13800000000', '柯基路9号', '自有', adminId]
  );

  // C: 已通过(旺财) -> 计入趋势
  await db.execute(
    `INSERT INTO adoption_applications (user_id,animal_id,applicant_name,phone,address,housing_type,has_pet_exp,reason,status,reviewed_by,reviewed_at,created_at)
     VALUES (?,?,?,?,?,?,1,'想养中华田园犬看家。','approved',?, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY))`,
    [demoId, animalId['旺财'], '演示用户', '13800000000', '城南路1号', '自有', adminId]
  );

  // D/E: 待审核（计入趋势，本月）
  await db.execute(
    `INSERT INTO adoption_applications (user_id,animal_id,applicant_name,phone,address,housing_type,has_pet_exp,reason,status,created_at)
     VALUES (?,?,?,?,?,?,0,'想领养小橘陪伴老人。','pending', DATE_SUB(NOW(), INTERVAL 3 DAY)),
            (?,?,?,?,?,?,1,'家有小孩，想养只乖巧的猫。','pending', DATE_SUB(NOW(), INTERVAL 1 DAY))`,
    [demoId, animalId['小橘'], '演示用户', '13800000000', '朝阳路5号', '租房',
     demoId, animalId['雪球'], '演示用户', '13800000000', '安居小区', '自有']
  );

  console.log('🎉 演示数据播种完成！');
  console.log('   动物 8 · 文章 4 · 轮播 3 · 公告 +2 · 救助 3 · 领养 5（含回访/提醒/趋势）');
  console.log('   演示用户：demo / demo123');
  process.exit(0);
}

main().catch((e) => { console.error('❌ 播种失败：', e.message); process.exit(1); });
