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
    {
      title: '新手养猫完全指南',
      content: `
        <blockquote>养猫最重要的不是一次买齐所有用品，而是提供安全、稳定、可持续的生活。先把基本需求做好，再根据猫咪的真实习惯逐步调整。</blockquote>
        <h2>一、接猫前先确认生活条件</h2>
        <p>猫通常能适应公寓生活，但并不等于“放在家里就不用管”。你需要确认家人和房东是否同意、每天能否安排喂食和清洁、出差时由谁照顾，以及未来十多年是否愿意承担食品、猫砂、体检和医疗支出。窗户、阳台和纱窗要提前检查，普通纱窗可能被猫推开，建议加装牢固的防护网。</p>
        <p>新猫到家前，可以先准备一个安静的小房间或角落，里面放好水、食物、猫砂盆、躲藏箱和抓板。空间不必大，关键是减少突然的噪声、追逐和围观，让猫可以自主观察环境。</p>
        <h2>二、基础用品怎么选</h2>
        <ul>
          <li><strong>食盆和水碗：</strong>选择容易清洗、边缘不过深的陶瓷或不锈钢容器。水碗与食盆适当分开，多放一处饮水点更容易鼓励饮水。</li>
          <li><strong>猫砂盆：</strong>尺寸至少能让猫轻松转身。多猫家庭可参考“猫的数量加一个”准备猫砂盆，并分散摆放，避免一只猫堵住所有资源。</li>
          <li><strong>航空箱：</strong>不要只在看病时拿出来。平时打开箱门，放入熟悉的小毯子，让它成为安全躲藏处，紧急出门时会更顺利。</li>
          <li><strong>抓挠设施：</strong>竖直抓板和水平抓板都可以尝试。抓挠是正常行为，合适的抓板比责骂更有效。</li>
        </ul>
        <h2>三、饮食与饮水</h2>
        <p>主食应选择标明适合猫且营养完整的产品，并按照年龄、体况和活动量调整。换粮要循序渐进，通常用数天逐步提高新粮比例，突然更换容易引起软便或拒食。牛奶不是猫的必需品，部分成年猫不能很好消化乳糖；剩菜、重盐食物、巧克力、洋葱和含酒精食品也不应喂食。</p>
        <p>猫可能不主动表现口渴，可以通过干净流动水、多个饮水点和适量湿粮增加水分摄入。每天清洗水碗并更换新水，比购买复杂设备更重要。如果饮水量突然明显增加或减少，应结合排尿、精神和食欲观察，必要时咨询兽医。</p>
        <h2>四、第一周怎样相处</h2>
        <p>刚到家的猫躲起来很常见。不要强行抱出，也不要不停伸手试探。按固定时间轻声进入房间，补充水粮、清理猫砂，再安静坐一会儿。可以用逗猫棒在远处互动，让猫决定是否靠近。它开始正常吃喝、排泄、梳理毛发并主动探索，通常说明压力正在下降。</p>
        <h2>五、建立健康档案</h2>
        <p>领养后应尽快了解既往驱虫、疫苗、绝育和疾病记录，由正规动物医疗机构根据年龄和身体状态安排体检。不要自行重复用药，也不要把网络上的固定方案直接套在每只猫身上。平时可记录体重、食欲、饮水、排尿、排便和异常行为，这些信息比“看起来不舒服”更有助于判断变化。</p>
        <h3>出现这些情况应尽快就医</h3>
        <ul>
          <li>持续不吃不喝、频繁呕吐或明显腹泻；</li>
          <li>张口呼吸、呼吸困难、站立不稳或突然瘫软；</li>
          <li>反复进猫砂盆却排不出尿，尤其是公猫；</li>
          <li>误食线绳、药品、有毒植物或其他异物。</li>
        </ul>
        <p>稳定的作息、可预测的互动和及时医疗，是新手最可靠的养猫方法。允许猫保留自己的节奏，信任通常会在日复一日的安全感中慢慢建立。</p>
      `,
      cover: image('article-care-cat.jpg'), category: 'knowledge', views: 168,
    },
    {
      title: '领养须知与流程说明',
      content: `
        <blockquote>领养不是把动物“带回家就结束”，而是从申请、磨合到长期照护的一整套责任。流程看起来多，是为了降低冲动领养和再次遗弃的风险。</blockquote>
        <h2>一、提交申请前先做自我评估</h2>
        <p>申请人需要具备完全民事行为能力，并获得共同居住者和房屋管理方的同意。更重要的是评估长期条件：是否有稳定住所、日常照护时间、基本医疗预算，以及搬家、结婚、生育或工作变化时如何继续照顾动物。猫狗的寿命通常以十年计，短期热情不能替代长期安排。</p>
        <p>如果家中已有动物，要考虑隔离空间、疾病筛查和循序渐进的见面过程；如果有儿童或老人，也应根据动物性格和家庭活动强度选择，而不是只看外形、品种或年龄。</p>
        <h2>二、标准领养流程</h2>
        <ol>
          <li><strong>浏览档案：</strong>了解动物的健康状态、性格、救助经历、运动需求和已知注意事项。</li>
          <li><strong>提交申请：</strong>如实填写住房、养宠经验、家庭成员和领养原因。信息越具体，工作人员越容易判断匹配程度。</li>
          <li><strong>审核沟通：</strong>工作人员可能通过电话进一步确认生活安排，也会说明动物目前的习惯和可能存在的适应问题。</li>
          <li><strong>线下见面：</strong>在安静、安全的环境中观察互动。第一次见面不亲人，并不代表以后不能建立关系。</li>
          <li><strong>签署协议：</strong>明确不得转卖、遗弃或用于繁殖，约定绝育、免疫、科学饲养和回访等责任。</li>
          <li><strong>接回与回访：</strong>准备用品后完成交接，工作人员会在关键时间点了解适应情况并提供建议。</li>
        </ol>
        <h2>三、见面时重点看什么</h2>
        <p>不要用“会不会马上扑进怀里”作为唯一标准。更值得观察的是动物面对陌生人时能否逐渐放松、对食物或玩具是否有反应、被打扰后能否恢复，以及它的活动强度是否适合你的生活。工作人员长期照护形成的性格记录，通常比一次见面的表现更有参考价值。</p>
        <h2>四、到家后的适应期</h2>
        <p>猫可以先在独立房间适应，狗则需要规律牵引、固定排泄和安静休息。前几天应减少访客、洗澡、远距离出行和高强度互动，不要急着测试它是否护食、亲人或能否与其他动物相处。保持原有食物和作息，再逐步调整，可以减少应激、软便和拒食。</p>
        <h3>常见误区</h3>
        <ul>
          <li><strong>“免费领养就没有成本”：</strong>食品、用品、疫苗、绝育和疾病治疗都需要持续支出。</li>
          <li><strong>“领养后必须立刻感恩亲人”：</strong>动物不会理解抽象的救助意义，信任需要通过稳定照护建立。</li>
          <li><strong>“不合适再送给别人”：</strong>私下转送会打断健康记录和回访，也可能让动物再次处于风险中。</li>
          <li><strong>“幼年一定更好养”：</strong>幼年动物需要更多训练、免疫和陪伴；性格稳定的成年动物反而更适合部分家庭。</li>
        </ul>
        <h2>五、遇到困难要尽早沟通</h2>
        <p>短期躲藏、夜间叫、随地排泄或牵引不熟练，很多属于适应与管理问题。先记录发生时间、环境和频率，再联系救助方或专业人员。若出现攻击升级、持续拒食、排尿困难、呼吸异常等情况，应优先排查医疗问题。确实无法继续饲养时，也应按照协议联系原救助机构共同处理，不要遗弃或自行发布转送信息。</p>
        <p>合适的领养不是寻找“完美宠物”，而是让动物需求与家庭能力尽可能匹配。诚实填写申请、接受回访和愿意学习，本身就是负责任领养的重要部分。</p>
      `,
      cover: image('article-adoption-guide.jpg'), category: 'guide', views: 124,
    },
    {
      title: '大黄的领养故事',
      content: `
        <blockquote>一只流浪动物真正进入家庭，靠的往往不是某个戏剧性的瞬间，而是救助、医疗、观察、匹配和回访一步步接起来。</blockquote>
        <h2>从工业园到救助站</h2>
        <p>大黄最早出现在城西工业园。附近工人说，它会在固定时间到门卫室旁等食物，但始终与人保持距离。志愿者连续几天在同一位置放置清水和食物，记录它的活动范围，没有直接追赶。确认大黄愿意稳定出现后，大家才在相对安静的时间完成转移。</p>
        <p>刚进入救助站时，大黄偏瘦，毛发打结，对突然靠近和金属碰撞声比较敏感。体检没有发现需要紧急处理的传染病，但需要驱虫、补充营养并观察关节状态。工作人员为它安排了安静犬舍，把喂食、散步和清洁时间固定下来，让每天发生的事情尽量可预测。</p>
        <h2>恢复的不只是体重</h2>
        <p>前两周，大黄散步时经常回头确认牵引绳另一端的人。志愿者没有急着训练复杂口令，只从名字回应、坐下等待和松绳行走开始。每次练习时间很短，在它仍然愿意参与时结束。随着作息稳定，大黄开始主动靠近熟悉的人，也能在听到车辆声后更快恢复平静。</p>
        <p>救助档案里记录的不只是疫苗和体重，还包括它喜欢怎样被触摸、会不会护食、遇到陌生犬的反应、独处时是否焦虑。这些日常信息后来成为筛选领养家庭的重要依据。</p>
        <h2>不是最先申请的人，而是更合适的人</h2>
        <p>大黄上架后收到过几次咨询。有人喜欢它的外形，却无法保证每天散步；也有人希望它立即和家中小型犬相处。工作人员没有把“尽快送走”当作目标，而是继续寻找生活节奏更匹配的家庭。</p>
        <p>最终领养人住在有电梯的小区，家中成年人都有养犬经验，能够安排早晚散步，也愿意接受前期磨合。第一次见面时，大黄没有立刻表现得特别热情，只是在几分钟后主动闻了闻对方的手。领养人没有强抱或持续逗弄，而是跟着工作人员一起完成了一段安静散步。</p>
        <h2>回家后的第一个月</h2>
        <p>接回家的头几天，大黄会在门口等待，也会因走廊声音突然起身。领养人保留救助站原来的食物和散步时间，在客厅放置固定犬床，并减少亲友来访。遇到不安时，他们没有惩罚，而是拉开距离、等待大黄放松，再用轻声和食物奖励平静行为。</p>
        <p>一周后的电话回访显示，大黄已经能稳定进食和休息；一个月后的上门回访中，它的体重保持正常，能主动叼玩具邀请家人互动。工作人员同时提醒领养人继续控制运动强度，按计划复查关节，不因状态变好就突然增加长距离活动。</p>
        <h3>这次领养带来的经验</h3>
        <ul>
          <li>救助初期先建立安全和规律，再谈训练和亲密互动；</li>
          <li>完整的行为记录能帮助家庭理解动物，而不是只凭照片选择；</li>
          <li>领养匹配应看时间、空间和照护能力，不追求最快成交；</li>
          <li>回访不是检查领养人，而是及时发现健康与适应问题的支持机制。</li>
        </ul>
        <p>现在的大黄有了固定散步路线，也知道晚饭后会有人陪它在客厅休息。它的故事并不传奇，却说明了最可靠的改变通常来自耐心、记录和一项项兑现的小承诺。</p>
      `,
      cover: image('article-rescue-story.jpg'), category: 'story', views: 286,
    },
    {
      title: '如何科学地给狗狗社会化',
      content: `
        <blockquote>社会化不是让狗“见得越多越好”，更不是把害怕的狗按在原地适应。科学社会化的核心，是在可承受的距离和强度下积累安全、积极的经验。</blockquote>
        <h2>一、社会化到底在练什么</h2>
        <p>社会化包括对人、动物、声音、地面、交通工具、护理操作和不同环境的适应。目标不是让狗喜欢所有对象，而是它遇到常见刺激时能够观察、保持基本平静，并在主人引导下离开。成年救助犬同样可以学习，只是需要更慢的节奏和更细的观察。</p>
        <p>幼犬确实存在较敏感的学习阶段，但“赶时间”不等于高强度暴露。免疫未完成时，可在兽医建议下选择干净、可控的环境，通过抱行、推车、窗边观察或接触健康且免疫记录明确的犬只获得经验。</p>
        <h2>二、先学会读懂身体语言</h2>
        <p>轻微压力可能表现为舔鼻、打哈欠、转头、身体压低、耳朵向后、尾巴夹紧或突然拒绝食物。压力继续增加时，可能出现凝视、僵住、吠叫、扑冲或躲逃。训练不应等到爆发后才停止；在狗还能吃零食、回应名字和主动探索时调整距离，学习效果通常更好。</p>
        <h2>三、一个可执行的练习方法</h2>
        <ol>
          <li><strong>选择单一目标：</strong>一次只练习一种刺激，例如远处的自行车，而不是同时去拥挤商场接触人群、车辆和陌生犬。</li>
          <li><strong>找到安全距离：</strong>站在狗能看见目标但身体仍放松的位置。如果拒食或持续盯住目标，就继续拉远。</li>
          <li><strong>建立积极关联：</strong>目标出现时给予小块食物或进行熟悉的简单互动，目标离开后奖励停止。</li>
          <li><strong>短时结束：</strong>每次几分钟即可，在状态良好时离开，不追求一次取得明显进步。</li>
          <li><strong>记录变化：</strong>写下距离、持续时间和反应，下次只提高一个难度，例如稍微靠近或延长几秒。</li>
        </ol>
        <h2>四、与人和狗见面时</h2>
        <p>不要要求陌生人俯身盯着狗、直接摸头或突然拥抱。可以让对方侧身站立，把零食轻轻丢在地上，由狗决定是否靠近。与其他犬见面时，优先选择性格稳定、牵引礼貌的对象，在开阔场地平行行走，再视情况缩短距离。牵引绳保持安全但不过度绷紧，避免面对面长时间停住。</p>
        <h3>常见但无效的做法</h3>
        <ul>
          <li><strong>强行“多见世面”：</strong>持续处于恐惧中可能让反应更强，而不是习惯。</li>
          <li><strong>因吠叫而大声斥责：</strong>这可能把陌生刺激与主人的惩罚联系在一起。</li>
          <li><strong>只在出问题时拉紧牵引：</strong>主人紧张和牵引压力会成为刺激出现的预告。</li>
          <li><strong>让狗自行解决冲突：</strong>不受控接触可能造成受伤，也会破坏已经建立的安全感。</li>
        </ul>
        <h2>五、什么时候需要专业帮助</h2>
        <p>如果狗已经出现咬伤、频繁扑冲、无法从惊恐中恢复，或行为突然改变，应先由兽医排除疼痛和疾病，再联系采用正向、低压力方法的专业行为人员。不要自行使用电击、勒颈或强制压制等工具。安全管理并不等于失败，围栏、口套适应、错峰散步和保持距离，都是负责任的措施。</p>
        <p>社会化没有统一毕业标准。狗能在日常生活中感到安全、能够沟通并逐步恢复平静，就已经是有价值的进步。</p>
      `,
      cover: image('article-dog-social.jpg'), category: 'knowledge', views: 102,
    },
    {
      title: '雨天遇到流浪动物怎么办',
      content: `
        <blockquote>雨天救助的第一原则是先保证人和动物的安全。不要因为着急靠近而把动物赶进车流、积水、施工区或其他更危险的位置。</blockquote>
        <h2>一、先观察，不要立刻追</h2>
        <p>在安全位置停留几分钟，观察动物是否能正常站立和行走、有没有明显出血、呼吸是否急促、是否佩戴项圈，以及附近是否可能有主人或幼崽。记录准确地点、时间、毛色、体型和移动方向，拍摄环境照片。夜间或视线较差时，可以共享定位并描述附近明显建筑。</p>
        <p>受惊的猫狗可能因靠近而逃跑，也可能在疼痛中防御。保持侧身、避免直视和大声呼喊，不要把它围在墙角。如果动物持续移动，可在不进入机动车道的前提下保持距离观察，并尽快联系当地救助组织、物业或相关管理部门。</p>
        <h2>二、怎样提供临时帮助</h2>
        <ul>
          <li><strong>遮雨：</strong>在动物愿意停留的位置附近放置纸箱或塑料周转箱，并确保出入口通畅、内部干燥。不要使用会缠绕身体的薄塑料袋。</li>
          <li><strong>饮水：</strong>提供干净常温水。动物明显虚弱时也不要强行灌水，以免误吸。</li>
          <li><strong>食物：</strong>可少量放置气味温和的猫粮或狗粮，用食物建立距离，不要一次喂很多油腻食物。</li>
          <li><strong>保温：</strong>幼小或全身湿透的动物可在安全转移后用干毛巾包裹，逐渐回温，避免直接贴近高温热源。</li>
        </ul>
        <h2>三、不要自行做这些事</h2>
        <p>不要给动物服用人用退烧药、止痛药或抗生素，部分常见药物对猫狗有严重毒性。不要徒手抓取不熟悉、受伤或行为异常的动物，也不要用绳索套颈拖拽。发现疑似骨折时，不要反复检查或强行掰动肢体；保持活动范围尽量小，等待专业转运。</p>
        <h2>四、需要转移时怎么做</h2>
        <p>温顺且愿意靠近的动物，可以用食物引导进入航空箱或结实纸箱。容器要有通风孔，底部铺防滑毛巾，并在搬运前确认门扣牢固。猫不宜抱在怀里直接乘车，狗也应使用牵引和二次防脱措施。无法安全接近时，应把定位、照片和行为描述交给有经验的救助人员，不要冒险完成捕捉。</p>
        <h3>以下情况应按紧急事件处理</h3>
        <ul>
          <li>持续出血、无法站立、抽搐、意识不清或明显呼吸困难；</li>
          <li>幼猫幼犬全身冰冷、持续尖叫、完全无反应；</li>
          <li>位于车流、深水、裸露电线或施工机械附近；</li>
          <li>疑似被撞、从高处跌落或接触有毒物质。</li>
        </ul>
        <h2>五、提交救助信息要写清楚什么</h2>
        <p>有效求助至少包含准确位置、动物数量和类型、当前状态、发现时间、现场照片以及可联系的报告人。说明你是否仍在现场、是否已经临时隔离、动物能否靠近，可以帮助工作人员决定携带航空箱、诱捕笼还是医疗物资。不要只转发一张图片却不留地址，也不要在多个平台发布互相矛盾的信息。</p>
        <p>救助资源通常有限。清晰观察、保护现场和及时更新状态，往往比盲目追赶更能帮助动物。若动物已离开，也应告知接单人员，避免重复出勤。</p>
      `,
      cover: image('article-rain-rescue.jpg'), category: 'guide', views: 89,
    },
    {
      title: '幼猫临时安置指南',
      content: `
        <blockquote>发现幼猫时，先判断是否真的失去母猫。只要环境暂时安全，观察和等待往往比立即抱走更合适；但幼猫冰冷、受伤或处在明显危险中时，需要尽快干预。</blockquote>
        <h2>一、先观察母猫是否会回来</h2>
        <p>母猫可能正在觅食、转移其他幼猫，或因人靠得太近不敢出现。可以退到幼猫看不见的地方观察数小时，同时留意环境是否有车流、积水、施工、犬只或人为伤害风险。幼猫身体温暖、相对安静、腹部不明显凹陷，通常说明近期得到过照顾。若幼猫持续尖叫、身体冰冷、明显消瘦或有伤口，就不应继续长时间等待。</p>
        <p>不要频繁挪动幼猫或围观拍照。如果原位置危险，可把整窝连同原有垫材移动到附近更安全、母猫仍容易找到的地方，并留下观察人员联系方式。</p>
        <h2>二、建立安全的临时空间</h2>
        <p>使用有通风孔、边缘牢固的航空箱或整理箱，底部铺吸水垫和柔软毛巾。环境应干燥、安静、没有穿堂风，并与家中其他动物隔离。不要让幼猫直接接触地暖、电热毯或热水袋；热源要包裹毛巾并只放在箱体一侧，让幼猫可以自行远离。</p>
        <p>触摸时先感受耳朵、爪垫和口腔周围是否冰冷。低体温幼猫不能急着喂食，应先缓慢回温并尽快寻求兽医或有经验救助人员帮助，强行喂奶可能造成呛咳和误吸。</p>
        <h2>三、喂养需要注意什么</h2>
        <ul>
          <li>使用幼猫专用代乳粉，按照产品说明现配现用；普通牛奶容易引起腹泻，不能作为替代品。</li>
          <li>喂食时让幼猫腹部向下，保持自然趴卧姿势，不能像人类婴儿一样仰躺。</li>
          <li>奶嘴流速应缓慢，幼猫主动吸吮比挤压奶瓶更安全。鼻孔冒奶、咳嗽或呼吸异常时立即停止。</li>
          <li>奶具每次使用后彻底清洗，剩余奶液不反复加热，避免细菌快速繁殖。</li>
        </ul>
        <p>不同周龄的喂养频率和单次量差异很大，不能只凭体型猜测。建议尽快称重、估算周龄并由专业人员制定方案。每天在固定时间使用电子秤记录体重，比单纯观察“有没有吃”更能发现问题。</p>
        <h2>四、排泄、清洁与隔离</h2>
        <p>很小的幼猫可能无法自行排尿排便，通常需要在喂食后用温湿棉片轻柔刺激会阴区域。动作要短而轻，不要用力摩擦。被毛沾到奶液或排泄物时，用温湿毛巾局部清洁并立即擦干，不建议直接洗澡。</p>
        <p>新救助幼猫可能携带跳蚤、真菌或呼吸道病原，应使用独立食具、毛巾和清洁用品，接触前后洗手。不要自行使用成年猫驱虫药、犬用药或来历不明的喷剂，幼猫对剂量和成分更敏感。</p>
        <h3>出现以下情况应尽快就医</h3>
        <ul>
          <li>持续拒食、体重不增或下降、严重腹泻和反复呕吐；</li>
          <li>身体持续冰冷、精神沉郁、无法抬头或站立；</li>
          <li>鼻孔冒奶、咳嗽、呼吸有杂音或张口呼吸；</li>
          <li>眼睛被大量分泌物粘住、伤口化脓或全身有大量跳蚤。</li>
        </ul>
        <h2>五、记录信息并尽快交接</h2>
        <p>记录发现时间和地点、幼猫数量、观察母猫的时长、每只幼猫的体重、进食和排泄情况。照片要能区分个体，但不要频繁使用闪光灯。联系救助机构或医院时，把这些信息一次说清楚，可以更快判断是否需要保温、检查、奶粉或住院支持。</p>
        <p>临时安置的目标不是独自承担全部救助，而是在专业帮助到来前维持安全和稳定。遇到不确定情况，宁可先咨询，也不要凭网络片段自行用药或强行喂养。</p>
      `,
      cover: image('article-kitten-care.jpg'), category: 'knowledge', views: 76,
    },
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
