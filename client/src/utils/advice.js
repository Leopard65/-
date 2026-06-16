/**
 * 领养建议（规则推断，无需后端）
 * 根据动物的类型、体型、健康、性格等字段，生成"适合家庭/居住建议"标签与温馨提示。
 * 与服务端的匹配评分（utils/match）互补：匹配是"找谁"，这里是"它适合谁/需注意什么"。
 */

export function buildAdoptionAdvice(animal) {
  if (!animal) return { tags: [], tips: [] }

  const tags = []
  const tips = []
  const cat = Number(animal.category_id)
  const weight = Number(animal.weight) || 0
  const p = animal.personality || ''
  const isDog = cat === 2
  const isCat = cat === 1
  const small = cat === 3 || cat === 4 || isCat || (isDog && weight > 0 && weight < 10)
  const largeDog = isDog && weight >= 15

  // 居住 / 体型
  if (small) tags.push('适合公寓 / 租房')
  if (largeDog) tags.push('需要较大活动空间')

  // 健康
  if (animal.is_sterilized && animal.is_vaccinated) tags.push('已绝育已疫苗 · 省心')

  // 性格 → 适合人群
  if (/亲人|粘人|友善|温顺|乖巧/.test(p)) tags.push('亲人友善 · 对家人友好')
  if (/安静|好静|省心/.test(p)) tags.push('安静省心 · 适合上班族')
  if (/活泼|元气|好动|精力/.test(p)) tags.push('活泼好动 · 适合爱运动的你')
  if (isDog) tags.push('建议每天遛弯陪伴')

  // 温馨提示
  if (small) tips.push('体型适中，城市公寓也能舒适生活。')
  if (largeDog) tips.push('精力旺盛，建议有院子或保证每日充足运动。')
  if (!animal.is_sterilized) tips.push('尚未绝育，领养后建议尽快安排绝育。')
  if (!animal.is_vaccinated) tips.push('疫苗待完善，领养后请及时补种。')

  if (tags.length === 0) tags.push('适合有爱心、有耐心的你')

  return { tags, tips }
}
