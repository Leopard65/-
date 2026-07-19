param(
  [string[]]$Names = @(),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$skillScript = Join-Path $env:USERPROFILE '.codex\skills\doubao-imagegen\scripts\doubao_imagegen.py'
$stagingRoot = Join-Path (Split-Path -Parent $root) 'generated-assets\doubao-staging'
$rawDir = Join-Path $stagingRoot 'raw'
$finalDir = Join-Path $stagingRoot 'final'
New-Item -ItemType Directory -Force -Path $rawDir, $finalDir | Out-Null

$sharedMain = 'Premium boutique e-commerce product photography for a refined Chinese lifestyle store. The product must be real, physically plausible, clearly inspectable and the unmistakable subject. Soft high-key daylight, clean editorial styling, subtle natural shadow, generous breathing room, centered square composition, sharp material detail, realistic commercial photography. No people, no hands, no text, no Chinese characters, no letters, no numbers, no logo, no brand mark, no watermark, no collage, no split screen, no border.'
$sharedDetail = 'Premium boutique e-commerce lifestyle detail photography for a refined Chinese lifestyle store. Show the same product in a believable real-use context or a distinct close angle while keeping it clearly identifiable and inspectable. Soft natural daylight, restrained props, realistic materials, calm editorial composition, sharp product detail. No visible faces, no text, no Chinese characters, no letters, no numbers, no logo, no brand mark, no watermark, no collage, no split screen, no border.'

$records = @(
  [pscustomobject]@{ Name='goods-shirt-main.png'; Size='1920x1920'; Prompt="$sharedMain A premium cloud-soft short-sleeve cotton T-shirt in mist white, neatly laid flat with natural fabric drape, warm blush-white seamless background, subtle coral accent paper shape, front view, collar and sleeve construction clearly visible." },
  [pscustomobject]@{ Name='goods-shirt-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Mist-white short-sleeve cotton T-shirt hanging on a simple pale wood hanger beside a sunlit neutral wall, close enough to reveal fine cotton texture and reinforced collar, soft coral fabric accent in the far background." },
  [pscustomobject]@{ Name='goods-earbuds-main.png'; Size='1920x1920'; Prompt="$sharedMain Compact true wireless half-in-ear earbuds with an open pebble-shaped charging case, ceramic white finish, pale powder-blue seamless background, restrained cobalt accent, three-quarter product angle, both earbuds and case clearly visible." },
  [pscustomobject]@{ Name='goods-earbuds-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Ceramic-white wireless earbuds and charging case placed beside a closed notebook on a quiet commuter desk, pale blue daylight, macro emphasis on smooth case hinge and comfortable earbud shape." },
  [pscustomobject]@{ Name='goods-cup-main.png'; Size='1920x1920'; Prompt="$sharedMain Minimal 480ml cylindrical insulated travel tumbler in muted pine green with a secure matching lid, warm off-white seamless background, pale mineral-green accent surface, upright three-quarter angle, lid and drinking rim clearly shown." },
  [pscustomobject]@{ Name='goods-cup-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Muted pine-green insulated tumbler standing in a clean canvas commuter tote beside a folded linen scarf, morning window light, close product focus that clearly shows the leak-resistant lid and matte metal finish." },
  [pscustomobject]@{ Name='goods-towel-main.png'; Size='1920x1920'; Prompt="$sharedMain A coordinated pair of thick premium cotton bath towels, one warm ivory and one muted apricot, neatly folded with visible plush loops, soft cream seamless background, restrained amber accent, tactile fibers in sharp detail." },
  [pscustomobject]@{ Name='goods-towel-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Ivory and muted-apricot cotton bath towels casually stacked on a pale stone bathroom bench, soft diffused daylight, close angle showing dense loops and fluffy edges, minimal ceramic tray as a restrained prop." },
  [pscustomobject]@{ Name='goods-lamp-main.png'; Size='1920x1920'; Prompt="$sharedMain Small portable rechargeable ambient table lamp with a rounded frosted cream shade, short matte moss-green base and a discreet touch control, warm off-white seamless background, pale green accent plane, lamp softly glowing, full object clearly visible." },
  [pscustomobject]@{ Name='goods-lamp-detail.png'; Size='1920x1920'; Prompt="$sharedDetail The same portable cream-and-moss-green ambient lamp glowing on a compact bedside table beside a closed book and clear water glass at blue hour, calm realistic bedroom context, product remains bright and clearly defined." },
  [pscustomobject]@{ Name='goods-tote-main.png'; Size='1920x1920'; Prompt="$sharedMain Structured natural ecru canvas commuter tote bag with wide shoulder straps, subtle forest-green base panel, open enough to reveal organized inner compartments without branded objects, warm white seamless background, front three-quarter angle." },
  [pscustomobject]@{ Name='goods-tote-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Ecru canvas commuter tote on a pale wood chair near a bright entryway, a blank notebook and stainless bottle visible in separate inner compartments, close realistic view of thick canvas weave and reinforced straps." },
  [pscustomobject]@{ Name='goods-charger-main.png'; Size='1920x1920'; Prompt="$sharedMain Compact 65W gallium nitride wall charger in matte ceramic white with folding plug, two USB-C ports and one USB-A port visible as plain unlabeled openings, powder-blue background with small coral accent, clean three-quarter product angle." },
  [pscustomobject]@{ Name='goods-charger-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Matte white compact three-port wall charger beside a slim laptop and coiled neutral charging cable on a tidy travel desk, soft morning light, ports and folding plug construction clearly inspectable, no visible screen content." },
  [pscustomobject]@{ Name='goods-keyboard-main.png'; Size='1920x1920'; Prompt="$sharedMain Compact 75 percent wireless mechanical keyboard with rounded cream keycaps and a few muted forest-green accent keycaps, no printed legends on any keys, pale mineral-green seamless background, top three-quarter view showing complete layout." },
  [pscustomobject]@{ Name='goods-keyboard-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Compact cream and forest-green wireless mechanical keyboard on a quiet pale-wood home office desk beside a blank notebook, low side angle emphasizing keycap profile and solid build, no monitor text or key legends." },
  [pscustomobject]@{ Name='goods-bodywash-main.png'; Size='1920x1920'; Prompt="$sharedMain Elegant 500ml translucent sage-green body wash pump bottle with a completely blank frosted label area, no writing, pale warm-white seamless background, fresh green leaf and smooth river pebble as restrained props, full bottle clearly visible." },
  [pscustomobject]@{ Name='goods-bodywash-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Translucent sage-green pump body wash bottle on a pale stone shower shelf with soft foam, water droplets and one fresh green leaf, bright diffused bathroom light, blank package with absolutely no writing." },
  [pscustomobject]@{ Name='goods-handcream-main.png'; Size='1920x1920'; Prompt="$sharedMain Premium soft-metal hand cream tube in muted lavender with a cream cap and completely blank packaging, gently curved on a warm white surface, pale lilac backdrop with tiny dried botanical sprig, product fully visible." },
  [pscustomobject]@{ Name='goods-handcream-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Muted-lavender blank hand cream tube beside a folded linen handkerchief on a clean office desk, cap open with a small neat bead of cream, soft daylight, close texture-focused product composition, no hands." },
  [pscustomobject]@{ Name='goods-granola-main.png'; Size='1920x1920'; Prompt="$sharedMain Clear resealable pouch filled with toasted oat clusters, almonds and pumpkin seeds, completely blank warm-yellow label panel without writing, a small ceramic bowl of granola beside it, cream seamless background, golden daylight." },
  [pscustomobject]@{ Name='goods-granola-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Toasted nut granola served in a simple white bowl with plain yogurt and a few berries on a bright breakfast table, the same blank resealable pouch visible behind it, crisp oat and nut texture, soft morning light." },
  [pscustomobject]@{ Name='goods-tea-main.png'; Size='1920x1920'; Prompt="$sharedMain Minimal cream tea box with completely blank peach-colored panel, several translucent pyramid tea sachets and dried peach slices arranged beside it, pale peach and warm-white seamless background, refined real product photography, no writing anywhere." },
  [pscustomobject]@{ Name='goods-tea-detail.png'; Size='1920x1920'; Prompt="$sharedDetail Clear glass carafe of pale amber cold-brew oolong tea with one pyramid tea sachet visible, peach slices and the same blank cream tea box nearby on a sunlit table, refreshing condensation, calm summer palette." },
  [pscustomobject]@{ Name='banner-living.png'; Size='2560x1440'; Prompt='Wide cinematic boutique lifestyle retail photograph, 16:9. A calm sunlit apartment scene with a portable cream-and-green lamp, folded ivory towel, pine-green insulated tumbler, ecru canvas tote and small blank lavender hand-cream tube arranged naturally on the right two-thirds. Warm white plaster wall, pale wood and restrained coral plus mineral-green accents. Keep the lower-left third deliberately uncluttered and slightly darker with a plain moss-green tabletop/wall area so white interface copy remains readable. Real inspectable products, premium editorial photography, no people, no text, no letters, no numbers, no logos, no watermark, no collage, no gradient, no bokeh.' },
  [pscustomobject]@{ Name='banner-tech.png'; Size='2560x1440'; Prompt='Wide cinematic boutique technology retail photograph, 16:9. A compact cream mechanical keyboard with blank keycaps, ceramic-white wireless earbuds and a small white three-port charger arranged on a refined commuter desk across the right two-thirds, with a closed blank notebook and coiled cable. Powder-blue daylight with restrained coral accent and natural shadow. Keep the lower-left third deliberately uncluttered and slightly darker with a plain deep teal desk surface so white interface copy remains readable. Real inspectable products, no visible screens, no text, no letters, no numbers, no logos, no watermark, no collage, no gradient, no bokeh.' }
)

if ($Names.Count) {
  $records = $records | Where-Object { $Names -contains $_.Name }
  if (-not $records) { throw "No requested image names matched the generation manifest." }
}

$negative = 'text, letters, Chinese characters, numbers, logo, brand mark, watermark, signature, caption, label writing, poster, collage, split screen, malformed product, duplicate product, deformed object, blurry subject, low resolution'
$completed = 0
foreach ($record in $records) {
  $destination = Join-Path $finalDir $record.Name
  if ((Test-Path $destination) -and -not $Force) {
    Write-Host "SKIP $($record.Name)"
    $completed += 1
    continue
  }

  Write-Host "GENERATE $($record.Name) [$($record.Size)]"
  $rawOutput = & python $skillScript --prompt $record.Prompt --negative-prompt $negative --size $record.Size --n 1 --no-watermark --out-dir $rawDir 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($rawOutput -join [Environment]::NewLine) }
  $result = ($rawOutput -join [Environment]::NewLine) | ConvertFrom-Json
  if (-not $result.ok -or $result.files.Count -ne 1) { throw "Generation returned no usable file for $($record.Name)." }

  $source = [string]$result.files[0]
  if (-not (Test-Path $source)) { throw "Generated file does not exist: $source" }
  $image = [System.Drawing.Image]::FromFile($source)
  try {
    $image.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $image.Dispose()
  }
  $completed += 1
  Write-Host "SAVED $($record.Name) ($completed/$($records.Count))"
}

Write-Host "COMPLETE $completed image(s) in $finalDir"
