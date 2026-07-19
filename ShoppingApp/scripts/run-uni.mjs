import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = resolve(root, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js')
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, UNI_INPUT_DIR: root },
  stdio: 'inherit'
})

child.on('error', error => {
  console.error(error.message)
  process.exit(1)
})

child.on('exit', code => {
  process.exit(code ?? 1)
})
