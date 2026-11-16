# Changelog

## 0.2.1

- Consume Terminology Data 0.2.2 and retain optional per-label designation
  provenance in grouped entries and local matches, independently from membership
  versions. Preserve existing values, ranking and metadata-free snapshots.

## 0.2.0

- Select grouped terminology entries by canonical flat claim and language.
- Search locally inside each entry's plain `code -> value` attributes.
- Return entry identity, coding system, version and provenance with each match.
- Remove the incorrect per-code snapshot dependency.

## 0.1.0

- Add runtime-neutral search by code, localized label and canonical English display.
- Add an in-memory active-snapshot registry with atomic replacement.
