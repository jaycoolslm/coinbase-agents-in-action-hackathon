## Relevant Files

- `x402-registry/package.json` - Project metadata, scripts, and dependency declarations (managed by Bun).
- `x402-registry/bunfig.toml` - Bun configuration file for workspace-level settings, specifically configured for integration test timeouts and serial execution.
- `x402-registry/tsconfig.json` - TypeScript compiler configuration.
- `x402-registry/.env.example` - Template for Hedera credentials and configuration variables.
- `x402-registry/src/cli/registry.ts` - CLI entry point implementing `add-endpoint` and `update-price` commands.
- `x402-registry/src/lib/hederaClient.ts` - Wrapper around Hedera JS SDK v2 for common Hedera operations.
- `x402-registry/src/models/DirectoryEntry.ts` - Lean TypeScript interface for directory topic messages (discovery only).
- `x402-registry/src/models/PointerMessage.ts` - Enhanced TypeScript interface for pointer topic messages (pricing + API specs).
- `x402-registry/src/schemas/directoryEntry.schema.json` - JSON-Schema definition for directory entries.
- `x402-registry/src/schemas/pointerMessage.schema.json` - JSON-Schema definition for pointer messages.
- `x402-registry/src/validators/validateDirectoryEntry.ts` - Utility to validate directory entry JSON against schema.
- `x402-registry/src/helpers/fetchEndpoints.ts` - Agent helper with caching to pull and parse endpoints from the directory topic.
- `test/cli/registry.test.ts` - Unit tests for CLI command logic (mocked Hedera SDK).
- `test/helpers/fetchEndpoints.test.ts` - Unit tests for the `fetchEndpoints` helper.
- `test/integration/registry.integration.test.ts` - End-to-end tests against Hedera testnet with CLI add-endpoint validation and update-price functionality testing.

### Notes

- Place unit tests alongside or under a parallel `test/` directory using the same relative structure.
- Run all tests with `bun test` or a specific file with `bun test path/to/test.ts`.
- Remember to **never** commit real private keys; use environment variables loaded from `.env` instead.

## Tasks

- [x] 1.0 Project setup in /x402-registry & Hedera SDK configuration

  - [x] 1.1 Scaffold a new Bun TypeScript project in `x402-registry` using `bun init` (select "typescript").
  - [x] 1.2 Install dependencies with Bun: `bun add @hashgraph/sdk@^2 dotenv ajv`.
  - [x] 1.3 (Optional) Add dev-only types: `bun add -d @types/node`.
  - [x] 1.4 Configure `tsconfig.json` for ES2020 output, `resolveJsonModule`, and strict type-checking (Bun respects tsconfig).
  - [x] 1.5 Define convenience scripts in `package.json` (or use Bun directly):
    - `"cli": "bun run src/cli/registry.ts"`
    - `"build": "bun build src/cli/registry.ts --outfile dist/registry.js"`
    - `"test": "bun test"`
  - [x] 1.6 Create `.env.example` documenting required variables (`OPERATOR_ID`, `OPERATOR_KEY`, etc.).
  - [x] 1.7 Write a concise `README.md` explaining setup, env vars, and common Bun commands.

- [x] 2.0 Implement Directory & Pointer topic models and message schemas

  - [x] 2.1 Define `DirectoryEntry` and `PointerMessage` TypeScript interfaces reflecting the PRD tables.
  - [x] 2.2 Draft JSON-Schema files for each message type to enable runtime validation.
  - [x] 2.3 Implement `validateDirectoryEntry` and `validatePointerMessage` utilities using Ajv.
  - [x] 2.4 Add unit tests that feed valid and invalid samples to each validator and assert outcomes.

- [x] 3.0 Develop CLI utility (executed with `bun run src/cli/registry.ts`) for adding endpoints and updating prices

  - [x] 3.1 Create `src/cli/registry.ts` to parse argv (`process.argv`) for sub-commands.
  - [x] 3.2 Build helper in `lib/hederaClient.ts` to wrap Hedera SDK calls for topic creation and message submission.
  - [x] 3.3 Implement `add-endpoint <jsonFile>`:
    - [x] 3.3.1 Read & validate JSON file against directory schema.
    - [x] 3.3.2 Create pointer topic with submit key restricted to caller.
    - [x] 3.3.3 Submit directory entry to the directory topic with custom 10 HBAR fixed fee.
    - [x] 3.3.4 Submit initial price message to the new pointer topic.
  - [x] 3.4 Implement `update-price <pointerTopicId> <price>`: validate price, increment version, and submit message.
  - [x] 3.5 Provide clear console output and exit codes for success/failure.

- [x] 4.0 Implement Agent SDK helper function `fetchEndpoints()`

  - [x] 4.1 Create `src/helpers/fetchEndpoints.ts` exporting `async function fetchEndpoints(): Promise<DirectoryEntry[]>`.
  - [x] 4.2 Use Hedera Mirror Node REST API to fetch all messages from the directory topic configured ID.
  - [x] 4.3 Parse message contents into `DirectoryEntry[]`, deduplicate by `id`, and sort alphabetically.
  - [x] 4.4 Add optional in-memory caching (TTL 30 s) to avoid redundant network calls in tight loops.

- [x] 5.0 Write integration tests
  - [x] 5.1 Configure Bun's test runner to run integration tests serially and allow longer timeouts (≥60 s).
  - [x] 5.2 Happy-path test: call CLI `add-endpoint` with sample JSON and assert directory topic received the entry.
  - [x] 5.3 Use `fetchEndpoints()` to verify the new endpoint appears with correct fields.
  - [x] 5.4 Call CLI `update-price` and then fetch latest price from pointer topic, asserting version increment.
