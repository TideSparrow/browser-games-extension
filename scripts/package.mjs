import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../extension/', import.meta.url));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
await mkdir(dist, { recursive: true });
const staging = await mkdtemp(join(dist, '.build-'));
const firefox = {
  gecko: {
    id: 'game-finder@browsergamehub.net',
    strict_min_version: '142.0',
    data_collection_permissions: { required: ['none'] },
  },
};

try {
  const unpacked = join(staging, 'extension');
  await cp(source, unpacked, {
    recursive: true,
    filter: (path) => basename(path) !== '.DS_Store',
  });
  const manifestPath = join(unpacked, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const chromiumZip = 'browser-games-extension.zip';
  const firefoxZip = 'browser-games-extension-firefox.zip';
  const zip = (name) => execFileSync('zip', ['-q', '-r', '-X', join(staging, name), '.'], { cwd: unpacked });

  zip(chromiumZip);
  manifest.browser_specific_settings = firefox;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  zip(firefoxZip);

  for (const name of [chromiumZip, firefoxZip]) {
    await rename(join(staging, name), join(dist, name));
  }
} finally {
  await rm(staging, { recursive: true, force: true });
}
