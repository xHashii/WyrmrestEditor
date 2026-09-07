import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { artifactNames, checkArtifacts, checksumFile, releasePlan, validateVersion } from '../scripts/release-utils.mjs';
import { publishRelease } from '../scripts/publish-release.mjs';

const version = '0.2.0';
const target = 'a'.repeat(40);
const older = 'b'.repeat(40);
const repository = 'owner/editor';
const plan = (event, ref, publish) => releasePlan({ version, event, ref, publish });

test('only main, matching version tags or explicit main dispatches publish', () => {
  assert.equal(plan('push', 'refs/heads/main').channel, 'development');
  assert.equal(plan('push', 'refs/heads/feature').channel, 'none');
  assert.equal(plan('pull_request', 'refs/pull/1/merge').channel, 'none');
  assert.equal(plan('pull_request', 'refs/heads/main', 'versioned').channel, 'none');
  assert.equal(plan('workflow_dispatch', 'refs/heads/main').channel, 'none');
  assert.equal(plan('workflow_dispatch', 'refs/heads/main', 'versioned').tag, 'v0.2.0');
  assert.equal(plan('workflow_dispatch', 'refs/heads/main', 'development').tag, 'development');
  assert.equal(plan('push', 'refs/tags/v0.2.0').channel, 'versioned');
  assert.throws(() => plan('push', 'refs/tags/v1.0.0'), /must match/);
  assert.throws(() => plan('workflow_dispatch', 'refs/heads/feature', 'versioned'), /Publish from main/);
  assert.throws(() => plan('workflow_dispatch', 'refs/heads/main', 'oops'), /Unknown/);
});

test('release versions are safe, valid SemVer without ambiguous asset metadata', () => {
  for (const value of ['1.2.3', '0.2.0-beta.1', '12.0.10-rc.0', '1.2.3-foo01']) assert.equal(validateVersion(value), value);
  for (const value of ['v1.2.3', '01.2.3', '1.2', '1.2.3-beta.01', '1.2.3+sha', '1.2.3\nchannel=development', '../x', null]) assert.throws(() => validateVersion(value));
});

function fixtures(t, platform = 'all', assetVersion = version) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-installers-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const name of artifactNames(assetVersion, platform)) fs.writeFileSync(path.join(directory, name), `installer ${name}`);
  return directory;
}

function github({ ref = null, release = null, comparison = 'behind', failure = null } = {}) {
  const calls = [];
  return { calls, gh(args) {
    calls.push(args);
    if (failure?.(args)) throw Object.assign(new Error('Simulated upload/network failure'), { stderr: 'Network error' });
    if (args[0] === 'api') {
      const endpoint = args[1].replace(`repos/${repository}/`, '');
      if (endpoint.startsWith('commits/')) return target;
      if (endpoint.startsWith('git/ref/tags/')) {
        if (!ref) throw Object.assign(new Error('not found'), { stderr: 'gh: Not Found (HTTP 404)' });
        return JSON.stringify({ object: ref });
      }
      if (endpoint.startsWith('git/tags/')) return JSON.stringify({ object: { type: 'commit', sha: target } });
      if (endpoint.startsWith('compare/')) return comparison;
      if (endpoint.startsWith('releases/tags/')) {
        if (!release) throw Object.assign(new Error('not found'), { stderr: 'gh: Not Found (HTTP 404)' });
        return JSON.stringify(release);
      }
      if (endpoint.startsWith('git/refs')) { ref = { type: 'commit', sha: target }; return '{}'; }
      throw new Error(`Unexpected API: ${args.join(' ')}`);
    }
    if (args[1] === 'create') release = { draft: true, target_commitish: target, assets: [] };
    if (args[1] === 'edit') release.draft = false;
    return '';
  } };
}
const publishing = (directory, mock, extras = {}) => publishRelease({ channel: 'versioned', directory, version, repository, target, gh: mock.gh, ...extras });

test('asset validation requires the exact nine native installers, never debug or stale outputs', async (t) => {
  const directory = fixtures(t);
  assert.equal(artifactNames(version).length, 9);
  assert.ok(artifactNames(version, 'windows').includes('WyrmrestEditor-0.2.0-win-x64-setup.exe'));
  fs.writeFileSync(path.join(directory, 'builder-debug.yml'), 'not an asset');
  fs.writeFileSync(path.join(directory, 'WyrmrestEditor-0.1.0-win-x64-setup.exe'), 'stale');
  const files = checkArtifacts(directory, version);
  assert.equal(files.length, 9);
  const checksum = await checksumFile(directory, files);
  const lines = fs.readFileSync(checksum, 'utf8').trim().split('\n');
  assert.equal(lines.length, 9);
  assert.equal(lines[0], `${createHash('sha256').update(fs.readFileSync(files[0])).digest('hex')}  ${path.basename(files[0])}`);
  fs.truncateSync(files[0]);
  assert.throws(() => checkArtifacts(directory, version), /Missing or empty/);
});

test('missing installers fail before any GitHub mutation or read', async (t) => {
  const directory = fixtures(t, 'windows');
  const mock = github();
  await assert.rejects(publishing(directory, mock), /Missing or empty/);
  assert.equal(mock.calls.length, 0);
});

test('new releases are drafts until all installers and checksums have uploaded', async (t) => {
  const directory = fixtures(t);
  const mock = github();
  assert.equal(await publishing(directory, mock), `https://github.com/${repository}/releases/tag/v0.2.0`);
  const create = mock.calls.find((args) => args[1] === 'create');
  assert.ok(create.includes('--draft'));
  assert.ok(create.includes('--generate-notes'));
  const upload = mock.calls.find((args) => args[1] === 'upload');
  assert.equal(upload.filter((arg) => arg.startsWith(directory)).length, 10);
  assert.ok(mock.calls.findIndex((args) => args[1] === 'edit') > mock.calls.indexOf(upload));
  assert.ok(mock.calls.some((args) => args.includes('ref=refs/tags/v0.2.0')));
});

test('published version tags are immutable, including annotated tags', async (t) => {
  const directory = fixtures(t);
  let mock = github({ ref: { type: 'commit', sha: older } });
  await assert.rejects(publishing(directory, mock), /different commit/);
  assert.ok(mock.calls.every((args) => args[0] === 'api'));
  mock = github({ ref: { type: 'tag', sha: older }, release: { draft: false, assets: [] } });
  await publishing(directory, mock);
  assert.ok(mock.calls.some((args) => args[1] === `repos/${repository}/git/tags/${older}`));
  assert.ok(!mock.calls.some((args) => args[1] === 'create' || args[1] === 'edit'), 'published notes are preserved on reruns');
});

test('rolling builds replace old assets only after upload and never mark development as latest stable', async (t) => {
  const directory = fixtures(t);
  const mock = github({ ref: { type: 'commit', sha: older }, release: { draft: false, assets: [
    { name: 'WyrmrestEditor-0.1.0-win-x64-setup.exe' }, { name: 'SHA256SUMS.txt' }, { name: 'user-notes.txt' },
  ] } });
  await publishing(directory, mock, { channel: 'development' });
  const upload = mock.calls.findIndex((args) => args[1] === 'upload');
  const move = mock.calls.findIndex((args) => args.includes('PATCH'));
  assert.ok(move > upload);
  const deleted = mock.calls.filter((args) => args[1] === 'delete-asset');
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0][3], 'WyrmrestEditor-0.1.0-win-x64-setup.exe');
  const edit = mock.calls.find((args) => args[1] === 'edit');
  assert.ok(edit.includes('--latest=false'));
  assert.ok(edit.includes('--prerelease=true'));
});

test('out-of-order builds cannot roll development back to an older commit', async (t) => {
  const directory = fixtures(t);
  const mock = github({ ref: { type: 'commit', sha: older }, comparison: 'ahead' });
  assert.equal(await publishing(directory, mock, { channel: 'development' }), null);
  assert.ok(mock.calls.every((args) => args[0] === 'api' && !args.includes('--method')));
});

test('upload failures keep a new draft unpublished and leave an existing development tag alone', async (t) => {
  const directory = fixtures(t);
  for (const channel of ['versioned', 'development']) {
    const mock = github({ ...(channel === 'development' ? { ref: { type: 'commit', sha: older }, release: { draft: false, assets: [] } } : {}), failure: (args) => args[1] === 'upload' });
    await assert.rejects(publishing(directory, mock, { channel }), /Simulated/);
    assert.ok(!mock.calls.some((args) => args[1] === 'edit' || args[1] === 'delete-asset' || args.includes('PATCH')));
  }
});

test('drafts without tags can be retried; local builds upload only their platform', async (t) => {
  const directory = fixtures(t, 'windows');
  const mock = github({ release: { draft: true, target_commitish: target, assets: [] } });
  await publishing(directory, mock, { platform: 'windows' });
  const upload = mock.calls.find((args) => args[1] === 'upload');
  assert.equal(upload.filter((arg) => arg.startsWith(directory)).length, 3);
  assert.ok(upload.some((arg) => arg.endsWith('SHA256SUMS-windows.txt')));
  assert.ok(!mock.calls.some((args) => args[1] === 'create'));
});

test('permission errors are never treated as missing releases', async (t) => {
  const directory = fixtures(t);
  const mock = github({ failure: (args) => args[1].includes('git/ref/') });
  await assert.rejects(publishing(directory, mock), /Simulated/);
  assert.ok(!mock.calls.some((args) => args[0] === 'release'));
});

test('a draft without a tag cannot mix binaries from different source commits', async (t) => {
  const directory = fixtures(t);
  const mock = github({ release: { draft: true, target_commitish: older, assets: [] } });
  await assert.rejects(publishing(directory, mock), /different source commit/);
  assert.ok(!mock.calls.some((args) => args[0] === 'release'));
});
