import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

export function validateVersion(version) {
  const number = '(0|[1-9]\\d*)';
  const identifier = '(?:0|[1-9]\\d*|[\\da-zA-Z-]*[a-zA-Z-][\\da-zA-Z-]*)';
  if (typeof version !== 'string' || !new RegExp(`^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?$`).test(version)) {
    throw new Error('Use a release version such as 0.3.0 or 0.3.0-beta.1 in package.json (no build metadata).');
  }
  return version;
}

export function releasePlan({ version, event, ref, publish = 'none' }) {
  validateVersion(version);
  let channel = 'none';
  if (event === 'push' && ref === 'refs/heads/main') channel = 'development';
  if (event === 'push' && ref?.startsWith('refs/tags/v')) {
    if (ref !== `refs/tags/v${version}`) throw new Error(`Tag must match package.json: expected v${version}, received ${ref}.`);
    channel = 'versioned';
  }
  if (event === 'workflow_dispatch') {
    if (!['none', 'development', 'versioned'].includes(publish)) throw new Error('Unknown release channel.');
    if (publish !== 'none' && ref !== 'refs/heads/main') throw new Error('Publish from main. Choose “none” to build a feature branch without publishing.');
    channel = publish;
  }
  return { channel, version, tag: channel === 'development' ? 'development' : channel === 'versioned' ? `v${version}` : '' };
}

export function artifactNames(version, platform = 'all') {
  validateVersion(version);
  const prefix = `WyrmrestEditor-${version}`;
  const names = {
    windows: [`${prefix}-win-x64-setup.exe`, `${prefix}-win-x64-portable.exe`],
    linux: [`${prefix}-linux-x64.AppImage`, `${prefix}-linux-x64.deb`, `${prefix}-linux-x64.tar.gz`],
    macos: ['x64', 'arm64'].flatMap((arch) => [`${prefix}-mac-${arch}.dmg`, `${prefix}-mac-${arch}.zip`]),
  };
  if (platform === 'native') platform = { win32: 'windows', linux: 'linux', darwin: 'macos' }[process.platform];
  if (platform !== 'all' && !Object.hasOwn(names, platform)) throw new Error(`Unsupported packaging platform: ${platform}`);
  return (platform === 'all' ? Object.values(names).flat() : names[platform]).sort();
}

export function checkArtifacts(directory, version, platform = 'all') {
  return artifactNames(version, platform).map((name) => {
    const file = path.resolve(directory, name);
    const stat = fs.existsSync(file) ? fs.lstatSync(file) : null;
    if (!stat?.isFile() || !stat.size) throw new Error(`Missing or empty installer: ${file}`);
    return file;
  });
}

export async function checksumFile(directory, files, platform = 'all') {
  const lines = [];
  for (const file of files) {
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    lines.push(`${hash.digest('hex')}  ${path.basename(file)}`);
  }
  const suffix = platform === 'all' ? '' : `-${platform === 'native' ? process.platform : platform}`;
  const output = path.resolve(directory, `SHA256SUMS${suffix}.txt`);
  fs.writeFileSync(output, `${lines.join('\n')}\n`);
  return output;
}

export function packageVersion() {
  const version = validateVersion(JSON.parse(fs.readFileSync('package.json', 'utf8')).version);
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  if (lock.version !== version || lock.packages?.['']?.version !== version) throw new Error('package.json and package-lock.json versions differ. Use npm version to update both.');
  return version;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    const { values } = parseArgs({ args: process.argv.slice(3), options: { assets: { type: 'string', default: 'release' }, platform: { type: 'string', default: 'all' } } });
    if (command === 'plan') {
      const plan = releasePlan({ version: packageVersion(), event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, publish: process.env.RELEASE_CHANNEL || 'none' });
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(plan).map(([key, value]) => `${key}=${value}\n`).join(''));
      console.log(JSON.stringify(plan, null, 2));
    } else if (command === 'check') {
      console.log(checkArtifacts(values.assets, packageVersion(), values.platform).join('\n'));
    } else throw new Error('Usage: node scripts/release-utils.mjs plan | check [--platform windows|linux|macos|all] [--assets release]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
