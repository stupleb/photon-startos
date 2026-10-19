# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- Keep the import as two processes spawned from `build.ts` and piped through Node. Only a command's direct child gets SIGKILL when a cancelled build kills its wrapper, so a `zstd | java` shell pipeline would leave Java writing an abandoned index.
- Write `state.json` through the `Builder`'s effects (`main`'s own), never the reconcile context's: that context `.const()`s the file, and the SDK cancels such a write with `Canceled: write after const`.
- The `photon` daemon's `exec` is a function, which the reconciler cannot see into; its `uses: active` is what restarts it on a new index.
