/**
 * 领养匹配评分（规则算法，可解释、无需外部服务）
 *
 * 依据用户填写的领养偏好，为每只可领养动物计算 0-100 的匹配度，并给出匹配理由。
 */

function scoreAnimal(animal, prefs = {}) {
  let score = 40;
  const reasons = [];

  const cat = Number(animal.category_id);
  const weight = Number(animal.weight) || 0;
  const personality = animal.personality || '';
  const isDog = cat === 2;
  const isCat = cat === 1;
  const smallPet = cat === 3 || cat === 4 || isCat || (isDog && weight > 0 && weight < 10);
  const largeDog = isDog && weight >= 15;

  // 1. 动物类型偏好
  if (prefs.category_id && Number(prefs.category_id) === cat) {
    score += 25;
    reasons.push('符合你偏好的动物类型');
  } else if (!prefs.category_id) {
    score += 12;
  }

  // 2. 居住条件
  if (prefs.housing_type === '租房') {
    if (smallPet) { score += 15; reasons.push('体型适中，适合租房/公寓饲养'); }
    if (largeDog) { score -= 12; }
  } else if (prefs.housing_type === '自有') {
    score += 8;
    if (largeDog) { score += 10; reasons.push('住房空间充足，适合大型犬'); }
  }

  // 3. 养宠经验
  if (prefs.has_experience === false || prefs.has_experience === 'no') {
    if (smallPet || animal.is_sterilized) { score += 12; reasons.push('护理友好，适合新手'); }
    if (largeDog) { score -= 6; }
  } else if (prefs.has_experience === true || prefs.has_experience === 'yes') {
    score += 8;
    reasons.push('你的养宠经验能给它更好的照顾');
  }

  // 4. 活动量偏好
  if (prefs.activity === 'high') {
    if (isDog) { score += 15; reasons.push('精力充沛，适合爱运动的你'); }
  } else if (prefs.activity === 'low') {
    if (!isDog || smallPet) { score += 12; reasons.push('好静省心，契合安静的生活节奏'); }
  } else if (prefs.activity === 'medium') {
    score += 6;
  }

  // 5. 性格偏好（多选关键词，命中即加分）
  if (Array.isArray(prefs.personality)) {
    for (const kw of prefs.personality) {
      if (kw && personality.includes(kw)) {
        score += 8;
        reasons.push(`性格「${kw}」与你期待相符`);
      }
    }
  }

  // 健康加成
  if (animal.is_vaccinated && animal.is_sterilized) {
    score += 5;
    reasons.push('已接种、已绝育，领养更省心');
  }

  score = Math.max(10, Math.min(100, Math.round(score)));
  return { score, reasons };
}

module.exports = { scoreAnimal };
