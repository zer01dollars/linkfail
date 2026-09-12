#!/usr/bin/env node
/**
 * Linkfail CLI — init workflow + local check.
 * Made By Zer01
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { scanRepo } from '../src/scan.js';
import {
  formatConsoleSummary,
  formatIssueBody,
  writeReports,
} from '../src/report.js';
import { validateLicense } from '../src/license.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BUY = {
  single:
    'https://buy.polar.sh/polar_cl_BaJHHZ30SJeeOOtfQkxWy8WAu1Lft5j2cVwG20suSWa',
  monthly:
    'https://buy.polar.sh/polar_cl_nQHuiCYT1VVOCk4PWhU6KVUpcBkyEyb9Ssaay0YqiS9',
  lifetime:
    'https://buy.polar.sh/polar_cl_WPvBpcyTzu1KrtUwh8IlcTjvNd0RZxEFkO48D1N6Eoy',
};

function usage() {
  console.log(`Linkfail CLI — Made By Zer01

Usage:
  linkfail init [dir]     Copy examples/linkfail.yml → .github/workflows/linkfail.yml
  linkfail check [opts]   Scan the current repo locally; write linkfail-out/

Options for check:
  --license <key>         Validate a Polar key (otherwise SKIP_LICENSE)
  --config <path>         Config file (default: linkfail.yml)
  --no-sarif              Skip SARIF output
  --cwd <dir>             Working directory (default: .)
  -h, --help              Show help
`);
}

/**
 * Copy workflow template into target repo.
 * @param {string} targetDir
 */
export function initWorkflow(targetDir = '.') {
  const destRoot = resolve(targetDir);
  const destDir = join(destRoot, '.github', 'workflows');
  const src = join(ROOT, 'examples', 'linkfail.yml');
  if (!existsSync(src)) {
    throw new Error(`Missing examples/linkfail.yml at ${src}`);
  }
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, 'linkfail.yml');
  copyFileSync(src, dest);
  console.log(`Wrote ${dest}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Buy a license and add repo secret LINKFAIL_LICENSE_KEY');
  console.log(`     Single use $9:  ${BUY.single}`);
  console.log(`     Monthly $12:    ${BUY.monthly}`);
  console.log(`     Lifetime $79:   ${BUY.lifetime}`);
  console.log('  2. Commit & push .github/workflows/linkfail.yml');
  console.log('  3. Optional: enable GitHub Pages from docs/site on the Linkfail repo');
  console.log('');
  console.log('Made By Zer01 — Artificially Intelligent, Digitally Enhanced');
  return dest;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--license') args.license = argv[++i];
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--cwd') args.cwd = argv[++i];
    else if (a === '--no-sarif') args.noSarif = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else if (a.startsWith('-')) {
      console.error(`Unknown option: ${a}`);
      process.exitCode = 1;
      args.help = true;
    } else args._.push(a);
  }
  return args;
}

/**
 * Local scan with license skip by default.
 * @param {object} options
 */
export async function checkLocal({
  cwd = process.cwd(),
  configPath = 'linkfail.yml',
  licenseKey = '',
  writeSarif = true,
  fetchImpl = globalThis.fetch,
} = {}) {
  const useLicense = Boolean(licenseKey);
  if (!useLicense) {
    process.env.SKIP_LICENSE = process.env.SKIP_LICENSE || '1';
  }

  const license = await validateLicense({
    licenseKey,
    skip: !useLicense,
    fetchImpl,
  });
  if (!license.ok) {
    console.error(`License check failed: ${license.reason}`);
    process.exitCode = 1;
    return { ok: false, reason: license.reason };
  }

  const config = loadConfig(configPath, cwd);
  const scan = await scanRepo({ config, cwd, fetchImpl });
  console.log(formatConsoleSummary(scan));

  const paths = writeReports({
    scan,
    outputDir: 'linkfail-out',
    cwd,
    writeSarif,
    meta: {
      repo: '',
      generatedAt: new Date().toISOString(),
      version: '0.3.0',
    },
  });
  console.log(`Wrote ${paths.md}`);
  console.log(`Wrote ${paths.html}`);
  if (paths.sarif) console.log(`Wrote ${paths.sarif}`);

  if (scan.broken.length) {
    console.log('');
    console.log(formatIssueBody(scan));
    process.exitCode = 1;
    return { ok: false, scan, paths };
  }
  console.log('All links healthy.');
  return { ok: true, scan, paths };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const cmd = args._[0];

  if (!cmd || args.help || cmd === 'help') {
    usage();
    if (!cmd) process.exitCode = 1;
    return;
  }

  if (cmd === 'init') {
    initWorkflow(args._[1] || '.');
    return;
  }

  if (cmd === 'check') {
    await checkLocal({
      cwd: args.cwd || process.cwd(),
      configPath: args.config || 'linkfail.yml',
      licenseKey: args.license || '',
      writeSarif: !args.noSarif,
    });
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exitCode = 1;
}

const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith('linkfail.js') ||
    process.argv[1].endsWith('/linkfail'));

if (isCli) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
