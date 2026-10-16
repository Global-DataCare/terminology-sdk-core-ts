// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTerminologySnapshotKey, parseTerminologySnapshot } from 'terminology-data-utils-ts';
import { TerminologyLocalIndex, TerminologySnapshotRegistryMemory } from '../dist/index.js';

const identity = Object.freeze({
  sector: 'health-care', jurisdiction: 'CA-BC', fhirVersion: 'R4', release: '2026-09',
});
const valueSetId = 'https://terminology.example/ValueSet/conditions';
const system = 'http://hl7.org/fhir/sid/icd-10';
const source = { id: 'ICD10', system, version: '2026', license: 'test', provenance: 'synthetic' };

function entry(language, attributes, flatClaims = ['Condition.code'], id = valueSetId) {
  return {
    type: 'terminology-value-set', id, language, attributes,
    meta: { versionId: '2026-09', system, sources: [source.id], flatClaims },
  };
}

const snapshot = parseTerminologySnapshot({
  jsonapi: { version: '1.1' }, schemaVersion: '2',
  id: buildTerminologySnapshotKey(identity), generatedAt: '2026-09-28T12:00:00.000Z', identity,
  terminologyVersions: { [system]: source.version }, sources: [source],
  data: [
    entry('en', { J10: 'Seasonal influenza', J11: 'Influenza, virus not identified' }),
    entry('es', { J10: 'Gripe estacional', J11: 'Gripe, virus no identificado' }),
    entry('es', { 'respiratory': 'Respiratorio' }, ['Observation.category'], 'https://terminology.example/ValueSet/observation-category'),
  ],
});

test('selects complete grouped entries by flat claim and language', () => {
  const index = new TerminologyLocalIndex(snapshot);
  const selected = index.entries({ claim: 'Condition.code', language: 'es' });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, valueSetId);
  assert.deepEqual(selected[0].attributes, {
    J10: 'Gripe estacional',
    J11: 'Gripe, virus no identificado',
  });
});

test('searches locally inside only the entries applicable to the requested field and language', () => {
  const index = new TerminologyLocalIndex(snapshot);
  assert.deepEqual(
    index.search({ claim: 'Condition.code', language: 'es', text: 'estacional' }).map(item => item.code),
    ['J10'],
  );
  assert.deepEqual(
    index.search({ claim: 'Observation.category', language: 'es', text: 'resp' }).map(item => item.code),
    ['respiratory'],
  );
  assert.equal(index.search({ claim: 'Condition.code', language: 'es', text: 'Seasonal' }).length, 0);
});

test('returns the selected entry identity with each match without changing attributes', () => {
  const index = new TerminologyLocalIndex(snapshot);
  const [match] = index.search({ claim: 'Condition.code', language: 'es', text: 'J10' });
  assert.deepEqual(match, {
    entryId: valueSetId,
    entryType: 'terminology-value-set',
    language: 'es',
    system,
    versionId: '2026-09',
    sources: ['ICD10'],
    code: 'J10',
    value: 'Gripe estacional',
  });
});

test('atomically replaces the active snapshot without conflating another release', () => {
  const registry = new TerminologySnapshotRegistryMemory();
  registry.activate(snapshot);
  assert.equal(registry.get(snapshot.id), snapshot);
  assert.equal(registry.search(snapshot.id, {
    claim: 'Condition.code', language: 'es', text: 'gripe',
  }).length, 2);
  assert.throws(() => registry.search('missing', {
    claim: 'Condition.code', language: 'es', text: 'gripe',
  }), /terminology_snapshot_not_active/);
});
