# Demo Content and Image Refresh Design

## Goal

Turn the current placeholder-heavy demo into a credible boutique shopping experience while preserving the existing uni-app architecture and the five current top-level categories. Local mock mode and uniCloud seed mode must expose equivalent catalog and supporting demo data.

## Scope

- Expand the catalog from 4 to 12 goods and from 8 to 24 SKUs.
- Replace every placeholder banner, category image, and product image used by the catalog.
- Give every product a unique square main image and a unique square detail image.
- Expand supporting demo records so customer and admin views demonstrate non-empty workflows.
- Fix direct npm H5 startup for the root-layout uni-app project.
- Remove the committed demo cloud client secret and retain an environment-variable-only cloud path with local mock fallback.
- Validate H5 build, data invariants, static asset references, desktop rendering, mobile rendering, and a product-detail interaction.

No page redesign, database schema change, real payment, real logistics, or real push integration is included.

## Catalog Design

The five existing top-level categories remain unchanged. New subcategories are added only where they make the catalog easier to browse.

| Category | Existing goods | New goods | Result |
| --- | --- | --- | --- |
| 生活方式 | 便携保温杯、柔软亲肤浴巾套装 | 柔光便携氛围灯 | 3 goods |
| 衣橱精选 | 云朵感基础款短袖 T 恤 | 城市通勤帆布托特包 | 2 goods |
| 轻数码 | 轻巧无线蓝牙耳机 | 65W 氮化镓充电器、静音便携机械键盘 | 3 goods |
| 个护美妆 | 无 | 氨基酸清润沐浴露、植萃修护护手霜 | 2 goods |
| 风味食品 | 无 | 烘焙坚果燕麦脆、白桃乌龙冷泡茶 | 2 goods |

New subcategories:

- `sub-lighting`: 灯具, parent `cat-life`
- `sub-bags`: 包袋, parent `cat-wear`
- `sub-power`: 充电设备, parent `cat-digital`
- `sub-keyboard`: 键盘, parent `cat-digital`
- `sub-drink`: 茶饮, parent `cat-food`

Each new good has two SKUs with meaningful color, capacity, fragrance, flavor, or layout differences. Existing SKUs remain, producing 24 SKUs in total. Prices, stock, sales, tags, subtitles, and descriptions use the existing field contracts and realistic but fictional values.

## Supporting Demo Data

Both `mock/data.js` and `uniCloud-aliyun/cloudfunctions/init-data/index.js` will contain equivalent fixtures:

- 2 home banners.
- 12 published goods and 24 SKUs.
- 3 coupons covering newcomer, threshold discount, and category promotion use cases.
- 4 messages covering order, promotion, system, and coupon states.
- 12 product evaluations, one per product, with varied names, ratings, and copy.
- 3 orders covering pending payment, shipped, and completed states.
- 1 after-sale record tied to the completed order.
- 4 operation logs that make the admin activity and report surfaces non-empty.
- The existing address, favorite, user coupon, and experience account remain.

Local storage seeding must not overwrite an existing user's data. The current write-if-empty behavior remains. uniCloud seeding continues to upsert fixed demo IDs and reset only fixed demo data or records belonging to the demo user.

## Image Plan

Use the requested `doubao-imagegen` skill with Seedream. Run the required dry-run before the first generation request.

Generate 26 images:

- 24 square product assets: one main image and one detail image for each of the 12 goods, at `1920x1920`.
- 2 landscape home banners at `2560x1440`, composed to allow readable white overlay text in the existing lower-left copy area.

Product main images use realistic boutique e-commerce photography: clearly inspectable product, soft high-key light, restrained props, no people where they distract from the product, no text, no logo, no watermark, and a square crop that remains readable in two-column cards. Detail images use a different angle or a restrained real-use context while keeping the product recognizable.

The collection should feel coherent without becoming monochromatic. Background and accent families rotate through warm white, pale mineral green, soft coral, powder blue, muted yellow, and light lilac. The existing green and brass interface accents remain the UI anchor.

Category icons reuse the most representative generated square product image for that category. This avoids adding five low-value bespoke assets and keeps the approved 26-image budget.

Generation occurs in a staging directory. Only successful, visually inspected images are copied into `static/demo`. Application data will reference stable ASCII filenames such as `goods-shirt-main.png`, `goods-shirt-detail.png`, `goods-lamp-main.png`, and `banner-living.png`. Provider metadata remains outside the shipped static directory.

## Data Flow

1. `App.vue` seeds local storage only when fixture keys are absent.
2. `api/client.js` uses uniCloud when explicitly configured and otherwise falls back to `mock/service.js`.
3. `mock/service.js` reads the expanded local fixture arrays for home, category, list, detail, orders, after-sales, messages, and admin reports.
4. The `init-data` cloud function upserts the same fixed catalog fixtures, then creates user-bound order and service records using the resolved demo user ID.
5. UI pages continue consuming the existing API response shapes; no page contract changes are introduced.

## H5 and Credential Fixes

Add a small cross-platform Node launcher that sets `UNI_INPUT_DIR` to the project root before invoking the uni CLI. Route `dev:h5` and `build:h5` through this launcher so npm commands work without moving the application into `src`.

Remove the literal demo `clientSecret` from `config/runtime.js`. The demo cloud client is initialized only when `UNI_CLOUD_DEMO_CLIENT_SECRET` is present. Without it, development remains usable through local mock fallback. The previously committed secret must be rotated in the Aliyun/uniCloud console because deleting it from the repository does not revoke it.

## Error Handling

- A failed image generation leaves the current application reference unchanged until a replacement image passes inspection.
- Missing generated files fail the asset-reference validation before build verification.
- Cloud initialization continues returning the current structured error responses and retrying resource-busy failures.
- H5 without a cloud secret must not fail startup; it must render using local mock data.
- Fixture IDs remain stable so seed and reset are repeatable.

## Verification

Automated checks:

- Parse all JSON and database schema files.
- Run `node --check` on changed JavaScript and cloud-function files.
- Validate exact fixture counts, unique IDs, SKU-to-good relationships, category relationships, order references, and existence of every local image path.
- Run `npm run build:h5` without manually setting `UNI_INPUT_DIR`.

Rendered checks:

- Start `npm run dev:h5` on an unused localhost port.
- Verify page identity, meaningful DOM content, absence of framework overlays, console health, and successful image loading.
- Check home, category, all-goods list, one product detail, order list, and admin overview/report surfaces.
- Use `390x844` mobile and `1280x900` desktop viewports.
- Exercise home product card to product detail, open SKU selection, switch one SKU, and verify the price/stock state remains coherent.
- Capture final mobile and desktop screenshots for the delivery report.

## Acceptance Criteria

- No catalog-facing `DEMO` placeholder image remains referenced.
- Home displays 2 banners, 5 categories, and 12 available products through the full list.
- Every top-level category has at least 2 goods and every product has 2 unique gallery images.
- Local mock and cloud seed catalogs have matching IDs and counts.
- Customer and admin demo workflows have representative non-empty states.
- `npm run dev:h5` and `npm run build:h5` work from the project root.
- No cloud client secret remains committed in source.
- Mobile and desktop visual checks show no incoherent overlap, clipping, blank page, broken image, or relevant console error.
