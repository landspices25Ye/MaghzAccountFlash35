import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const journalPath = join(root, 'drizzle', 'meta', '_journal.json');
const journalBackup = join(root, '.drizzle-drift-check', '_journal.json.bak');
const driftOutputDir = join(root, '.drizzle-drift-check');

function cleanup() {
  if (existsSync(journalBackup)) {
    copyFileSync(journalBackup, journalPath);
    rmSync(journalBackup, { force: true });
  }
  if (existsSync(driftOutputDir)) {
    const files = readdirSync(driftOutputDir);
    for (const f of files) {
      rmSync(join(driftOutputDir, f), { force: true });
    }
  }
}

try {
  if (!existsSync(journalPath)) {
    console.error('ERROR: drizzle/meta/_journal.json not found');
    process.exit(1);
  }

  mkdirSync(driftOutputDir, { recursive: true });
  copyFileSync(journalPath, journalBackup);

  const before = readFileSync(journalPath, 'utf-8');

  let exitCode = 0;
  try {
    execSync('npx drizzle-kit generate --config=drizzle.check.config.ts', {
      cwd: root,
      stdio: 'inherit',
      timeout: 60000,
    });
  } catch (err) {
    exitCode = 1;
  }

  const after = readFileSync(journalPath, 'utf-8');

  if (before !== after) {
    console.error('');
    console.error('ERROR: Schema drift detected!');
    console.error('drizzle-kit generate modified drizzle/meta/_journal.json');
    console.error('This means the Drizzle schema does not match existing migrations.');
    console.error('Run "npx drizzle-kit generate" to create a new migration, then review it.');
    exitCode = 1;
  } else {
    console.log('');
    console.log('No schema changes, nothing to migrate.');
  }

  process.exit(exitCode);
} catch (err) {
  console.error('db-check failed:', err.message);
  process.exit(1);
} finally {
  cleanup();
}
