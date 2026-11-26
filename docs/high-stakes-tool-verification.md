# High-Stakes Tool Verification: From Screenless Voice Execution to Self-Evolving Harnesses

> **Scope**: How EchoOS gates irreversible external actions (such as on-chain transfers and swaps in our Sept 2025 wearable prototype), how key custody transitions from isolated MCP workers to hardware roots of trust, and why long-horizon tool composition requires Harness × Benchmark co-evolution (RSI).

---

## 1. End-to-End Execution Flow & Code Pointers

EchoOS was built as a modular, self-evolving Personal Agent runtime where capabilities (`MCP / Tools / CLIs`) snap in dynamically while irreversible write actions are gated in deterministic code outside the model.

- **Current Auditable Runtime (`main`, <1,000 LOC Python)**:
  - Deterministic turn-counter & parameter-freeze confirmation gate: [`echo_agent/confirm.py`](../echo_agent/confirm.py)
  - Adversarial unit & e2e tests (preventing model self-confirmation and parameter tampering): [`tests/test_confirm.py`](../tests/test_confirm.py), [`tests/test_e2e.py`](../tests/test_e2e.py)
  - Stateless remote MCP executor: [`echo_agent/mcp_remote.py`](../echo_agent/mcp_remote.py)
- **Sept 2025 Voice-to-Solana Prototype (`consolidate/voice-demo` & tag `v1.0-2025`)**:
  - Original 2025 full-stack prototype snapshot: [`v1.0-2025`](https://github.com/justDance-everybody/EchoOS/tree/v1.0-2025)
  - Pluggable Solana & Jupiter DEX MCP module (`transfer`, `executeSwap`, `getBalance`, `getSwapQuote`): [`MCP_server/web3-mcp/build/chains/solana/solana.js`](https://github.com/justDance-everybody/EchoOS/blob/consolidate/voice-demo/MCP_server/web3-mcp/build/chains/solana/solana.js)

```text
[Wearable / Audio Pipe] ──PCM16──▶ [Realtime Speech Model] ──tool_call(transfer)──▶ [Confirm Gate: Freeze Pending Snapshot]
        ▲                                                                                      │
        └────────── Spoken Summary ("Send 0.001 SOL to <alias>. Confirm?") ◀───────────────────┘
        │
  (Next User Spoken Turn: "Confirm")
        │
        ▼
[Confirm Gate: Verify user_turns > pending.user_turn] ──Frozen Args──▶ [Isolated MCP Worker] ──▶ On-Chain Tx Receipt
```

---

## 2. Key Custody & Approval: Server MCP Worker vs. Hardware Root of Trust

A critical architectural distinction separates our **September 2025 wearable demo** from an **on-device hardware root of trust** (such as Solana Mobile's Seeker + Seed Vault):

1. **How the September 2025 Demo Signed (`No App, No Wallet UI`)**:
   - In the Sept 2025 prototype ([`solana.js`](https://github.com/justDance-everybody/EchoOS/blob/consolidate/voice-demo/MCP_server/web3-mcp/build/chains/solana/solana.js)), the earbuds and client held zero keys and exposed no execution endpoint.
   - The signing keypair (`SOLANA_PRIVATE_KEY`) resided inside an isolated backend `web3-mcp` worker process.
   - **Who approved the signature**: The human user approved it via a **second spoken turn**, enforced by the server-side turn gate ([`echo_agent/confirm.py`](../echo_agent/confirm.py)). Until the user's turn counter advanced after the spoken readback, the MCP worker could not be invoked to call `sendAndConfirmTransaction`.
2. **The Tension with Hardware Enclaves (e.g., Seed Vault)**:
   - On a mobile device with a hardware root of trust, Seed Vault enforces an on-device UI/biometric approval per transaction. Therefore, `"no wallet UI"` and `"direct Seed Vault signing"` cannot coexist on a single un-delegated call today.
   - **The Architectural Bridge (Tiered Authority)**: If an all-day Personal Agent forces the user to pull out their phone and tap a screen for every micro-action, the screenless voice interface loses its purpose. The practical architecture splits authority into two tiers:
     - **Tier 1 (Screenless / Policy-Scoped Session Keys)**: Low-value actions to whitelisted recipients pass through the deterministic pre-sign verification harness and sign via a revocable, cap-limited session key without waking the screen.
     - **Tier 2 (Hardware Escalation)**: Any new recipient, threshold breach, or anomaly detected by the pre-sign verifier escalates to a full on-device Seed Vault approval prompt.

---

## 3. What the Deterministic Pre-Sign Verifier Concretely Checks

In [`echo_agent/confirm.py`](../echo_agent/confirm.py) and our transaction MCP configuration, the pre-sign gate enforces four deterministic invariants before any write tool executes:

1. **Read / Write Privilege Separation**: Read-only tools (`getBalance`, `getSwapQuote`, `getAccountInfo`) execute immediately (`confirm: false`). Irreversible state-mutating tools (`transfer`, `executeSwap`) are trapped on first invocation and never execute in the same turn.
2. **Immutable Parameter Snapshot (`Pending` Freeze)**: When `transfer(toAddress, amount)` is proposed, the exact arguments are frozen server-side under a short-lived `action_id` (`ttl_s = 120`). When `confirm_action(action_id)` is subsequently called, **any new or mutated arguments passed by the model are discarded** (verified by [`tests/test_confirm.py::test_confirm_ignores_new_args`](../tests/test_confirm.py)), eliminating confirm-step address or amount swapping.
3. **Strict Turn-Counter Gate (Anti-Self-Confirmation & Replay Protection)**: Each `Pending` snapshot records `self.user_turns` at creation and is deleted immediately upon execution or cancellation (single-use nonce). `confirm_action` rejects the call if `self.user_turns <= pending.user_turn` ([`tests/test_e2e.py::test_model_cannot_confirm_on_users_behalf`](../tests/test_e2e.py)), making it impossible for a hallucinating or prompt-injected model to confirm on the user's behalf within the same turn.
4. **Alias Resolution & Post-Execution Receipt Grounding**: Users never dictate raw Base58 addresses over voice; contact aliases resolve against an explicit allowlist, `amount` and `slippageBps` are schema-bounded, and the runtime blocks completion claims until a verified transaction signature is returned by the RPC node.

---

## 4. Where Static Rules Hit a Ceiling (Why We Focus on Harness × Benchmark RSI)

Building and stress-testing this voice-to-chain pipeline revealed a sharp boundary: **deterministic gates eliminate unauthorized execution and parameter tampering, but they do not solve probabilistic semantic failures across multi-step tool composition**:

- **Mid-utterance intent revision**: When a user corrects an instruction mid-stream (*"Send 2 SOL to Alice... wait, make it 0.5"*), stale slot values frequently leak into the proposed tool call before the gate.
- **Acoustic & VAD confirmation stalls**: Standard semantic VAD often drops short spoken confirmations (*"yes"*, *"confirm"*) as background backchannels (documented in our 39-run live evaluation in [`docs/engineering-notes.md`](engineering-notes.md)).
- **Compositional drift at scale**: As a Personal Agent dynamically discovers and chains dozens of pluggable `MCP / Tool / CLI` blocks, hand-written prompt rules decay into unmeasured regressions.

This is why our frontier AI research team—spanning foundation-model pretraining (146B MoE across nearly 10,000 Nvidia GPUs in 2024), agent memory, and runtime frameworks—treats high-stakes execution (like on-chain settlement) as a high-signal proving ground for **Agent Harness × Adversarial Benchmark Co-Evolution (RSI)**: systematically capturing failure trajectories, verifying harness updates under null-model ablations, and internalizing reliability gains without human hand-tuning.
