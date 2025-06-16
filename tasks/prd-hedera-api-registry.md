# Hedera-based API Endpoint Registry (MVP)

## 1. Introduction / Overview

This document defines the Minimum Viable Product (MVP) for an on-chain **API Endpoint Registry** built on the Hedera Consensus Service (HCS).  
The registry enables **AI Agents** to discover x402-compatible, USDC-crypto-walled REST endpoints together with their pricing information.  
API publishers write entries to a public _Directory Topic_; each entry points to a private _Pointer Topic_ that contains up-to-date pricing and commercial terms.  
The registry will be accessed programmatically—no graphical UI is required for the hackathon.

## 2. Goals

1. Publish a publicly readable, fee-gated Directory Topic that lists available x402 endpoints.
2. Allow API publishers to create and update endpoint metadata and pricing via a CLI utility.
3. Provide AI Agents with a simple way (read-only) to fetch the full list of endpoints.
4. Demonstrate end-to-end functionality via automated integration tests on Hedera **testnet**.

## 3. User Stories

1. **As an AI Agent**, I want to pull a list of available endpoints (ID, URL, method, description, price) so that I can choose the correct endpoint for a task.
2. **As an API Publisher**, I want to add my API endpoint to the Directory Topic so that Agents can discover it.
3. **As an API Publisher**, I want to update pricing/terms in my Pointer Topic so that new requests are billed correctly.

## 4. Functional Requirements

1. **Directory Topic Creation**  
   1.1 Must be a public HCS topic.  
   1.2 Must set a **custom fixed fee of 10 HBAR** per message (HIP-991).  
   1.3 Topic ID will be **hard-coded** in the MVP codebase for agent queries.
2. **Directory Message Schema** (JSON)
   | Field | Type | Notes |
   |-------|------|-------|
   | `id` | string (3-64 UTF-8) | Unique within directory |
   | `url` | string(uri) | Full endpoint (e.g. `https://api.foo.xyz/summarise`) |
   | `method` | `"GET"\|"POST"\|…` | Standard HTTP verb |
   | `description` | string ≤256 | Human-readable summary |
   | `pointer_topic_id` | string | Hedera topic ID where price lives |
   | `initial_price_usdc` | number (6 dec) | Copy of first price |
3. **Pointer Topic Creation**  
   3.1 One topic per endpoint.  
   3.2 Submit key restricted to the API publisher's account (private submission).  
   3.3 Readable by anyone (mirror node) so agents can fetch prices.
4. **Pointer Message Schema** (JSON, only the **most recent** message is authoritative)
   | Field | Type | Notes |
   |-------|------|-------|
   | `price_usdc` | number (6 dec) | Current charge per request |
   | `version` | int | Increment on every update |
   | `additional_terms` | object (optional) | Quotas, SLA, etc. |
5. **CLI Utility** (Node.js TypeScript)
   5.1 Command: `registry add-endpoint <jsonFile>` → submits directory entry + creates pointer topic + first price message.  
   5.2 Command: `registry update-price <pointerTopicId> <price>` → submits new price message.  
   5.3 Commands must sign with the caller's Hedera account & pay associated fees.  
   5.4 Validate JSON against the schemas before submission.
6. **Agent SDK Helper**  
   6.1 Provide a simple function `fetchEndpoints(): Endpoint[]` that queries the directory topic via mirror node and returns an array sorted by `id`.
7. **Integration Tests**  
   7.1 Spin up against Hedera _testnet_.  
   7.2 Test happy-path: add endpoint → fetch directory → update price → verify latest price is returned.  
   7.3 Tests must pass in CI (GitHub Actions).

## 5. Non-Goals (Out of Scope)

- Handling USDC payment settlement or x402 invocation logic.
- Advanced search, filtering, or pagination (future work).
- UI/UX beyond CLI.
- Edge-case handling for malformed messages or duplicate IDs.

## 6. Design Considerations (Optional)

- Future optimisations could include indexing the directory in a database to allow search & filter by method, cost ≤ x, etc.
- Consider using protobuf for more compact messages if on-chain cost becomes a concern.

## 7. Technical Considerations (Optional)

- Use Hedera **JS SDK v2** and Mirror Node REST API.
- JSON messages should be UTF-8 encoded and ≤6 KB to stay under HCS limits.
- Use 6-decimal fixed-point numbers for prices (e.g., `0.010000` = 1 cent).
- Credentials & private keys loaded via environment variables; none committed to git.

## 8. Success Metrics

- ✅ CLI can publish a directory entry with the 10 HBAR custom fee.
- ✅ Pointer topic price updates reflected within 5 s via mirror node.
- ✅ All integration tests pass in CI.
- ✅ Agent helper returns ≥1 endpoint in demo script.
