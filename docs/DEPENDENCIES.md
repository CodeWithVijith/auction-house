# Dependencies and licenses

The lockfile records exact installed versions. Node.js 22.12+ is required; verification used Node.js 24.20.0 and npm 11.19.0.

- React, React Router, Zustand, Lucide, and Dexie provide the UI, navigation, transient preferences, icons, and IndexedDB repository. Zod validates imports, command data, and saved snapshots.
- SheetJS Community Edition **0.20.3** is installed from the pinned official tarball `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. It is bundled at build time; there is no runtime CDN script. The registry's older `xlsx` release is not used. Its Apache 2.0 license is copied to [licenses/SheetJS-LICENSE.txt](licenses/SheetJS-LICENSE.txt).
- TypeScript, Vite, ESLint, Prettier, Vitest, fake-indexeddb, and Playwright support development and verification. Dependencies retain their licenses in `node_modules`.

Spreadsheet work is isolated in `src/services/spreadsheet.ts`. Imported cells are read as data; formulas and macros are never executed. Macro-enabled workbooks are rejected. Exported user text is stored in literal string cells.

Technical guidance: [official SheetJS distribution guide](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/), [Vite setup guide](https://vite.dev/guide/), and [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction()).
