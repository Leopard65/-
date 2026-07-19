import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localPath = resolve(root, 'mock/data.js')
const cloudPath = resolve(root, 'uniCloud-aliyun/cloudfunctions/init-data/index.js')
const runtimePath = resolve(root, 'config/runtime.js')
const servicePath = resolve(root, 'mock/service.js')
const apiClientPath = resolve(root, 'api/client.js')
const indexPath = resolve(root, 'index.html')
const localSource = readFileSync(localPath, 'utf8')
const cloudSource = readFileSync(cloudPath, 'utf8')
const runtimeSource = readFileSync(runtimePath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')
const apiClientSource = readFileSync(apiClientPath, 'utf8')
const indexSource = readFileSync(indexPath, 'utf8')

const expected = {
  goods: 12,
  skus: 24,
  banners: 2,
  topCategories: 5,
  reviews: 12,
  coupons: 3,
  messages: 4,
  orders: 3,
  afterSales: 1,
  operationLogs: 4
}

const readArrayExpression = (source, name) => {
  const declaration = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[`, 'm')
  const match = declaration.exec(source)
  if (!match) return []
  const start = source.indexOf('[', match.index)
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '[') depth += 1
    if (char === ']') {
      depth -= 1
      if (depth === 0) {
        const expression = source.slice(start, index + 1)
        return Function(
          'Date',
          'DEMO_USER',
          'now',
          'ORDER_STATUS',
          'AFTER_SALE_STATUS',
          'goods',
          'coupons',
          'demoOrderAddress',
          'demoOrders',
          `return (${expression})`
        )(
          Date,
          { nickname: '薪超体验官', mobile: '13800138000' },
          () => Date.now(),
          { pendingPay: 0, pendingShip: 1, pendingReceive: 2, pendingReview: 3, completed: 4, refunding: 5, canceled: 6 },
          { pending: 0, approved: 1, rejected: 2, returning: 3, completed: 4, canceled: 5 },
          [],
          [],
          {},
          [{}, {}, { goods_list: [{}, {}] }]
        )
      }
    }
  }
  throw new Error(`Unclosed array declaration: ${name}`)
}

const ids = list => list.map(item => item._id).filter(Boolean)
const setEqual = (actual, expectedValues, label) => {
  assert.deepEqual([...new Set(actual)].sort(), [...new Set(expectedValues)].sort(), label)
}
const check = (failures, label, action) => {
  try {
    action()
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
  }
}

const local = {
  categories: readArrayExpression(localSource, 'categories'),
  subCategories: readArrayExpression(localSource, 'subCategories'),
  goods: readArrayExpression(localSource, 'goods'),
  skus: readArrayExpression(localSource, 'skus'),
  banners: readArrayExpression(localSource, 'banners'),
  coupons: readArrayExpression(localSource, 'coupons'),
  messages: readArrayExpression(localSource, 'messages'),
  evaluations: readArrayExpression(localSource, 'evaluations'),
  orders: readArrayExpression(localSource, 'demoOrders'),
  afterSales: readArrayExpression(localSource, 'demoAfterSales'),
  operationLogs: readArrayExpression(localSource, 'operationLogs')
}
const cloud = {
  categories: readArrayExpression(cloudSource, 'categories'),
  goods: readArrayExpression(cloudSource, 'goods'),
  skus: readArrayExpression(cloudSource, 'skus'),
  banners: readArrayExpression(cloudSource, 'banners'),
  coupons: readArrayExpression(cloudSource, 'coupons'),
  messages: readArrayExpression(cloudSource, 'messages'),
  evaluations: readArrayExpression(cloudSource, 'evaluations'),
  orders: readArrayExpression(cloudSource, 'demoOrders'),
  afterSales: readArrayExpression(cloudSource, 'demoAfterSales'),
  operationLogs: readArrayExpression(cloudSource, 'operationLogs')
}

const failures = []
const exactCount = (label, list, count) => check(failures, label, () => assert.equal(list.length, count))

exactCount('local goods count', local.goods, expected.goods)
exactCount('local SKU count', local.skus, expected.skus)
exactCount('local banner count', local.banners, expected.banners)
exactCount('local top category count', local.categories, expected.topCategories)
exactCount('local evaluation count', local.evaluations, expected.reviews)
exactCount('local coupon count', local.coupons, expected.coupons)
exactCount('local message count', local.messages, expected.messages)
exactCount('local order count', local.orders, expected.orders)
exactCount('local after-sale count', local.afterSales, expected.afterSales)
exactCount('local operation log count', local.operationLogs, expected.operationLogs)
exactCount('cloud goods count', cloud.goods, expected.goods)
exactCount('cloud SKU count', cloud.skus, expected.skus)
exactCount('cloud banner count', cloud.banners, expected.banners)
exactCount('cloud evaluation count', cloud.evaluations, expected.reviews)
exactCount('cloud coupon count', cloud.coupons, expected.coupons)
exactCount('cloud message count', cloud.messages, expected.messages)
exactCount('cloud order count', cloud.orders, expected.orders)
exactCount('cloud after-sale count', cloud.afterSales, expected.afterSales)
exactCount('cloud operation log count', cloud.operationLogs, expected.operationLogs)

check(failures, 'goods IDs match', () => setEqual(ids(local.goods), ids(cloud.goods), 'local/cloud goods IDs differ'))
check(failures, 'SKU IDs match', () => setEqual(ids(local.skus), ids(cloud.skus), 'local/cloud SKU IDs differ'))
check(failures, 'banner IDs match', () => setEqual(ids(local.banners), ids(cloud.banners), 'local/cloud banner IDs differ'))

const categoryIds = ids(local.categories).concat(ids(local.subCategories))
check(failures, 'unique local goods IDs', () => assert.equal(new Set(ids(local.goods)).size, local.goods.length))
check(failures, 'unique local SKU IDs', () => assert.equal(new Set(ids(local.skus)).size, local.skus.length))
check(failures, 'SKU goods references', () => assert.ok(local.skus.every(item => ids(local.goods).includes(item.goods_id))))
check(failures, 'goods category references', () => assert.ok(local.goods.every(item => categoryIds.includes(item.category_id) && categoryIds.includes(item.sub_category_id))))
check(failures, 'two gallery images per good', () => assert.ok(local.goods.every(item => item.images?.length === 2 && new Set(item.images).size === 2)))
check(failures, 'at least two goods per top category', () => {
  assert.ok(local.categories.every(category => local.goods.filter(item => item.category_id === category._id).length >= 2))
})

const assetPaths = new Set()
for (const item of [...local.categories, ...local.subCategories, ...local.goods, ...local.skus, ...local.banners]) {
  if (item.icon?.startsWith('/static/demo/')) assetPaths.add(item.icon)
  if (item.image?.startsWith('/static/demo/')) assetPaths.add(item.image)
  for (const image of item.images || []) {
    if (image.startsWith('/static/demo/')) assetPaths.add(image)
  }
}
check(failures, 'all local assets exist', () => {
  const missing = [...assetPaths].filter(path => !existsSync(resolve(root, path.slice(1))))
  assert.deepEqual(missing, [])
})
check(failures, 'no legacy placeholder assets referenced', () => {
  const legacy = [...assetPaths].filter(path => /banner-1|category-(home|shirt|phone|beauty|food)|goods-(shirt|earbuds|cup|towel)\.png$/.test(path))
  assert.deepEqual(legacy, [])
})
check(failures, 'no committed demo cloud secret', () => {
  assert.doesNotMatch(runtimeSource, /clientSecret:\s*env\.[A-Z0-9_]+\s*\|\|\s*['"][^'"]+['"]/)
})
check(failures, 'product detail reads seeded evaluations', () => {
  assert.match(serviceSource, /read\(STORAGE_KEYS\.evaluations,\s*\[\]\)/)
  assert.doesNotMatch(serviceSource, /_id:\s*['"]eval-1['"]/)
})
check(failures, 'H5 demo without secret prefers local mock', () => {
  assert.match(runtimeSource, /export const shouldPreferLocalMock/)
  assert.match(apiClientSource, /shouldPreferLocalMock\(\)/)
})
check(failures, 'H5 declares an existing favicon', () => {
  const match = indexSource.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i)
  assert.ok(match, 'favicon link is missing')
  assert.ok(existsSync(resolve(root, match[1].replace(/^\//, ''))), `favicon does not exist: ${match[1]}`)
})

const summary = {
  expected,
  actual: {
    local: Object.fromEntries(Object.entries(local).map(([key, value]) => [key, value.length])),
    cloud: Object.fromEntries(Object.entries(cloud).map(([key, value]) => [key, value.length])),
    assets: assetPaths.size
  },
  failures
}

console.log(JSON.stringify(summary, null, 2))
if (failures.length) process.exitCode = 1
