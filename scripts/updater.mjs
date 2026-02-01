import yaml from 'yaml'
import { readFileSync, writeFileSync } from 'fs'

const pkg = readFileSync('package.json', 'utf-8')
let changelog = readFileSync('changelog.md', 'utf-8')
const { version } = JSON.parse(pkg)
const downloadUrl = `https://github.com/jiangzhiyan00/sparkle/releases/download/v${version}`
const latest = {
  version,
  changelog
}

if (process.env.SKIP_CHANGELOG !== '1') {
  changelog += '\n### 下载地址：\n\n#### Windows10/11：\n\n'
  changelog += `- 安装版：[64位](${downloadUrl}/sparkle-windows-${version}-x64-setup.exe)\n\n`
  changelog += '\n#### macOS 11+：\n\n'
  changelog += `- PKG：[Apple Silicon](${downloadUrl}/sparkle-macos-${version}-arm64.pkg)\n\n`
  changelog += '\n#### Linux：\n\n'
}
writeFileSync('latest.yml', yaml.stringify(latest))
writeFileSync('changelog.md', changelog)
