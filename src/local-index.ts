import {
  normalizeTerminologySearchText,
  type TerminologyEntry,
  type TerminologyEntryType,
  type TerminologySnapshot,
} from 'terminology-data-utils-ts';

export type TerminologyEntrySelection = Readonly<{
  claim: string;
  language: string;
  entryIds?: readonly string[];
  sources?: readonly string[];
}>;

export type TerminologySearchInput = TerminologyEntrySelection & Readonly<{
  text: string;
  limit?: number;
}>;

export type TerminologyMatch = Readonly<{
  entryId: string;
  entryType: TerminologyEntryType;
  language: string;
  system: string;
  versionId: string;
  sources: readonly string[];
  code: string;
  value: string;
}>;

type IndexedValue = Readonly<{
  entry: TerminologyEntry;
  code: string;
  normalizedCode: string;
  value: string;
  normalizedValue: string;
}>;

/** Immutable local index over already verified grouped terminology entries. */
export class TerminologyLocalIndex {
  readonly #snapshot: TerminologySnapshot;
  readonly #values: readonly IndexedValue[];

  public constructor(snapshot: TerminologySnapshot) {
    this.#snapshot = snapshot;
    this.#values = Object.freeze(snapshot.data.flatMap((entry) => Object.entries(entry.attributes).map(
      ([code, value]) => Object.freeze({
        entry,
        code,
        normalizedCode: code.toLocaleLowerCase('en'),
        value,
        normalizedValue: normalizeTerminologySearchText(value),
      }),
    )));
  }

  public get snapshot(): TerminologySnapshot {
    return this.#snapshot;
  }

  /** Returns untouched catalog entries applicable to one editor field. */
  public entries(input: TerminologyEntrySelection): readonly TerminologyEntry[] {
    const entryIds = new Set(input.entryIds ?? []);
    const sources = new Set(input.sources ?? []);
    return Object.freeze(this.#snapshot.data.filter((entry) => (
      entry.language === input.language
      && entry.meta.flatClaims.includes(input.claim)
      && (!entryIds.size || entryIds.has(entry.id))
      && (!sources.size || entry.meta.sources.some((source) => sources.has(source)))
    )));
  }

  public search(input: TerminologySearchInput): readonly TerminologyMatch[] {
    const text = input.text.trim();
    if (!text) return Object.freeze([]);
    const limit = input.limit ?? 20;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('terminology_search_limit_invalid');
    }
    const selectedEntries = new Set(this.entries(input));
    const codeQuery = text.toLocaleLowerCase('en');
    const labelQuery = normalizeTerminologySearchText(text);
    const matches = this.#values.flatMap((indexed) => {
      if (!selectedEntries.has(indexed.entry)) return [];
      const rank = matchRank(indexed, codeQuery, labelQuery);
      return rank === undefined ? [] : [{ indexed, rank }];
    });
    matches.sort((left, right) => left.rank - right.rank
      || left.indexed.value.localeCompare(right.indexed.value)
      || left.indexed.code.localeCompare(right.indexed.code));
    return Object.freeze(matches.slice(0, limit).map(({ indexed }) => Object.freeze({
      entryId: indexed.entry.id,
      entryType: indexed.entry.type,
      language: indexed.entry.language,
      system: indexed.entry.meta.system,
      versionId: indexed.entry.meta.versionId,
      sources: indexed.entry.meta.sources,
      code: indexed.code,
      value: indexed.value,
    })));
  }
}

function matchRank(indexed: IndexedValue, codeQuery: string, labelQuery: string): number | undefined {
  if (indexed.normalizedCode === codeQuery) return 0;
  if (indexed.normalizedCode.startsWith(codeQuery)) return 1;
  if (indexed.normalizedValue === labelQuery) return 2;
  if (indexed.normalizedValue.startsWith(labelQuery)) return 3;
  if (indexed.normalizedValue.includes(labelQuery)) return 4;
  return undefined;
}

/** Runtime-neutral active registry; persistence and download remain adapter concerns. */
export class TerminologySnapshotRegistryMemory {
  readonly #active = new Map<string, TerminologyLocalIndex>();

  public activate(snapshot: TerminologySnapshot): void {
    const replacement = new TerminologyLocalIndex(snapshot);
    this.#active.set(snapshot.id, replacement);
  }

  public get(snapshotId: string): TerminologySnapshot | undefined {
    return this.#active.get(snapshotId)?.snapshot;
  }

  public entries(snapshotId: string, input: TerminologyEntrySelection): readonly TerminologyEntry[] {
    const index = this.#active.get(snapshotId);
    if (!index) throw new Error('terminology_snapshot_not_active');
    return index.entries(input);
  }

  public search(snapshotId: string, input: TerminologySearchInput): readonly TerminologyMatch[] {
    const index = this.#active.get(snapshotId);
    if (!index) throw new Error('terminology_snapshot_not_active');
    return index.search(input);
  }
}
