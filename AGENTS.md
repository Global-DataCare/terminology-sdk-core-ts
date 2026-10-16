# terminology-sdk-core-ts

- Use red-green-refactor TDD and begin every test with a flow-contract comment.
- Depend on terminology-data-utils-ts for wire contracts; never duplicate them.
- Keep the package independent from Node, browsers, frameworks and products.
- Select grouped entries by canonical flat claim and language before searching.
- Search must never rewrite entry ids, codes or language-specific values.
- No network operation belongs in this package.
