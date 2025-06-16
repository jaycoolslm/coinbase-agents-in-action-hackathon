# Hedera API Registry – Query Action Provider PRD

## 1. Introduction / Overview

Today our on-chain AI agent (defined in `agent/index.ts`) can execute endpoints **after** it already knows their URL and JSON schema via `x402ActionProvider()`. However, neither the agent nor the human chatting with it has a built-in way to **discover** what endpoints exist inside the Hedera Registry topic or inspect an endpoint's request / response schema.

This feature adds a _Registry Query_ action provider so a human user can:

1. Ask the agent "What APIs are available?" and receive a concise list of published endpoints with purpose descriptions.
2. Select an endpoint from that list and ask the agent for its full JSON schema and current price.
3. After the agent surfaces that information, it can immediately call the endpoint using the already-implemented `x402ActionProvider()`.

The goal is a hackathon-friendly MVP: no advanced filtering or error handling—just fast, reliable discovery.

---

## 2. Goals

1. Expose two new actions – `list-endpoints` and `get-endpoint-schema` – through a custom `registryQueryActionProvider()`.
2. Allow the **human-agent conversation** to surface endpoint choices and schema details in ≤ 3 seconds for < 100 endpoints.
3. Re-use existing helper utilities (`fetchEndpoints`, `fetchLatestPointerMessage`) without new environment variables.
4. Keep the implementation simple enough that a junior developer can read, understand, and extend it within a day.

---

## 3. User Stories

1. **Discover APIs**  
   _As a_ user chatting with the agent, _I want_ to ask "Which APIs can you call?" _so that_ I can see the list of services and decide which one fits my need.

2. **Inspect Schema**  
   _As a_ user who has chosen an API (e.g., `text-summarizer-api`), _I want_ to ask "Show me its request/response format" _so that_ I understand how to craft input data.

3. **Agent Continuation**  
   _As an_ AI agent, _I want_ to store the schema returned by `get-endpoint-schema` in chat history _so that_ I can immediately invoke the endpoint with `x402ActionProvider()`.

---

## 4. Functional Requirements

1. **Action Provider Skeleton**  
   1.1. Create `RegistryQueryActionProvider` extending `ActionProvider<WalletProvider>` (file: `agent/providers/registryQueryActionProvider.ts`).
2. **`list-endpoints` Action**  
   2.1. No input parameters.  
   2.2. Uses `fetchEndpoints()` to retrieve all entries from the directory topic.  
   2.3. Returns an **array of objects** `{ id, description, method, url, price_usdc }` as a JSON string.
3. **`get-endpoint-schema` Action**  
   3.1. Input schema: `z.object({ pointer_topic_id: z.string() })`.  
   3.2. Uses `fetchLatestPointerMessage(pointer_topic_id)` to obtain the most recent `PointerMessage`.  
   3.3. Returns the full pointer message (price, version, request_schema, response_schema) as a JSON string.
4. **Network Support**  
   4.1. `supportsNetwork` returns `true` for all networks (identical to existing helpers).
5. **AgentKit Integration**  
   5.1. Register the new provider in `initializeAgent()` inside `agent/index.ts` **before** `x402ActionProvider()` so the agent sees the discovery actions first.
6. **TypeScript Decorators**  
   6.1. Ensure `experimentalDecorators` & `emitDecoratorMetadata` are already enabled in `tsconfig.json`; if not, update it.
7. **Documentation**  
   7.1. Update README to show two new commands the user can try in chat:  
    • "list available APIs"  
    • "get schema for text-summarizer-api".

---

## 5. Non-Goals (Out of Scope)

- Advanced filtering (price range, keywords, pagination, etc.).
- Writing the logic that **invokes** the endpoint (already handled by `x402ActionProvider`).
- Caching logic beyond what `fetchEndpoints()` already provides.
- Comprehensive error handling; assume happy paths for MVP.

---

## 6. Design Considerations

- **Return Format:** Keeping outputs as JSON strings lets the LLM parse or display them flexibly.
- **Action Names:** Prefix actions with verbs (`list-`, `get-`) to make intentions obvious to the LLM.
- **User Experience:** The agent should summarise long lists (e.g., > 10 endpoints) automatically for readability.

---

## 7. Technical Considerations

- **Helpers:** Re-use existing `fetchEndpoints()` and `fetchLatestPointerMessage()` (import from `x402-registry`).
- **Dependencies:** No new external packages needed beyond `zod` (already present) and `@coinbase/agentkit`.
- **Environment Variables:** None beyond those already required by `fetchEndpoints()` (e.g., `DIRECTORY_TOPIC_ID`).

---

## 8. Success Metrics

| Metric                 | Target                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Time to list endpoints | ≤ 3 s for ≤ 100 entries                                                                    |
| Time to fetch schema   | ≤ 2 s after selection                                                                      |
| Agent usability        | Manual demo shows agent can pick an endpoint and call it end-to-end without dev assistance |

---

## 9. Open Questions

1. Should `list-endpoints` include the `pointer_topic_id` field directly, or should the agent call `get-endpoint-schema` with the ID returned from the list? (Current plan: include it to save a lookup.)
2. How should enormous request/response schemas (> 2 KB) be truncated or summarised for chat output?

---

_End of document_
