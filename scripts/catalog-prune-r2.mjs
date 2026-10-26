#!/usr/bin/env node
/** Exact-key retired-object pruning; default validates only, --apply deletes. */
import { readFileSync, statSync, existsSync, mkdirSync, openSync, writeSync, fsyncSync, closeSync, ftruncateSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCatalogR2Client } from './lib/catalog-r2-client.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const HEX = /^[a-f\d]{64}$/;
const validKey = key => typeof key === 'string' && key.length > 0 && !key.startsWith('/') && !/[\x00-\x1f\x7f\\]/.test(key) && !key.split('/').some(part => !part || part === '.' || part === '..');
export function catalogReferences(rows) {
  const keys = new Set();
  for (const row of rows) {
    if (row.origin_key) keys.add(row.origin_key);
    if (row.compress_key) keys.add(row.compress_key);
    if (row.media_type === 'dynamic' && row.origin_key?.includes('/origin/')) keys.add(row.origin_key.replace('/origin/', '/preview/'));
  }
  return keys;
}
function evidenceSourceHash(manifest, object, proof) {
  const local = object.local || {}, measured = proof.source_sha256 ?? proof.sha256;
  if (!HEX.test(measured || '') || (proof.backup_sha256 ?? measured) !== measured) return null;
  if (proof.cover_authority === 'local') {
    const overlay = proof.coverAuthorityOverlaySHA256 || proof.evidence_overlay_sha256;
    if (proof.source_sha256 !== measured || proof.backup_sha256 !== measured || object.role !== 'compress_key' || !HEX.test(overlay || '') || proof.target_sha256 !== local.sha256 || proof.sha256 !== proof.target_sha256 || proof.targetInfo?.size !== local.size) return null;
    const expected = new Map();
    for (const change of manifest.d1_changes || []) {
      if (change.table !== 'w_wallpapers' || !change.after || change.after.compress_key !== object.target) continue;
      const source = change.before?.origin_key;
      const operation = manifest.r2_objects.find(row => row.role === 'origin_key' && row.source === source && row.local);
      const pair = manifest.pairing_audit?.cover_pairings?.find(row => row.cover_target === object.target);
      const digest = operation?.local?.sha256 || pair?.original_sha256;
      if (!source || !digest) return null;
      expected.set(source, digest);
    }
    const owners = proof.authority_originals || [];
    if (!expected.size || owners.length !== expected.size || new Set(owners.map(owner => owner.source)).size !== expected.size || owners.some(owner => owner.sha256 !== expected.get(owner.source) || !owner.etag || !Number.isSafeInteger(owner.size) || owner.size < 1)) return null;
  } else if (measured !== proof.sha256 || (local.sha256 && measured !== local.sha256)) return null;
  return measured;
}
export function validatePrunePlan({ plan, manifest, manifestSha, journal, remote, local, remoteSnapshotTimeMs, now = Date.now(), maxSnapshotAgeMs = 900000 }) {
  if (!HEX.test(manifest.snapshot_sha256 || '') || plan.version !== 1 || plan.manifest_sha256 !== manifestSha || !HEX.test(manifestSha || '')) throw new Error('Reviewed plan does not match the frozen manifest');
  if (!Number.isFinite(plan.created_at_ms) || !Number.isFinite(remoteSnapshotTimeMs) || remoteSnapshotTimeMs < plan.created_at_ms || now - remoteSnapshotTimeMs > maxSnapshotAgeMs || remoteSnapshotTimeMs > now + 30000) throw new Error('Fresh post-plan remote snapshot is required');
  if (!Array.isArray(remote.wallpapers) || !Array.isArray(remote.tombstones) || !Array.isArray(local.wallpapers)) throw new Error('Complete remote/local reference snapshots are required');
  const refs = catalogReferences([...remote.wallpapers, ...local.wallpapers]);
  const tombstones = new Set(remote.tombstones.filter(row => Number.isFinite(row.deleted_at)).map(row => row.object_key));
  const targets = new Set(manifest.r2_objects.map(row => row.target).filter(Boolean));
  const operationsBySource = new Map();
  for (const object of manifest.r2_objects) { const list = operationsBySource.get(object.source) || []; list.push(object); operationsBySource.set(object.source, list); }
  const latest = new Map();
  for (const row of journal) if (row.manifest_sha256 === manifestSha) latest.set(JSON.stringify([row.source, row.target ?? null]), row);
  const seen = new Set();
  for (const row of plan.candidates) {
    if (!validKey(row.key) || row.key.startsWith('_catalog-') || seen.has(row.key)) throw new Error('Invalid, protected or duplicate retired key');
    seen.add(row.key);
    if (refs.has(row.key)) throw new Error(`Retired key has an active database reference: ${row.key}`);
    if (targets.has(row.key)) throw new Error(`Manifest fanout target must be preserved: ${row.key}`);
    if (!tombstones.has(row.key)) throw new Error(`Retired key lacks a fresh remote tombstone: ${row.key}`);
    const operations = operationsBySource.get(row.key) || [];
    if (!operations.length || operations.some(object => object.retain_source)) throw new Error('Key is not an eligible frozen source');
    const expectedTargets = [...new Set(operations.map(object => object.target ?? null))].sort((a, b) => (a || '') < (b || '') ? -1 : (a || '') > (b || '') ? 1 : 0);
    if (JSON.stringify(expectedTargets) !== JSON.stringify(row.evidence_targets)) throw new Error('Reviewed fanout operation list differs');
    if (!HEX.test(row.sha256 || '') || !Number.isSafeInteger(row.size) || row.size < 1 || !row.source_etag || !row.backup_etag || row.backup_key !== `_catalog-backups/${manifest.snapshot_sha256.slice(0, 16)}/${row.key}`) throw new Error('Invalid reviewed source/backup evidence');
    for (const target of expectedTargets) {
      const proof = latest.get(JSON.stringify([row.key, target]));
      const object = operations.find(object => (object.target ?? null) === target);
      if (!proof || proof.failed || proof.optionalMissing || !proof.verifiedAt || evidenceSourceHash(manifest, object, proof) !== row.sha256 || proof.backup !== row.backup_key || proof.sourceInfo?.etag !== row.source_etag || proof.sourceInfo?.size !== row.size || proof.backupInfo?.etag !== row.backup_etag || proof.backupInfo?.size !== row.size || (target && (!proof.targetInfo?.etag || (proof.cover_authority !== 'local' && proof.targetInfo.size !== row.size)))) throw new Error(`Latest staging evidence is missing or changed: ${row.key}`);
    }
  }
  return plan.candidates;
}
export async function pruneRetiredObjects(options) {
  const rows = validatePrunePlan(options);
  const { client, record, assertLocalUnreferenced = async () => {}, previouslyDeleted = new Set(), planSha = 'injected-test-plan' } = options;
  const concurrency = options.concurrency ?? 1;
  if (!client || typeof record !== 'function' || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) throw new Error('Client, durable recorder and valid concurrency are required');
  let next = 0, stopped = null, removed = 0, missing = 0;
  const log = row => record({ ...row, plan_sha256: planSha, manifest_sha256: options.manifestSha, at: new Date().toISOString() });
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (!stopped && next < rows.length) {
      const row = rows[next++];
      try {
        await assertLocalUnreferenced(row.key);
        const [backup, source] = await Promise.all([client.head(row.backup_key), client.head(row.key)]);
        if (!backup || backup.etag !== row.backup_etag || backup.size !== row.size || (row.backup_mime && backup.mimeType !== row.backup_mime)) throw new Error('Verified backup changed or disappeared');
        if (!source) { log({ event: 'already-missing', key: row.key, backup_key: row.backup_key }); missing++; continue; }
        if (previouslyDeleted.has(row.key)) throw new Error('A previously deleted source reappeared');
        if (source.etag !== row.source_etag || source.size !== row.size || (row.source_mime && source.mimeType !== row.source_mime)) throw new Error('Reviewed source changed');
        await assertLocalUnreferenced(row.key);
        if (stopped) return;
        log({ event: 'delete-intent', key: row.key, source_etag: row.source_etag, backup_key: row.backup_key, backup_etag: row.backup_etag, sha256: row.sha256, size: row.size });
        const status = await client.delete(row.key, row.source_etag);
        if (![200, 204, 404].includes(status)) throw new Error(`Conditional DELETE failed: HTTP ${status}`);
        log({ event: 'deleted', key: row.key, source_etag: row.source_etag, backup_key: row.backup_key }); removed++;
      } catch (error) {
        stopped ||= error;
        log({ event: 'failed', key: row.key, error: error.message });
      }
    }
  }));
  if (stopped) throw stopped;
  return { reviewed: rows.length, deleted: removed, already_missing: missing };
}
export function readJsonJournal(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n'), rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    try { rows.push(JSON.parse(lines[i])); }
    catch { if (i !== lines.length - 1) throw new Error('Corrupt journal before its final line'); }
  }
  return rows;
}
export function durablePruneJournal(path) {
  mkdirSync(dirname(path), { recursive: true });
  const bytes = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
  const rows = readJsonJournal(path), fd = openSync(path, 'a', 0o600);
  if (bytes.length && bytes.at(-1) !== 10) { ftruncateSync(fd, bytes.lastIndexOf(10) + 1); fsyncSync(fd); }
  return { rows, record(row) { const bytes = Buffer.from(JSON.stringify(row) + '\n'); let offset = 0; while (offset < bytes.length) offset += writeSync(fd, bytes, offset); fsyncSync(fd); }, close() { closeSync(fd); } };
}
async function main() {
  const arg = name => { const at = process.argv.indexOf(name); return at < 0 ? null : process.argv[at + 1]; };
  const required = name => { const value = arg(name); if (!value) throw new Error(`${name} is required`); return resolve(value); };
  const planPath = required('--plan'), manifestPath = required('--manifest'), journalPath = required('--journal'), remotePath = required('--remote-snapshot'), localPath = required('--local-db');
  const planBytes = readFileSync(planPath), planSha = sha(planBytes), plan = JSON.parse(planBytes), manifest = JSON.parse(readFileSync(manifestPath));
  const { DatabaseSync } = await import('node:sqlite');
  const openSnapshot = path => {
    const db = path.toLowerCase().endsWith('.sql') ? new DatabaseSync(':memory:') : new DatabaseSync(path, { readOnly: true });
    if (path.toLowerCase().endsWith('.sql')) db.exec(readFileSync(path, 'utf8'));
    db.exec('PRAGMA query_only=ON'); return db;
  };
  const remoteDb = openSnapshot(remotePath), localDb = new DatabaseSync(localPath, { readOnly: true }); localDb.exec('PRAGMA query_only=ON');
  let durable;
  try {
    const remote = { wallpapers: remoteDb.prepare('SELECT origin_key,compress_key,media_type FROM w_wallpapers').all(), tombstones: remoteDb.prepare('SELECT object_key,deleted_at FROM w_deleted_wallpaper_files').all() };
    const local = { wallpapers: localDb.prepare('SELECT origin_key,compress_key,media_type FROM w_wallpapers').all() };
    const options = { plan, manifest, manifestSha: sha(readFileSync(manifestPath)), journal: readJsonJournal(journalPath), remote, local, remoteSnapshotTimeMs: statSync(remotePath).mtimeMs, planSha };
    const candidates = validatePrunePlan(options);
    if (!process.argv.includes('--apply')) { process.stdout.write(JSON.stringify({ apply: false, candidates: candidates.length, plan_sha256: planSha }) + '\n'); return; }
    if (arg('--plan-sha256') !== planSha) throw new Error('--plan-sha256 must match the reviewed exact-key plan');
    const logPath = required('--log');
    const sourcePaths = new Set([planPath, manifestPath, journalPath, remotePath, localPath]);
    if (sourcePaths.has(logPath)) throw new Error('Prune log must not overwrite an input');
    durable = durablePruneJournal(logPath);
    const previouslyDeleted = new Set(durable.rows.filter(row => row.plan_sha256 === planSha && ['deleted', 'already-missing'].includes(row.event)).map(row => row.key));
    const query = localDb.prepare("SELECT 1 FROM w_wallpapers WHERE origin_key=? OR compress_key=? OR (media_type='dynamic' AND instr(origin_key,'/origin/')>0 AND (substr(origin_key,1,instr(origin_key,'/origin/')-1)||'/preview/'||substr(origin_key,instr(origin_key,'/origin/')+8))=?) LIMIT 1");
    try { process.loadEnvFile('.env.local'); } catch { /* Environment may already be supplied. */ }
    let completed = 0;
    const result = await pruneRetiredObjects({ ...options, concurrency: Number(arg('--concurrency') || 1), client: createCatalogR2Client(), previouslyDeleted,
      record(row) { durable.record(row); if (['deleted', 'already-missing'].includes(row.event) && ++completed % 100 === 0) process.stdout.write(`Retired objects verified absent: ${completed}/${candidates.length}\n`); },
      assertLocalUnreferenced(key) { if (query.get(key, key, key)) throw new Error('New local database reference prevents pruning'); },
    });
    process.stdout.write(JSON.stringify({ ...result, plan_sha256: planSha }) + '\n');
  } finally { durable?.close(); remoteDb.close(); localDb.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
