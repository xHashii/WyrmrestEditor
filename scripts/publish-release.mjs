/** Shared GitHub/local publisher. Builds first; no token or credentials in files. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { checkArtifacts, checksumFile, packageVersion, validateVersion } from './release-utils.mjs';

const runGh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

export async function publishRelease({ channel, directory = 'release', platform = 'all', version, repository, target, summaryFile, gh = runGh }) {
  validateVersion(version);
  if (!['development', 'versioned'].includes(channel)) throw new Error('Choose development or versioned.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(target)) throw new Error('A GitHub owner/repository and full commit SHA are required.');
  if (channel === 'development' && platform !== 'all') throw new Error('The development release requires all three platforms.');
  // Check every expected installer BEFORE creating/updating anything on GitHub.
  const files = checkArtifacts(directory, version, platform);
  const tag = channel === 'development' ? 'development' : `v${version}`;
  const prerelease = channel === 'development' || version.includes('-');
  const api = (endpoint, args = []) => gh(['api', `repos/${repository}/${endpoint}`, ...args]);
  const optional = (endpoint) => {
    try { return JSON.parse(api(endpoint)); }
    catch (error) {
      // Authentication, network and permission failures are NOT “not found”.
      if (String(error.stderr ?? error.message).includes('(HTTP 404)')) return null;
      throw error;
    }
  };

  // Local releases must refer to source already pushed to this same repository.
  api(`commits/${target}`, ['--jq', '.sha']);
  const ref = optional(`git/ref/tags/${tag}`);
  let object = ref?.object;
  for (let depth = 0; object?.type === 'tag' && depth < 10; depth++) object = JSON.parse(api(`git/tags/${object.sha}`)).object;
  if (object && object.type !== 'commit') throw new Error(`Tag ${tag} does not resolve to a commit.`);
  if (channel === 'versioned' && object && object.sha !== target) {
    throw new Error(`${tag} already points to a different commit. Bump the package version; published version tags are never moved.`);
  }
  if (channel === 'development' && object && object.sha !== target) {
    // Matrix jobs can finish out of order. Never replace a newer successful build.
    const comparison = api(`compare/${target}...${object.sha}`, ['--jq', '.status']);
    if (comparison === 'ahead') { console.log('A newer development build is already published; skipping this older run.'); return null; }
    if (comparison !== 'behind') throw new Error('Development history diverged. Refusing to move the release tag across unrelated histories.');
  }
  const existing = optional(`releases/tags/${tag}`);
  if (channel === 'versioned' && existing?.draft && !ref && existing.target_commitish !== target) {
    throw new Error(`Draft ${tag} belongs to a different source commit. Retry its original build or use a new version.`);
  }
  if (existing && !existing.draft && !ref) throw new Error(`Release ${tag} has no source tag. Repair the release tag before uploading binaries.`);
  const checksum = await checksumFile(directory, files, platform);
  const assets = [...files, checksum];
  const title = channel === 'development' ? 'Latest development build' : `Wyrmrest Editor ${version}`;
  const notes = [
    channel === 'development' ? '**Automatically refreshed after successful builds of `main`. This is a development prerelease, not the latest stable release.**' : `Wyrmrest Editor **${version}**.`,
    '', `Source: [${target.slice(0, 12)}](https://github.com/${repository}/commit/${target})`,
    '', platform === 'all' ? 'Includes Windows x64 setup + portable executables, macOS Intel + Apple Silicon DMG/ZIP, and Linux x64 AppImage/DEB/tar.gz.' : `Built locally for ${platform === 'native' ? process.platform : platform}. Other platforms can be added by publishing from the same source commit.`,
    '', 'The desktop app bundles its runtime; Node.js is not needed to run it. Downloads are unsigned unless signing was configured. Windows SmartScreen and macOS Gatekeeper may warn about unsigned applications. Only run builds you trust.',
    '', 'SHA-256 checksums are attached. Your settings and staged SQL changes remain in your workspace; installing a build does not apply database changes.',
  ].join('\n');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-release-'));
  const notesFile = path.join(temporary, 'notes.md');
  fs.writeFileSync(notesFile, notes);
  try {
    if (!existing) {
      gh(['release', 'create', tag, '--repo', repository, '--target', target, '--draft', '--title', title, '--notes-file', notesFile,
        ...(prerelease ? ['--prerelease', '--latest=false'] : ['--generate-notes'])]);
    }
    // A new release stays a draft if uploading fails. Reruns replace same-name assets.
    gh(['release', 'upload', tag, ...assets, '--repo', repository, '--clobber']);
    if (channel === 'development') {
      if (ref) api(`git/refs/tags/${tag}`, ['--method', 'PATCH', '-f', `sha=${target}`, '-F', 'force=true']);
      else if (!optional(`git/ref/tags/${tag}`)) api('git/refs', ['--method', 'POST', '-f', `ref=refs/tags/${tag}`, '-f', `sha=${target}`]);
      const keep = new Set(assets.map((file) => path.basename(file)));
      for (const asset of existing?.assets ?? []) {
        if (!keep.has(asset.name) && /^(WyrmrestEditor-|SHA256SUMS)/.test(asset.name)) gh(['release', 'delete-asset', tag, asset.name, '--repo', repository, '--yes']);
      }
      gh(['release', 'edit', tag, '--repo', repository, '--title', title, '--notes-file', notesFile, '--draft=false', '--prerelease=true', '--latest=false']);
    } else if (!existing || existing.draft) {
      if (!optional(`git/ref/tags/${tag}`)) api('git/refs', ['--method', 'POST', '-f', `ref=refs/tags/${tag}`, '-f', `sha=${target}`]);
      // Existing published versioned releases keep their hand-written notes/title.
      gh(['release', 'edit', tag, '--repo', repository, '--draft=false', `--prerelease=${prerelease}`, ...(prerelease ? ['--latest=false'] : [])]);
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  const url = `https://github.com/${repository}/releases/tag/${tag}`;
  console.log(`Published ${assets.length} files: ${url}`);
  if (summaryFile) fs.appendFileSync(summaryFile, `## Desktop release\n\n[${title}](${url})\n\n${assets.map((file) => `- ${path.basename(file)}`).join('\n')}\n`);
  return url;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { channel: { type: 'string', default: 'versioned' }, assets: { type: 'string', default: 'release' }, platform: { type: 'string', default: 'all' } } });
    if (process.env.GITHUB_ACTIONS !== 'true' && git('status', '--porcelain').length) throw new Error('Commit and push your source changes before publishing. The publisher never commits or pushes for you.');
    await publishRelease({ channel: values.channel, directory: values.assets, platform: values.platform, version: packageVersion(),
      repository: process.env.GITHUB_REPOSITORY || runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']),
      target: process.env.GITHUB_SHA || git('rev-parse', 'HEAD'), summaryFile: process.env.GITHUB_STEP_SUMMARY });
  } catch (error) {
    console.error(error.stderr?.toString().trim() || error.message);
    console.error('Release not completed. Check GitHub access, pushed source, version/tag and build outputs, then rerun.');
    process.exitCode = 1;
  }
}
