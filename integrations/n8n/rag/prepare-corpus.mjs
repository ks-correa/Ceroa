import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = await realpath(fileURLToPath(new URL('../../../', import.meta.url)));
const hash = text => createHash('sha256').update(text).digest('hex');
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

// No directory scanning: only explicit, version-approved Markdown sources.
export async function prepareCorpus(root, manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.sources) || !manifest.sources.length)
    throw new Error('No approved sources. Populate sources.json after document review.');
  const output = [];
  const seen = new Set();
  for (const source of manifest.sources) {
    if (source.approved !== true || typeof source.path !== 'string' || !source.title?.trim()
        || !source.approvedBy?.trim() || !source.version?.trim() || !/^[a-f0-9]{64}$/.test(source.sha256))
      throw new Error('Every source requires explicit approval, reviewer, title, version and SHA-256.');
    const candidate = path.resolve(root, source.path);
    if (!inside(root, candidate) || path.extname(candidate).toLowerCase() !== '.md'
        || source.path.split(/[\\/]/).some(p => p.startsWith('.') || ['node_modules','target','tmp'].includes(p)))
      throw new Error('Source must be a repository Markdown document outside private/generated folders.');
    const resolved = await realpath(candidate);
    if (!inside(root, resolved)) throw new Error('Source link points outside repository.');
    if (seen.has(resolved)) throw new Error('Duplicate approved source.');
    seen.add(resolved);
    const bytes = await readFile(resolved);
    if (bytes.length > 1024 * 1024) throw new Error('Document exceeds 1 MiB limit.');
    if (hash(bytes) !== source.sha256) throw new Error('Document changed since approval; review and approve the new hash.');
    const text = bytes.toString('utf8').replace(/\r\n/g, '\n').trim();
    if (!text) throw new Error('Approved document is empty.');
    // Size and overlap are preparation defaults, to calibrate with the chosen tokenizer/model.
    for (let start = 0, index = 0; start < text.length; start += 1000, index++) {
      const content = text.slice(start, start + 1200);
      output.push({ pageContent: content, metadata: {
        approved: true, source: source.path, title: source.title, version: source.version,
        sourceHash: source.sha256, chunkIndex: index,
        chunkId: hash(`${source.path}\n${source.sha256}\n${index}`),
      } });
      if (start + 1200 >= text.length) break;
    }
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const manifest = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
    const chunks = await prepareCorpus(repo, manifest);
    const outputDir = path.join(repo, 'tmp', 'rag');
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, 'approved-chunks.json'), JSON.stringify(chunks, null, 2) + '\n');
    console.log(`Prepared ${chunks.length} approved chunks in tmp/rag/approved-chunks.json. No embeddings or database writes performed.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
