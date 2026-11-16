// Flow contract: consumers can read generic independently versioned label evidence while metadata-free matches remain valid.
import type { TerminologyMatch, TerminologyMatchLabelProvenance } from '../../dist/index.js';

const provenance: TerminologyMatchLabelProvenance = {
  sourceId: 'LABELS',
  sourceVersion: 'labels-2',
  policy: 'official-test-selection',
  designation: { type: 'formal-name' },
};
const evidence: string = provenance.designation.type;
declare const match: TerminologyMatch;
const optionalEvidence: string | undefined = match.labelProvenance?.designation.type;
// @ts-expect-error Individual matches expose one designation, not the whole catalog map.
provenance.designations;
// @ts-expect-error A selected designation remains immutable.
provenance.designation.type = 'changed';
// @ts-expect-error Label source version is mandatory when provenance is supplied.
const incomplete: TerminologyMatchLabelProvenance = { sourceId: 'LABELS', policy: 'official-test-selection', designation: { type: 'formal-name' } };
void [evidence, optionalEvidence, incomplete];
