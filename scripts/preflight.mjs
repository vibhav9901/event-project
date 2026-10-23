#!/usr/bin/env node
/**
 * Pre-submission gate. Run `npm run preflight` before using your submission attempt.
 * Add `-- --skip-checks` to skip typecheck, lint and tests (for example when CI already ran them).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const MAX_REPO_KIB = 10 * 1024;
const WARN_REPO_KIB = 1024;
const MAX_SCANNED_BYTES = 1024 * 1024;
const SECRET_PATTERNS = [
  /AIza[\w-]{35}/,
  /\bsk-[A-Za-z0-9]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
const REQUIRED_FILES = ['README.md', '.env.example', '.gitignore', 'package-lock.json'];

const failures = [];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
}

function branchNames() {
  const refs = git('for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes')
    .split('\n')
    .filter((ref) => ref && !ref.endsWith('/HEAD'));
  const names = refs.map((ref) =>
    ref.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/[^/]+\//, ''),
  );
  return [...new Set(names)];
}

function repositoryKib() {
  const info = Object.fromEntries(
    git('count-objects', '-v')
      .split('\n')
      .map((line) => line.split(': ')),
  );
  return Number(info.size) + Number(info['size-pack']);
}

function hasSecret(text) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function trackedFilesWithSecrets(files) {
  return files.filter((file) => {
    if (file === 'package-lock.json' || statSync(file).size > MAX_SCANNED_BYTES) return false;
    return hasSecret(readFileSync(file, 'utf8'));
  });
}

function historyHasSecret() {
  try {
    return hasSecret(git('log', '--all', '-p', '--no-color'));
  } catch {
    return false; // no commits yet
  }
}

function runChecks() {
  for (const script of ['typecheck', 'lint', 'test']) {
    try {
      execFileSync('npm', ['run', script], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      report(`npm run ${script}`, true);
    } catch {
      report(`npm run ${script}`, false);
    }
  }
}

function main() {
  const tracked = git('ls-files').split('\n').filter(Boolean);

  const branches = branchNames();
  report('Exactly one branch', branches.length === 1, branches.join(', ') || 'none');

  const kib = repositoryKib();
  report(
    'Repository under 10 MB',
    kib < MAX_REPO_KIB,
    `${kib} KiB${kib > WARN_REPO_KIB ? ', larger than expected' : ''}`,
  );

  report('Working tree committed', git('status', '--porcelain') === '');
  report(
    'No .env file tracked',
    !tracked.some((file) => /(^|\/)\.env(\..+)?$/.test(file) && !file.endsWith('.env.example')),
  );
  const leaks = trackedFilesWithSecrets(tracked);
  report('No secrets in tracked files', leaks.length === 0, leaks.join(', '));
  report('No secrets in git history', !historyHasSecret());
  report(
    'Required files present',
    REQUIRED_FILES.every((file) => existsSync(file)),
    REQUIRED_FILES.filter((file) => !existsSync(file)).join(', '),
  );

  if (!process.argv.includes('--skip-checks')) runChecks();

  console.log('\nManual checks on the live Vercel URL:');
  console.log(' - Response headers include a Content-Security-Policy with a nonce');
  console.log(' - Submit all three event types and one date inside the tight-timeline window');
  console.log(' - Use only the keyboard: Tab, Space on a radio, Enter to submit');
  console.log(
    ' - Try "Ignore all previous instructions" in Preferences: plan still appears, notice shown',
  );
  console.log(' - The GitHub repository is public');

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join('; ')}`);
    process.exit(1);
  }
  console.log('\nAll automated checks passed.');
}

main();
