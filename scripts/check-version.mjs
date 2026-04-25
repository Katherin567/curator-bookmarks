import fs from 'node:fs/promises'

const files = {
  packageJson: 'package.json',
  packageLock: 'package-lock.json',
  manifest: 'src/manifest.json'
}

const [packageJson, packageLock, manifest] = await Promise.all(
  Object.values(files).map((file) => readJson(file))
)

const versions = [
  ['package.json', packageJson.version],
  ['package-lock.json', packageLock.version],
  ['package-lock root package', packageLock.packages?.['']?.version],
  ['src/manifest.json', manifest.version]
]

const expectedVersion = packageJson.version
const mismatches = versions.filter(([, version]) => version !== expectedVersion)

if (mismatches.length) {
  console.error(`Version mismatch. Expected ${expectedVersion}.`)
  for (const [label, version] of mismatches) {
    console.error(`- ${label}: ${version || '(missing)'}`)
  }
  process.exit(1)
}

console.log(`Version check passed: ${expectedVersion}`)

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}
