## Relevant Files

- `agent/providers/registryQueryActionProvider.ts` - Implements the custom Action Provider exposing discovery actions.
- `agent/providers/registryQueryActionProvider.test.ts` - Unit tests for the provider's actions.
- `agent/index.ts` - Registers the new provider so the agent can use the actions.
- `x402-registry/src/helpers/fetchEndpoints.ts` - Existing helper to pull directory entries (imported by the provider).
- `x402-registry/src/helpers/fetchLatestPointerMessage.ts` - Created helper to fetch pointer message schemas.
- `x402-registry/src/helpers/fetchEndpoints.test.ts` - Existing tests that can be referenced/mocked.
- `agent/tsconfig.json` - Created with decorator compiler options enabled.
- `README.md` - Add usage instructions for the new actions.

### Notes

- Place unit tests alongside the code they test (e.g., `registryQueryActionProvider.test.ts`).
- Run all tests with `bun test` (or a specific file with `bun test path/to/test.ts`).

## Tasks

- [x] 1.0 Scaffold `RegistryQueryActionProvider`

  - [x] 1.1 Create `agent/providers/registryQueryActionProvider.ts` with a class extending `ActionProvider<WalletProvider>` and `supportsNetwork` returning `true`.
  - [x] 1.2 Import `z` from `zod` and add placeholder schemas for upcoming actions.
  - [x] 1.3 Verify `experimentalDecorators` and `emitDecoratorMetadata` are `true` in `tsconfig.json`; update if missing.

- [x] 2.0 Implement `list-endpoints` action

  - [x] 2.1 Define `ListEndpointsSchema = z.object({})` (no inputs).
  - [x] 2.2 Add `@CreateAction`-decorated `listEndpoints` method that calls `fetchEndpoints()`.
  - [x] 2.3 Transform results to `{ id, description, method, url, price_usdc, pointer_topic_id }` and return `JSON.stringify(array)`.
  - [x] 2.4 Write unit test mocking `fetchEndpoints()` and asserting output JSON matches expected.

- [x] 3.0 Implement `get-endpoint-schema` action

  - [x] 3.1 Define `GetEndpointSchema = z.object({ pointer_topic_id: z.string() })`.
  - [x] 3.2 Add `@CreateAction`-decorated `getEndpointSchema` that uses `fetchLatestPointerMessage(pointer_topic_id)` to fetch the latest schema.
  - [x] 3.3 Return the pointer message as a JSON string.
  - [x] 3.4 Write unit test mocking the helper and validating output.

- [x] 4.0 Wire provider into the agent

  - [x] 4.1 Import `registryQueryActionProvider()` in `agent/index.ts` and insert it before `x402ActionProvider()` in the `actionProviders` array.
  - [x] 4.2 Ensure project builds and lints cleanly (`bun test` passes existing tests).

- [ ] 5.0 Documentation & integration
  - [ ] 5.1 Update `README.md` with chat examples: "list available APIs" and "get schema for text-summarizer-api".
  - [ ] 5.2 (Optional) Add integration test that spins up the agent and exercises both actions end-to-end.
  - [ ] 5.3 Run `bun test` to confirm all new tests pass and commit changes.
