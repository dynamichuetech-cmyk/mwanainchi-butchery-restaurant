import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ASSET_PREFIX = '/__l5e/assets-v1/';
const DEFAULT_ORIGIN = 'https://id-preview--d90d8e74-5294-45c9-8913-f10c121b1088.lovable.app';
type Pointer = { url: string; content_type?: string; size?: number; original_filename?: string };

// External hosts lack Lovable's asset proxy. Keep the original pointer URLs
// and materialise their immutable files into public only during external builds.
export function assetDownload(pointer: Pointer, origin = DEFAULT_ORIGIN) {
  if (typeof pointer.url !== 'string' || !pointer.url.startsWith(ASSET_PREFIX)) return null;
  const source = new URL(origin);
  if (source.protocol !== 'https:' || source.username || source.password || source.pathname !== '/') {
    throw new Error('LOVABLE_ASSET_ORIGIN must be a credential-free HTTPS origin.');
  }
  const target = new URL(pointer.url, source);
  if (target.origin !== source.origin || !target.pathname.startsWith(ASSET_PREFIX) || target.search || target.hash) {
    throw new Error('Invalid hosted asset path.');
  }
  return { url: target.href, publicPath: target.pathname.slice(1), contentType: pointer.content_type };
}

async function pointers(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await pointers(path));
    else if (entry.name.endsWith('.asset.json')) files.push(path);
  }
  return files;
}

export async function prepareHostedAssets(root = process.cwd()) {
  const files = [...await pointers(resolve(root, 'src')), ...await pointers(resolve(root, 'public'))];
  let count = 0;
  for (const file of files) {
    const pointer: Pointer = JSON.parse(await readFile(file, 'utf8'));
    const asset = assetDownload(pointer, process.env['LOVABLE_ASSET_ORIGIN'] || DEFAULT_ORIGIN);
    if (!asset) continue;
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
    if (!response.ok) throw new Error(`Hosted asset download failed (${response.status}): ${pointer.original_filename}`);
    if (asset.contentType && response.headers.get('content-type')?.split(';')[0] !== asset.contentType) {
      throw new Error(`Hosted asset content type mismatch: ${pointer.original_filename}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || (pointer.size && bytes.length !== pointer.size)) {
      throw new Error(`Hosted asset size mismatch: ${pointer.original_filename}`);
    }
    const destination = resolve(root, 'public', asset.publicPath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    count++;
  }
  console.log(`Prepared ${count} hosted assets for external deployment.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href && process.env['VERCEL'] === '1') {
  await prepareHostedAssets();
}