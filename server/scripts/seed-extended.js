/**
 * Additive demo-data extension.
 *
 * This script is intentionally idempotent: it updates the named demo records
 * and inserts only records that are not already present. It is safe to run
 * after the original seed script on a fresh or existing database.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const image = (name) => `/seed/${name}`;

async function findUser(username) {
  const [[row]] = await db.execute('SELECT id FROM users WHERE username=? LIMIT 1', [username]);
  return row?.id || null;
}

async function ensureUser({ username, nickname, email, phone, role = 'user' }) {
  const password = bcrypt.hashSync('demo123', 10);
  const existingId = await findUser(username);
  if (existingId) {
    await db.execute(
      'UPDATE users SET nickname=?,email=?,phone=?,role=?,status=1 WHERE id=?',
      [nickname, email, phone, role, existingId]
    );
    return existingId;
  }
  const [result] = await db.execute(
    'INSERT INTO users (username,password,nickname,email,phone,role,status) VALUES (?,?,?,?,?,?,1)',
    [username, password, nickname, email, phone, role]
  );
  return result.insertId;
}

async function breedId(name) {
  const [[row]] = await db.execute('SELECT id FROM animal_breeds WHERE name=? LIMIT 1', [name]);
  return row?.id || null;
}

async function upsertAnimal(record, adminId) {
  const bid = await breedId(record.breed);
  const [[existing]] = await db.execute('SELECT id FROM animals WHERE name=? LIMIT 1', [record.name]);
  const values = [
    record.categoryId,
    bid,
    record.gender,
    record.age,
    record.weight,
    record.color,
    record.health,
    record.vaccinated,
    record.sterilized,
    record.personality,
    record.description,
    record.image,
    JSON.stringify(record.images || [record.image]),
    record.status,
    record.location,
    adminId,
  ];

  if (existing) {
    await db.execute(
      `UPDATE animals SET category_id=?,breed_id=?,gender=?,age=?,weight=?,color=?,health_status=?,
       is_vaccinated=?,is_sterilized=?,personality=?,description=?,image_url=?,images=?,status=?,location=?,created_by=?
       WHERE id=?`,
      [...values, existing.id]
    );
    return existing.id;
  }

  const [result] = await db.execute(
    `INSERT INTO animals
      (name,category_id,breed_id,gender,age,weight,color,health_status,is_vaccinated,is_sterilized,
       personality,description,image_url,images,status,rescue_date,location,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,DATE_SUB(CURDATE(), INTERVAL ? DAY),?,?)`,
    [
      record.name,
      ...values.slice(0, 14),
      record.daysAgo || 45,
      ...values.slice(14),
    ]
  );
  return result.insertId;
}

async function upsertEvent({ animalId, type, title, daysAgo, description }, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM animal_events WHERE animal_id=? AND title=? LIMIT 1',
    [animalId, title]
  );
  if (existing) return existing.id;
  const [result] = await db.execute(
    `INSERT INTO animal_events (animal_id,event_type,event_date,title,description,created_by)
     VALUES (?,?,DATE_SUB(CURDATE(), INTERVAL ? DAY),?,?,?)`,
    [animalId, type, daysAgo, title, description, adminId]
  );
  return result.insertId;
}

async function upsertArticle({ title, content, cover, category, views }, adminId) {
  const [[existing]] = await db.execute('SELECT id FROM articles WHERE title=? LIMIT 1', [title]);
  if (existing) {
    await db.execute(
      'UPDATE articles SET content=?,cover_image=?,category=?,status=1,view_count=?,created_by=? WHERE id=?',
      [content, cover, category, views, adminId, existing.id]
    );
    return existing.id;
  }
  const [result] = await db.execute(
    'INSERT INTO articles (title,content,cover_image,category,status,view_count,created_by) VALUES (?,?,?,?,1,?,?)',
    [title, content, cover, category, views, adminId]
  );
  return result.insertId;
}

async function upsertRescue(record, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM rescue_requests WHERE reporter_name=? AND phone=? AND location=? LIMIT 1',
    [record.reporter, record.phone, record.location]
  );
  const values = [
    record.userId,
    record.reporter,
    record.phone,
    record.location,
    record.description,
    record.imageUrl,
    record.animalType,
    record.urgency,
    record.status,
    adminId,
    record.status === 'resolved' ? new Date() : null,
  ];
  if (existing) {
    await db.execute(
      `UPDATE rescue_requests SET user_id=?,description=?,image_url=?,animal_type=?,urgency=?,status=?,
       assigned_to=?,resolved_at=COALESCE(?,resolved_at) WHERE id=?`,
      [values[0], values[4], values[5], values[6], values[7], values[8], values[9], values[10], existing.id]
    );
    return existing.id;
  }
  const [result] = await db.execute(
    `INSERT INTO rescue_requests
      (user_id,reporter_name,phone,location,description,image_url,animal_type,urgency,status,assigned_to,resolved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    values
  );
  return result.insertId;
}

async function upsertRescueLog({ rescueId, action, note, daysAgo }, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM rescue_logs WHERE rescue_id=? AND note=? LIMIT 1',
    [rescueId, note]
  );
  if (existing) return existing.id;
  const [result] = await db.execute(
    `INSERT INTO rescue_logs (rescue_id,action,note,operator_id,created_at)
     VALUES (?,?,?,?,DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [rescueId, action, note, adminId, daysAgo]
  );
  return result.insertId;
}

async function upsertApplication(record, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM adoption_applications WHERE user_id=? AND animal_id=? AND reason=? LIMIT 1',
    [record.userId, record.animalId, record.reason]
  );
  const values = [
    record.userId,
    record.animalId,
    record.name,
    record.phone,
    record.address,
    record.housing,
    record.hasPetExp,
    record.experience || null,
    record.reason,
    record.status,
  ];
  if (existing) return existing.id;
  const [result] = await db.execute(
    `INSERT INTO adoption_applications
      (user_id,animal_id,applicant_name,phone,address,housing_type,has_pet_exp,pet_experience,reason,status,reviewed_by,reviewed_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,IF(? IN ('approved','completed','rejected'),DATE_SUB(NOW(), INTERVAL ? DAY),NULL),DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [...values, record.status === 'pending' ? null : adminId, record.status, record.reviewedDaysAgo || 5, record.createdDaysAgo || 8]
  );
  return result.insertId;
}

async function upsertFollowup({ applicationId, visitDaysAgo, content, condition, nextDays, photos }, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM adoption_followups WHERE application_id=? AND content=? LIMIT 1',
    [applicationId, content]
  );
  if (existing) return existing.id;
  const [result] = await db.execute(
    `INSERT INTO adoption_followups
      (application_id,visit_date,content,animal_condition,next_visit_date,photos,operator_id)
     VALUES (?,DATE_SUB(CURDATE(), INTERVAL ? DAY),?,?,DATE_ADD(CURDATE(), INTERVAL ? DAY),?,?)`,
    [applicationId, visitDaysAgo, content, condition, nextDays, JSON.stringify(photos || []), adminId]
  );
  return result.insertId;
}

async function upsertNotification({ userId, type, title, content, relatedId, read = 0, daysAgo }, adminId) {
  const [[existing]] = await db.execute(
    'SELECT id FROM notifications WHERE user_id=? AND title=? AND COALESCE(related_id,0)=COALESCE(?,0) LIMIT 1',
    [userId, title, relatedId]
  );
  if (existing) return existing.id;
  const [result] = await db.execute(
    `INSERT INTO notifications (user_id,type,title,content,related_id,is_read,created_at)
     VALUES (?,?,?,?,?,?,DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [userId, type, title, content, relatedId, read, daysAgo]
  );
  return result.insertId;
}

async function main() {
  const adminId = (await findUser('admin')) || await ensureUser({
    username: 'admin', nickname: '系统管理员', email: '', phone: '', role: 'admin',
  });
  const demoId = (await findUser('demo')) || await ensureUser({
    username: 'demo', nickname: '演示用户', email: 'demo@example.com', phone: '13800000000',
  });
  const users = {
    lin: await ensureUser({ username: 'adopter_lin', nickname: '林女士', email: 'lin@example.com', phone: '13910001001' }),
    zhou: await ensureUser({ username: 'adopter_zhou', nickname: '周先生', email: 'zhou@example.com', phone: '13910001002' }),
    wu: await ensureUser({ username: 'reporter_wu', nickname: '吴同学', email: 'wu@example.com', phone: '13910001003' }),
    chen: await ensureUser({ username: 'volunteer_chen', nickname: '陈志愿者', email: 'chen@example.com', phone: '13910001004' }),
  };

  const animalRecords = [
    { name: '墨墨', categoryId: 1, breed: '中华田园猫', gender: 'male', age: '约2岁', weight: 4.8, color: '黑白', health: '健康，已完成体检', vaccinated: 1, sterilized: 1, personality: '安静稳重', description: '黑白分明的小绅士，喜欢靠在窗边观察人，适合安静家庭。', image: image('animal-cat-tuxedo.jpg'), images: [image('animal-cat-tuxedo.jpg'), image('animal-cat-tuxedo-checkup.jpg')], status: 'available', location: '东湖社区活动室', daysAgo: 42 },
    { name: '斑斑', categoryId: 1, breed: '中华田园猫', gender: 'female', age: '约1岁', weight: 3.9, color: '棕色条纹', health: '健康，已驱虫', vaccinated: 1, sterilized: 0, personality: '机灵好奇', description: '喜欢追逗猫棒，也能独处，适合第一次养猫的家庭。', image: image('animal-cat-tabby.jpg'), status: 'available', location: '青禾社区花园', daysAgo: 36 },
    { name: '小满', categoryId: 2, breed: '中华田园犬', gender: 'female', age: '约1岁', weight: 12.6, color: '白底棕耳', health: '健康，已接种', vaccinated: 1, sterilized: 0, personality: '亲人有耐心', description: '在社区志愿者陪伴下学会了牵引散步，见到熟人会主动摇尾巴。', image: image('animal-dog-white.jpg'), images: [image('animal-dog-white.jpg'), image('animal-dog-white-walk.jpg')], status: 'available', location: '南湖社区服务站', daysAgo: 31 },
    { name: '彩彩', categoryId: 1, breed: '中华田园猫', gender: 'female', age: '约10个月', weight: 3.2, color: '三花', health: '健康，等待绝育', vaccinated: 1, sterilized: 0, personality: '慢热温柔', description: '需要一点时间建立信任，熟悉后会安静地陪在身边。', image: image('animal-cat-calico.jpg'), status: 'fostered', location: '湖畔寄养家庭', daysAgo: 28 },
    { name: '阿福', categoryId: 2, breed: '金毛', gender: 'male', age: '约7岁', weight: 25.5, color: '金黄', health: '健康，定期复查', vaccinated: 1, sterilized: 1, personality: '温和可靠', description: '年纪稍长但非常稳定，已经适应家庭生活，适合想要陪伴的家庭。', image: image('animal-dog-senior.jpg'), images: [image('animal-dog-senior.jpg'), image('animal-dog-senior-followup.jpg')], status: 'adopted', location: '城北旧厂区', daysAgo: 80 },
    { name: '灰耳', categoryId: 3, breed: '侏儒兔', gender: 'male', age: '约9个月', weight: 1.5, color: '灰白', health: '健康，已完成体检', vaccinated: 0, sterilized: 0, personality: '温顺爱吃草', description: '日常活动量适中，喜欢新鲜牧草和安静的室内环境。', image: image('animal-rabbit-grey.jpg'), images: [image('animal-rabbit-grey.jpg'), image('animal-rabbit-hay.jpg')], status: 'available', location: '大学城志愿者之家', daysAgo: 24 },
  ];
  const animalIds = {};
  for (const record of animalRecords) animalIds[record.name] = await upsertAnimal(record, adminId);
  const existingNames = ['雪球', '花花', '小橘', '大黄', '短腿', '旺财'];
  for (const name of existingNames) {
    const [[row]] = await db.execute('SELECT id FROM animals WHERE name=? LIMIT 1', [name]);
    if (row) animalIds[name] = row.id;
  }

  const events = [
    ['墨墨', 'rescue', '完成救助登记', 42, '在社区活动室附近被发现，工作人员完成接回与基础安置。'], ['墨墨', 'checkup', '完成入院体检', 40, '体检结果稳定，已完成驱虫与基础免疫评估。'], ['墨墨', 'vaccine', '完成疫苗接种', 32, '完成首针疫苗接种，观察状态良好。'], ['墨墨', 'listing', '开放领养申请', 20, '性格评估通过，正式开放领养申请。'],
    ['斑斑', 'rescue', '从社区花园接回', 36, '志愿者在花园绿化带发现并安全接回。'], ['斑斑', 'checkup', '完成健康检查', 34, '精神状态良好，已完成驱虫。'], ['斑斑', 'listing', '开放领养申请', 18, '适应室内环境后开放领养。'],
    ['小满', 'rescue', '完成救助登记', 31, '在社区服务站附近被发现，志愿者完成接回。'], ['小满', 'checkup', '完成基础体检', 29, '体检无异常，开始进行牵引和社会化训练。'], ['小满', 'vaccine', '完成疫苗接种', 21, '完成基础疫苗接种，状态稳定。'], ['小满', 'listing', '开放领养申请', 12, '牵引训练通过，开放家庭领养。'],
    ['彩彩', 'rescue', '转入寄养家庭', 28, '由寄养家庭提供安静空间，继续观察亲人程度。'], ['彩彩', 'checkup', '完成寄养复查', 16, '食欲与精神状态良好，继续寄养观察。'],
    ['阿福', 'rescue', '完成救助登记', 80, '在旧厂区附近被发现，接回后完成基础治疗。'], ['阿福', 'checkup', '完成老年犬体检', 72, '关节状态稳定，建议保持规律低强度运动。'], ['阿福', 'adopted', '完成领养交接', 45, '由有养宠经验的家庭领养，进入回访阶段。'],
    ['灰耳', 'rescue', '完成救助登记', 24, '在大学城附近被发现，转入志愿者之家安置。'], ['灰耳', 'checkup', '完成体检与饮食评估', 20, '体重稳定，开始建立规律牧草饮食。'],
    ['雪球', 'checkup', '完成季度复查', 14, '健康状态稳定，继续等待合适家庭。'], ['花花', 'listing', '开放领养申请', 10, '完成性格评估，开放领养申请。'], ['小橘', 'listing', '更新领养档案', 8, '补充相册与健康记录，方便申请人了解。'], ['大黄', 'followup', '完成领养回访', 5, '新家庭反馈适应良好，生活规律。'],
  ];
  for (const [name, type, title, daysAgo, description] of events) if (animalIds[name]) await upsertEvent({ animalId: animalIds[name], type, title, daysAgo, description }, adminId);

  const articles = [
    { title: '新手养猫完全指南', content: '<p>第一次养猫可以从生活空间、饮水、猫砂与健康记录四个方面准备。</p><p>驱虫、疫苗和绝育需要按照医生建议安排，稳定的日常比一次性购买大量用品更重要。</p>', cover: image('article-care-cat.jpg'), category: 'knowledge', views: 168 },
    { title: '领养须知与流程说明', content: '<p>领养需要年满 18 周岁，有稳定住所与基本照护能力。</p><p>提交申请后，工作人员会完成材料审核、沟通和线下见面，再签署领养协议并安排回访。</p>', cover: image('article-adoption-guide.jpg'), category: 'guide', views: 124 },
    { title: '大黄的领养故事', content: '<p>大黄曾在城西工业园生活，经过救助、治疗与等待，终于进入一个有耐心的家庭。</p><p>领养不是终点，持续的回访让工作人员能够及时提供支持。</p>', cover: image('article-rescue-story.jpg'), category: 'story', views: 286 },
    { title: '如何科学地给狗狗社会化', content: '<p>社会化不是强迫接触，而是在安全距离内逐步建立积极经验。</p><p>短时、低压力、可撤退的练习更适合刚进入家庭的救助犬。</p>', cover: image('article-dog-social.jpg'), category: 'knowledge', views: 102 },
    { title: '雨天遇到流浪动物怎么办', content: '<p>先观察环境与动物状态，不要贸然追赶；可以在安全位置提供清水和食物，并记录地点。</p><p>遇到受伤或紧急情况，请通过救助表单留下可联系信息。</p>', cover: image('article-rain-rescue.jpg'), category: 'guide', views: 89 },
    { title: '幼猫临时安置指南', content: '<p>幼猫需要干燥、保温、通风的临时空间，避免与家中其他动物直接接触。</p><p>记录发现时间、数量和状态，有助于后续评估喂养与医疗安排。</p>', cover: image('article-kitten-care.jpg'), category: 'knowledge', views: 76 },
  ];
  for (const article of articles) await upsertArticle(article, adminId);

  const rescues = [
    { reporter: '赵阿姨', phone: '13920001001', location: '老城里弄 3 号门', description: '傍晚发现一只灰猫躲在自行车旁，愿意靠近但有些紧张。', imageUrl: image('rescue-night-cat.jpg'), animalType: '猫', urgency: 'high', status: 'processing', userId: users.chen },
    { reporter: '陈先生', phone: '13920001002', location: '北街商铺屋檐下', description: '雨天有一只淋湿的流浪狗在屋檐下避雨，目前可以正常喝水。', imageUrl: image('rescue-rain-dog.jpg'), animalType: '狗', urgency: 'high', status: 'resolved', userId: demoId },
    { reporter: '林同学', phone: '13920001003', location: '科技园 B 区绿化带', description: '发现三只幼猫挤在纸箱旁，附近没有看到母猫，需要协助转移。', imageUrl: image('rescue-kittens.jpg'), animalType: '猫', urgency: 'critical', status: 'processing', userId: users.lin },
    { reporter: '周女士', phone: '13920001004', location: '大学城社区花园', description: '花园里有一只兔子，疑似被遗弃，暂时已用安全围栏隔离。', imageUrl: image('rescue-rabbit.jpg'), animalType: '兔', urgency: 'medium', status: 'pending', userId: users.zhou },
  ];
  const rescueIds = {};
  for (const record of rescues) rescueIds[record.reporter] = await upsertRescue(record, adminId);
  const legacyRescueImages = [
    ['13900001111', image('rescue-night-cat.jpg')],
    ['13900002222', image('rescue-kittens.jpg')],
    ['13900003333', image('rescue-rain-dog.jpg')],
  ];
  for (const [phone, imageUrl] of legacyRescueImages) {
    await db.execute(
      "UPDATE rescue_requests SET image_url=? WHERE phone=? AND (image_url IS NULL OR image_url='')",
      [imageUrl, phone]
    );
  }
  const logs = [
    { reporter: '赵阿姨', action: 'processing', note: '已联系报告人，安排志愿者携带诱捕笼前往现场。', daysAgo: 2 },
    { reporter: '赵阿姨', action: 'processing', note: '志愿者已到达附近，正在确认猫咪活动范围。', daysAgo: 1 },
    { reporter: '陈先生', action: 'processing', note: '已将流浪狗带回临时安置点，完成基础清洁和饮水补给。', daysAgo: 5 },
    { reporter: '陈先生', action: 'resolved', note: '已完成健康观察并联系临时寄养家庭。', daysAgo: 3 },
    { reporter: '林同学', action: 'processing', note: '已联系报告人确认幼猫数量，安排保温箱和奶粉。', daysAgo: 1 },
    { reporter: '周女士', action: 'note', note: '报告人已用围栏临时隔离，等待志愿者确认兔子来源。', daysAgo: 0 },
  ];
  for (const row of logs) if (rescueIds[row.reporter]) await upsertRescueLog({ rescueId: rescueIds[row.reporter], action: row.action, note: row.note, daysAgo: row.daysAgo }, adminId);

  const applicationIds = {};
  applicationIds['墨墨'] = await upsertApplication({ userId: users.lin, animalId: animalIds['墨墨'], name: '林女士', phone: '13910001001', address: '湖滨路 22 号', housing: '自有', hasPetExp: 1, experience: '养过一只猫，家中有独立安静房间。', reason: '希望给墨墨一个稳定的室内生活。', status: 'pending', createdDaysAgo: 2 }, adminId);
  applicationIds['小满'] = await upsertApplication({ userId: users.zhou, animalId: animalIds['小满'], name: '周先生', phone: '13910001002', address: '青云小区 6 号', housing: '自有', hasPetExp: 1, experience: '有定期遛狗经验。', reason: '喜欢户外活动，希望和小满一起建立规律生活。', status: 'approved', createdDaysAgo: 16, reviewedDaysAgo: 12 }, adminId);
  applicationIds['阿福'] = await upsertApplication({ userId: users.chen, animalId: animalIds['阿福'], name: '陈志愿者', phone: '13910001004', address: '南湖路 9 号', housing: '自有', hasPetExp: 1, experience: '长期参与犬类救助与照护。', reason: '希望为年长犬提供稳定的家庭陪伴。', status: 'completed', createdDaysAgo: 55, reviewedDaysAgo: 50 }, adminId);
  applicationIds['灰耳'] = await upsertApplication({ userId: users.wu, animalId: animalIds['灰耳'], name: '吴同学', phone: '13910001003', address: '大学城宿舍区', housing: '租房', hasPetExp: 0, reason: '喜欢兔子，愿意学习科学饲养方法。', status: 'pending', createdDaysAgo: 1 }, adminId);

  await upsertFollowup({ applicationId: applicationIds['小满'], visitDaysAgo: 4, content: '电话回访，小满已适应新家庭，开始按计划散步。', condition: '精神状态良好，饮食正常', nextDays: 18, photos: [image('animal-dog-white-walk.jpg')] }, adminId);
  await upsertFollowup({ applicationId: applicationIds['阿福'], visitDaysAgo: 10, content: '上门回访，阿福在新家休息规律，愿意和家人互动。', condition: '健康稳定，关节活动正常', nextDays: 20, photos: [image('animal-dog-senior-followup.jpg')] }, adminId);

  await upsertNotification({ userId: users.lin, type: 'adoption', title: '领养申请已提交', content: '您对「墨墨」的领养申请已提交，工作人员会尽快与您联系。', relatedId: applicationIds['墨墨'], daysAgo: 2 }, adminId);
  await upsertNotification({ userId: users.zhou, type: 'adoption', title: '领养申请已通过', content: '您对「小满」的领养申请已通过审核，请留意工作人员的线下见面通知。', relatedId: applicationIds['小满'], daysAgo: 12 }, adminId);
  await upsertNotification({ userId: users.chen, type: 'followup', title: '回访记录已更新', content: '工作人员为您领养的「阿福」添加了一条回访记录。', relatedId: applicationIds['阿福'], daysAgo: 10 }, adminId);

  console.log('Extended demo data is ready: 16 animals, 6 articles, 8 rescue examples, richer adoption and follow-up records.');
}

main().catch((error) => {
  console.error('Extended demo seed failed:', error.message);
  process.exitCode = 1;
}).finally(() => db.end());
