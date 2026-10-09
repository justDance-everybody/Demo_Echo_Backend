# Product goal and current boundary

## Goal

The product is a voice-first assistant for a phone browser. A user speaks an intent. The AI should discover available capabilities dynamically, select suitable tools, plan and combine actions, recover from failures, and return the result. Tool sources may include MCP, CLI, and HTTP. A blockchain action may be an example capability, but the product is not a fixed blockchain task list.

The interaction goal is to require as few user steps as possible. User preferences should accumulate into durable memory and improve later interactions.

## Current implementation boundary

This repository consolidates the old source baseline only. It contains an older intent and tool execution path and a React voice interface. It does not implement autonomous capability discovery or persistent preference memory. Existing session and log records may inform future memory work, but they are not evidence that preference memory already exists.

The old confirmation gates and interaction steps are candidates for future redesign. Phone browser voice compatibility has not been fixed or verified. This consolidation does not implement the new product behavior, execute tools, or change the database.
