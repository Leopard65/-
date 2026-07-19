# Demo Content and Image Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder catalog with a 12-product, image-rich demo and make local mock, uniCloud seed, H5 startup, credentials, and rendered workflows production-credible.

**Architecture:** Preserve the current page and API contracts. Expand the two existing fixture sources in place, add one validator for their cross-file invariants, use a reproducible PowerShell generator to stage Doubao images before copying stable filenames into `static/demo`, and route H5 npm scripts through a small cross-platform launcher.

**Tech Stack:** uni-app, Vue 3, Pinia, Vite 5, Node.js, PowerShell, uniCloud Aliyun, Doubao Seedream image generation, Playwright/Chrome for rendered verification.

---

## File Map

- Create `scripts/validate-demo-fixtures.mjs`: parse source fixtures, verify counts, relationships, credential removal, and static file existence.
- Create `scripts/run-uni.mjs`: set `UNI_INPUT_DIR` to the repository root and launch the existing uni CLI.
- Create `scripts/generate-demo-images.ps1`: hold the approved prompts, call the installed Doubao skill, and rename successful outputs to stable asset names.
- Create `scripts/install-demo-images.mjs`: resize and palette-compress approved originals into app-ready PNG assets.
- Modify `package.json`: route H5 dev/build scripts through `scripts/run-uni.mjs` and add `validate:demo`.
- Modify `mock/data.js`: expand local catalog and seed representative orders, after-sales, reviews, messages, coupons, and operation logs without overwriting existing storage.
- Modify `uniCloud-aliyun/cloudfunctions/init-data/index.js`: mirror catalog fixtures and upsert user-bound demo records.
- Modify `config/runtime.js`: remove the literal cloud client secret and gate manual cloud setup on an environment secret.
- Replace assets under `static/demo`: 24 square product images and 2 landscape banners.
- Modify `README.md`: document root npm startup, mock fallback, and required cloud-secret environment variable.

### Task 1: Add Failing Fixture Validation

**Files:**
- Create: `scripts/validate-demo-fixtures.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a source-level invariant validator**

The validator must read `mock/data.js`, `uniCloud-aliyun/cloudfunctions/init-data/index.js`, `config/runtime.js`, and `static/demo`. It must extract fixed IDs and asset paths, then assert:

```js
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

assert.equal(new Set(mockGoodsIds).size, expected.goods)
assert.deepEqual(new Set(mockGoodsIds), new Set(cloudGoodsIds))
assert.deepEqual(new Set(mockSkuIds), new Set(cloudSkuIds))
assert.ok(mockSkuGoodsIds.every(id => mockGoodsIds.includes(id)))
assert.ok(mockGoodsCategoryIds.every(id => categoryIds.includes(id)))
assert.ok(assetPaths.every(path => existsSync(resolve(root, path.replace(/^\//, '')))))
assert.doesNotMatch(runtimeSource, /clientSecret:\s*env\.[A-Z0-9_]+\s*\|\|\s*['"][^'"]+['"]/)
```

Use `node:assert/strict`, `node:fs`, and stable regexes anchored to `_id`, `goods_id`, `category_id`, and `/static/demo/` fields. Print a compact JSON summary on success and all failed invariants on failure.

- [ ] **Step 2: Add the npm validation command**

```json
"validate:demo": "node scripts/validate-demo-fixtures.mjs"
```

- [ ] **Step 3: Run validation and confirm the baseline fails**

Run: `npm run validate:demo`

Expected: non-zero exit showing current counts such as 4 goods, 8 SKUs, 1 banner, and the committed client secret.

- [ ] **Step 4: Record the checkpoint**

There is no Git repository. Record the failing command and output summary in the task log instead of committing.

### Task 2: Expand Local Mock Fixtures

**Files:**
- Modify: `mock/data.js`
- Verify: `mock/service.js`

- [ ] **Step 1: Add categories and eight goods**

Add `sub-lighting`, `sub-bags`, `sub-power`, `sub-keyboard`, and `sub-drink`. Add these goods with stable IDs and two image paths each:

| ID | Name | Category / subcategory | Price | Brand |
| --- | --- | --- | ---: | --- |
| `goods-lamp` | 柔光便携氛围灯 | `cat-life/sub-lighting` | 169 | NEST |
| `goods-tote` | 城市通勤帆布托特包 | `cat-wear/sub-bags` | 139 | LUMA |
| `goods-charger` | 65W 氮化镓充电器 | `cat-digital/sub-power` | 199 | MORI |
| `goods-keyboard` | 静音便携机械键盘 | `cat-digital/sub-keyboard` | 359 | MORI |
| `goods-bodywash` | 氨基酸清润沐浴露 | `cat-beauty/sub-care` | 79 | AMI |
| `goods-handcream` | 植萃修护护手霜 | `cat-beauty/sub-care` | 59 | AMI |
| `goods-granola` | 烘焙坚果燕麦脆 | `cat-food/sub-snack` | 49 | FIELD |
| `goods-tea` | 白桃乌龙冷泡茶 | `cat-food/sub-drink` | 39 | FIELD |

Update the four existing goods to use `goods-<id>-main.png` and `goods-<id>-detail.png`. Every new good must include subtitle, price, original price, category IDs, brand, stock, sales, status, sort where used, `is_new`, `is_hot`, `is_recommend`, three tags, and a concrete detail paragraph.

- [ ] **Step 2: Add sixteen SKUs**

Add two SKUs per new good. Use these dimensions: lamp color, tote color, charger color, keyboard layout/color, body wash fragrance, hand cream fragrance, granola flavor, and tea flavor/count. SKU stock totals must equal each good's `stock`.

- [ ] **Step 3: Expand support fixtures**

Create arrays for 12 evaluations, 3 demo orders, 1 after-sale, and 4 operation logs. Expand coupons to 3 and messages to 4. Orders must cover statuses `pendingPay`, `pendingReceive`, and `completed`; their item snapshots must reference valid goods/SKUs and image paths. The after-sale must reference the completed order and one of its goods.

- [ ] **Step 4: Seed only missing local storage keys**

Replace current empty defaults with fixture arrays while preserving write-if-empty semantics:

```js
if (!uni.getStorageSync(STORAGE_KEYS.orders)) {
  uni.setStorageSync(STORAGE_KEYS.orders, demoOrders)
}
if (!uni.getStorageSync(STORAGE_KEYS.afterSales)) {
  uni.setStorageSync(STORAGE_KEYS.afterSales, demoAfterSales)
}
if (!uni.getStorageSync(STORAGE_KEYS.evaluations)) {
  uni.setStorageSync(STORAGE_KEYS.evaluations, evaluations)
}
if (!uni.getStorageSync(STORAGE_KEYS.operationLogs)) {
  uni.setStorageSync(STORAGE_KEYS.operationLogs, operationLogs)
}
```

- [ ] **Step 5: Run syntax and partial validation**

Run: `node --check mock/data.js`

Expected: exit 0.

Run: `npm run validate:demo`

Expected: local fixture count checks pass; cloud parity, assets, and credential checks still fail.

### Task 3: Mirror Fixtures in uniCloud Seed Data

**Files:**
- Modify: `uniCloud-aliyun/cloudfunctions/init-data/index.js`

- [ ] **Step 1: Mirror catalog fixtures exactly**

Add the same category, good, SKU, banner, coupon, message, and evaluation IDs and values used locally. Keep cloud-only `sort`, `status`, `create_date`, and `update_date` behavior.

- [ ] **Step 2: Add user-bound fixture builders**

After resolving `demoUser.uid`, construct three orders and one after-sale by adding `user_id: demoUser.uid` to the approved local snapshots. Upsert them with fixed IDs `order-demo-pending`, `order-demo-shipped`, `order-demo-completed`, and `aftersale-demo-completed`.

- [ ] **Step 3: Expand operation logs and reset IDs**

Add four fixed operation logs. Include order and after-sale fixed IDs in `fixedIds`; continue removing user-owned order and after-sale records during reset.

- [ ] **Step 4: Upsert the new records during seed**

```js
await upsertMany('order', buildDemoOrders(demoUser.uid))
await upsertMany('after_sale', buildDemoAfterSales(demoUser.uid))
```

Call these after the demo user and catalog goods exist.

- [ ] **Step 5: Verify syntax and parity**

Run: `node --check uniCloud-aliyun/cloudfunctions/init-data/index.js`

Expected: exit 0.

Run: `npm run validate:demo`

Expected: fixture count and ID parity checks pass; assets and credential checks remain failing.

### Task 4: Fix Root H5 Startup and Remove the Secret

**Files:**
- Create: `scripts/run-uni.mjs`
- Modify: `package.json`
- Modify: `config/runtime.js`
- Modify: `README.md`

- [ ] **Step 1: Add a cross-platform uni launcher**

```js
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = resolve(root, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js')
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, UNI_INPUT_DIR: root },
  stdio: 'inherit'
})
child.on('exit', code => process.exit(code ?? 1))
child.on('error', error => {
  console.error(error.message)
  process.exit(1)
})
```

- [ ] **Step 2: Route H5 scripts through the launcher**

```json
"dev:h5": "node scripts/run-uni.mjs",
"build:h5": "node scripts/run-uni.mjs build"
```

- [ ] **Step 3: Remove the literal secret and gate manual cloud initialization**

Set demo `clientSecret` to `env.UNI_CLOUD_DEMO_CLIENT_SECRET || ''`. Update `shouldUseManualDemoCloud()` to require `runtimeConfig.cloudSpace.clientSecret`. Do not log the secret.

- [ ] **Step 4: Document startup and credential behavior**

Document `npm run dev:h5 -- --host 127.0.0.1 --port 5188`, `npm run build:h5`, local mock fallback, and `UNI_CLOUD_DEMO_CLIENT_SECRET` for explicit cloud preview. Add a warning that the removed secret must be rotated externally.

- [ ] **Step 5: Verify startup and secret removal**

Run: `npm run build:h5`

Expected: exit 0 without manually setting `UNI_INPUT_DIR`.

Run: `rg -n "clientSecret:\s*env\.[A-Z0-9_]+\s*\|\|\s*['\"][^'\"]+" config README.md`

Expected: no committed literal secret match.

### Task 5: Generate and Install 26 Doubao Images

**Files:**
- Create: `scripts/generate-demo-images.ps1`
- Create: `scripts/install-demo-images.mjs`
- Create/replace: `static/demo/banner-living.png`
- Create/replace: `static/demo/banner-tech.png`
- Create/replace: `static/demo/goods-*-main.png`
- Create/replace: `static/demo/goods-*-detail.png`

- [ ] **Step 1: Run the required credential dry-run**

Run:

```powershell
python "$env:USERPROFILE\.codex\skills\doubao-imagegen\scripts\doubao_imagegen.py" --dry-run
```

Expected: JSON with `ok: true`, the selected model, endpoint, and a credential source label; no raw credential output.

- [ ] **Step 2: Add the generation manifest**

The PowerShell script must define 26 records with `Name`, `Size`, and `Prompt`. Every prompt must include the shared requirements: realistic boutique e-commerce photography, inspectable product, soft high-key light, restrained styling, no text, no letters, no logo, no watermark, and no collage. Product prompts use `1920x1920`; banner prompts use `2560x1440` and reserve dark, uncluttered lower-left space for white overlay copy.

- [ ] **Step 3: Generate each record into staging**

For each record, call the bundled skill with `--n 1 --no-watermark --out-dir <staging>`. Parse the returned JSON, verify one output exists, and copy it to `<staging>/final/<Name>`. Stop on failure and leave `static/demo` untouched.

- [ ] **Step 4: Inspect all generated outputs**

Create contact sheets for square products and banners outside the repository. Reject images containing text, malformed products, unclear subjects, inconsistent framing, or unusable lower-left banner copy space. Regenerate only rejected names with refined prompts.

- [ ] **Step 5: Optimize and copy approved assets into the app**

Run `npm run images:install` to resize square products to `960x960`, banners to `1600x900`, and palette-compress all 26 PNG files into `static/demo`. Provider metadata and high-resolution originals stay in staging and are not shipped.

- [ ] **Step 6: Run asset and fixture validation**

Run: `npm run validate:demo`

Expected: all count, relationship, credential, and asset checks pass.

### Task 6: Build and Rendered Regression

**Files:**
- Verify: all changed files and generated assets
- Store temporary screenshots outside the repository

- [ ] **Step 1: Run static verification**

Run:

```powershell
node --check mock/data.js
node --check config/runtime.js
node --check scripts/run-uni.mjs
node --check scripts/validate-demo-fixtures.mjs
node --check uniCloud-aliyun/cloudfunctions/init-data/index.js
npm run validate:demo
npm run build:h5
```

Expected: every command exits 0.

- [ ] **Step 2: Start H5 on an unused fixed port**

Run: `npm run dev:h5 -- --host 127.0.0.1 --port 5188`

Expected: Vite reports `http://127.0.0.1:5188/` ready without manual environment variables.

- [ ] **Step 3: Check mobile and desktop flows**

At `390x844` and `1280x900`, verify home, category, all-goods list, one product detail, order list, and admin overview/report. Check page identity, meaningful DOM, no framework overlay, relevant console errors, broken images, clipping, overlap, and empty demo states.

- [ ] **Step 4: Exercise a product interaction**

Follow home product card -> product detail -> open SKU panel -> select a different SKU. Verify route, gallery count 2, SKU count at least 2, and coherent displayed price and stock.

- [ ] **Step 5: Capture evidence and stop the server**

Save final mobile home, mobile detail, desktop home, and desktop admin screenshots outside the repository. Stop the dev-server process and report any residual warning separately from application errors.

- [ ] **Step 6: Record the final checkpoint**

Because the directory is not a Git repository, provide a changed-file inventory and exact verification results instead of a commit hash.
