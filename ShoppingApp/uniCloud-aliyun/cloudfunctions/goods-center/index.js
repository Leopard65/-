'use strict'

const db = uniCloud.database()

const ok = (data = {}, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg = '操作失败', code = 400) => ({ code, msg, data: null })

exports.main = async (event) => {
  const { action, params = {} } = event || {}
  const handlers = {
    getHomeData,
    getCategoryList,
    getGoodsList: () => getGoodsList(params),
    getGoodsByCategory: () => getGoodsList(params),
    searchGoods: () => getGoodsList(params),
    getGoodsDetail: () => getGoodsDetail(params)
  }

  const handler = handlers[action]
  if (!handler) return fail('接口不存在', 404)
  return handler()
}

async function getHomeData() {
  const [bannerRes, categoryRes, goodsRes] = await Promise.all([
    db.collection('home_banner').where({ status: 1 }).orderBy('sort', 'desc').limit(10).get(),
    db.collection('goods_category').where({ status: 1 }).orderBy('sort', 'asc').limit(30).get(),
    db.collection('goods').where({ status: 1, is_recommend: 1 }).orderBy('sort', 'desc').limit(20).get()
  ])

  return ok({
    banner_list: bannerRes.data || [],
    category_list: (categoryRes.data || []).filter(item => !item.parent_id),
    recommend_list: goodsRes.data || []
  })
}

async function getCategoryList() {
  const res = await db.collection('goods_category')
    .where({ status: 1 })
    .orderBy('sort', 'asc')
    .get()

  const rows = res.data || []
  const parents = rows.filter(item => !item.parent_id)
  const children = rows.filter(item => item.parent_id)

  return ok(parents.map(parent => ({
    ...parent,
    children: children.filter(child => child.parent_id === parent._id)
  })))
}

async function getGoodsList(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    categoryId = '',
    keyword = '',
    brand = '',
    sort = 'default',
    minPrice,
    maxPrice
  } = params

  const cmd = db.command
  const and = [{ status: 1 }]
  if (keyword) {
    const reg = new db.RegExp({ regexp: String(keyword), options: 'i' })
    and.push(cmd.or([{ name: reg }, { subtitle: reg }, { brand: reg }]))
  }
  if (categoryId) {
    and.push(cmd.or([{ category_id: categoryId }, { sub_category_id: categoryId }]))
  }
  if (brand) and.push({ brand })
  if (minPrice !== undefined && minPrice !== '') and.push({ price: cmd.gte(Number(minPrice)) })
  if (maxPrice !== undefined && maxPrice !== '') and.push({ price: cmd.lte(Number(maxPrice)) })

  const where = and.length > 1 ? cmd.and(and) : and[0]
  const buildQuery = () => db.collection('goods').where(where)

  const current = Number(page) || 1
  const size = Number(pageSize) || 20
  const skip = (current - 1) * size

  const [countRes, listRes] = await Promise.all([
    buildQuery().count(),
    applySort(buildQuery(), sort).skip(skip).limit(size).get()
  ])

  const total = countRes.total || 0
  return ok({
    list: listRes.data || [],
    total,
    page: current,
    pageSize: size,
    hasMore: skip + size < total
  })
}

async function getGoodsDetail(params = {}) {
  const goodsId = params.goodsId || params.goods_id
  if (!goodsId) return fail('缺少商品 ID')

  const goodsRes = await db.collection('goods').doc(goodsId).get()
  if (!goodsRes.data?.length) return fail('商品不存在', 404)

  const [skuRes, evaluateRes] = await Promise.all([
    db.collection('goods_sku').where({ goods_id: goodsId }).get(),
    db.collection('goods_evaluate').where({ goods_id: goodsId }).orderBy('create_date', 'desc').limit(5).get()
  ])

  return ok({
    ...goodsRes.data[0],
    sku_list: skuRes.data || [],
    evaluate_list: evaluateRes.data || []
  })
}

function applySort(query, sort) {
  if (sort === 'sales') return query.orderBy('sales', 'desc')
  if (sort === 'price_asc') return query.orderBy('price', 'asc')
  if (sort === 'price_desc') return query.orderBy('price', 'desc')
  if (sort === 'new') return query.orderBy('is_new', 'desc')
  return query.orderBy('sort', 'desc')
}
