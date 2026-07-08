const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'output');
const packageName = 'supermarket-system-demo';
const stagingDir = path.join(outputDir, packageName);
const zipPath = path.join(outputDir, `${packageName}.zip`);

function remove(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(relative) {
  const source = path.join(root, relative);
  const target = path.join(stagingDir, relative);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function shouldSkip(name) {
  return (
    name === 'node_modules' ||
    name === 'supermarket.db' ||
    name.endsWith('.db') ||
    name.endsWith('.db-shm') ||
    name.endsWith('.db-wal') ||
    name.endsWith('.log')
  );
}

function copyDir(relative) {
  const source = path.join(root, relative);
  const target = path.join(stagingDir, relative);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) copyDir(childRelative);
    else copyFile(childRelative);
  }
}

function writeDemoFiles() {
  fs.writeFileSync(path.join(stagingDir, 'START_DEMO.ps1'), [
    "$ErrorActionPreference = 'Stop'",
    "if (-not (Test-Path 'node_modules')) { npm install --omit=dev }",
    "$env:PORT = '3000'",
    "node server/index.js"
  ].join('\r\n'));

  fs.writeFileSync(path.join(stagingDir, '演示包说明.md'), [
    '# 超市管理系统演示包',
    '',
    '## 启动方式',
    '',
    '1. 安装 Node.js 18 或更高版本。',
    '2. 在本目录打开 PowerShell。',
    '3. 执行 `powershell -ExecutionPolicy Bypass -File .\\START_DEMO.ps1`。',
    '4. 浏览器打开 `http://localhost:3000`。',
    '',
    '默认账号：管理员 `admin / admin123`，收银员 `cashier / cashier123`。',
    '',
    '## 说明',
    '',
    '- 演示包内包含已构建的 `dist/` 前端产物，后端会直接托管页面。',
    '- 首次启动会自动创建 SQLite 数据库和基础演示数据。',
    '- 如需更丰富的 30 天经营数据，可在启动前运行 `npm run seed:demo`。'
  ].join('\r\n'));
}

remove(stagingDir);
remove(zipPath);
fs.mkdirSync(stagingDir, { recursive: true });

copyFile('package.json');
copyFile('package-lock.json');
copyFile('.env.example');
copyFile('README.md');
copyFile('使用说明文档.md');
copyFile('答辩说明.md');
copyFile('index.html');
copyFile('vite.config.js');
copyDir('dist');
copyDir('server');
copyDir('public');
copyDir('docs');
writeDemoFiles();

execFileSync('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  `Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force`
], { stdio: 'inherit' });

console.log(`演示包已生成: ${zipPath}`);
