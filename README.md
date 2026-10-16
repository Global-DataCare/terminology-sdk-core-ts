# terminology-sdk-core-ts

Runtime-neutral, offline-first search over snapshots defined by
[`terminology-data-utils-ts`](https://github.com/Global-DataCare/terminology-data-utils-ts).
It selects complete catalog entries by canonical flat claim and language, then
filters their plain `code -> value` maps without network access or mutation.
English and localized entries remain independent catalog entries; applications
choose the language they need instead of receiving a fabricated per-code wire
model.

```ts
const matches = index.search({
  claim: 'Condition.code',
  language: 'es',
  text: 'gripe',
});
```

The design evolves an earlier local in-memory lookup while consuming the
versioned snapshot contract produced for
[`terminology-api-node-ts`](https://github.com/Global-DataCare/terminology-api-node-ts).

Transport, authentication and filesystem/SQLite persistence are Node adapter
responsibilities and are intentionally absent here.
