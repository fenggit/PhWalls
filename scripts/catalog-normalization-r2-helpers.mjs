/** Stable evidence matching for resumable catalog object preparation. */
export function reusableEvidence(object, row) {
  if (!row || row.failed || row.optionalMissing || row.source !== object.source || row.target !== object.target) return false;
  if (!/^[a-f\d]{64}$/.test(row.sha256 || '')) return false;
  if (object.local && row.sha256 !== object.local.sha256) return false;
  const recordedMime = row.mime_type ?? (object.mime_type ? row.targetInfo?.mimeType : null) ?? null;
  return recordedMime === (object.mime_type || null);
}
export function journalIdentity(row) {
  return JSON.stringify([row.source, row.target ?? null, row.sha256 ?? null, row.mime_type ?? null]);
}

export function associatedOriginals(manifest, object) {
  const originals = new Map();
  for (const change of manifest.d1_changes || []) {
    if (change.table !== 'w_wallpapers' || !change.after || change.after.compress_key !== object.target) continue;
    const source = change.before.origin_key;
    const operation = manifest.r2_objects.find(row => row.role === 'origin_key' && row.source === source && row.local);
    const pair = manifest.pairing_audit?.cover_pairings?.find(row => row.cover_target === object.target);
    const sha256 = operation?.local?.sha256 || pair?.original_sha256;
    if (!sha256) throw new Error('No frozen original SHA256 for cover reconciliation');
    originals.set(source, { source, sha256 });
  }
  if (!originals.size) throw new Error('Cover reconciliation has no surviving original owner');
  return [...originals.values()].sort((a, b) => a.source.localeCompare(b.source));
}

export function matchingOriginalReceipt(object, info, receipt) {
  return object.role === 'origin_key' && Boolean(object.local && receipt && receipt.sha256 === object.local.sha256 && receipt.etag === info.etag && receipt.size === info.size && info.size === object.local.size);
}
