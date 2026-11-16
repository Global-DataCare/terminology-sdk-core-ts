// Flow contract: neutral snapshot activation and offline search retain independently versioned per-label designation evidence without changing grouped values, while old snapshots keep their exact result shape and claim selection grants no authority.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTerminologySnapshotKey, parseTerminologySnapshot } from 'terminology-data-utils-ts';
import { TerminologyLocalIndex, TerminologySnapshotRegistryMemory } from '../dist/index.js';

function fixture() {
  const identity = { sector: 'health-care', jurisdiction: 'ES', fhirVersion: 'R4', release: 'synthetic-retention' };
  const system = 'https://example.invalid/codes';
  return { jsonapi: { version: '1.1' }, schemaVersion: '2', id: buildTerminologySnapshotKey(identity), identity,
    generatedAt: '2026-11-16T00:00:00.000Z', terminologyVersions: { [system]: 'membership-1' },
    sources: [
      { id: 'MEMBERSHIP', system, version: 'membership-1', license: 'synthetic-only', provenance: 'synthetic-membership' },
      { id: 'LABELS', system, version: 'labels-2', license: 'synthetic-only', provenance: 'synthetic-labels' },
    ], data: [{ type: 'terminology-system', id: system, language: 'es', attributes: { A: 'nombre de ejemplo' }, meta: {
      system, versionId: 'membership-1', sources: ['MEMBERSHIP', 'LABELS'], flatClaims: ['Condition.code'],
      labelProvenance: { sourceId: 'LABELS', sourceVersion: 'labels-2', policy: 'official-test-selection', designations: {
        A: { type: 'formal-name', descriptionId: 'description-a', effectiveTime: '20261110' },
      } },
    } }] };
}

test('verified snapshot activation retains the exact frozen grouped designation metadata', () => {
  const input = fixture(), parsed = parseTerminologySnapshot(input), registry = new TerminologySnapshotRegistryMemory();
  registry.activate(parsed);
  const entry = registry.entries(parsed.id, { claim: 'Condition.code', language: 'es' })[0];
  assert.deepEqual(entry.meta.labelProvenance, input.data[0].meta.labelProvenance);
  assert.deepEqual(entry.attributes, { A: 'nombre de ejemplo' });
  assert.ok(Object.isFrozen(entry.meta.labelProvenance.designations.A));
});

test('offline matches pair the original value with its own independently pinned designation', () => {
  const input = fixture(), index = new TerminologyLocalIndex(parseTerminologySnapshot(input));
  const match = index.search({ claim: 'Condition.code', language: 'es', text: 'nombre' })[0];
  assert.equal(match.value, 'nombre de ejemplo'); assert.equal(match.versionId, 'membership-1');
  assert.deepEqual(match.labelProvenance, { sourceId: 'LABELS', sourceVersion: 'labels-2', policy: 'official-test-selection', designation: input.data[0].meta.labelProvenance.designations.A });
  assert.ok(Object.isFrozen(match.labelProvenance));
});

test('old snapshots without label metadata retain their exact offline match shape', () => {
  const input = fixture(); delete input.data[0].meta.labelProvenance;
  const index = new TerminologyLocalIndex(parseTerminologySnapshot(input));
  assert.deepEqual(index.search({ claim: 'Condition.code', language: 'es', text: 'nombre' }), [{
    entryId: input.data[0].id, entryType: 'terminology-system', language: 'es', system: input.data[0].id,
    versionId: 'membership-1', sources: ['MEMBERSHIP', 'LABELS'], code: 'A', value: 'nombre de ejemplo',
  }]);
});
