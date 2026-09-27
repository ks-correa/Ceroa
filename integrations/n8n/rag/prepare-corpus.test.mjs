import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareCorpus } from './prepare-corpus.mjs';

test('only an approved unchanged document can enter the corpus', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ceroa-rag-'));
  try {
    const content = '# Approved concept\nA document for a preparation test.';
    await writeFile(path.join(root, 'guide.md'), content);
    const source = { path: 'guide.md', title: 'Guide', approved: true, approvedBy: 'reviewer',
      version: '1', sha256: createHash('sha256').update(content).digest('hex') };
    const manifest = { version: 1, sources: [source] };
    assert.equal((await prepareCorpus(root, manifest))[0].pageContent, content);
    await assert.rejects(prepareCorpus(root, { ...manifest, sources: [{ ...source, approved: false }] }), /approval/);
    await assert.rejects(prepareCorpus(root, { ...manifest, sources: [{ ...source, path: '../private.md' }] }), /repository/);
    await assert.rejects(prepareCorpus(root, { ...manifest, sources: [{ ...source, path: '.env.md' }] }), /repository/);
    await writeFile(path.join(root, 'guide.md'), content + '\nUnreviewed addition');
    await assert.rejects(prepareCorpus(root, manifest), /changed since approval/);
    await assert.rejects(prepareCorpus(root, { version: 1, sources: [] }), /No approved sources/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
