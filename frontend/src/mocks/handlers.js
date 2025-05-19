import { rest } from 'msw';
import { v4 as uuidv4 } from 'uuid'; // For generating tool_ids if needed

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
};

const mockSystemTools = [
  {
    tool_id: 'mcp_system_transfer',
    name: 'System MCP Token Transfer',
    description: 'System default token transfer using MCP.',
    type: 'mcp',
    provider: 'System',
    server_name: 'mcp_server_1',
    endpoint: { /* MCP specific endpoint config */ },
    request_schema: { /* schema */ },
    response_schema: { /* schema */ },
    tags: ['system', 'mcp', 'finance'],
    created_at: '2024-01-15T10:00:00Z',
    rating: 4.5,
  },
  {
    tool_id: 'http_system_weather',
    name: 'System HTTP Weather API',
    description: 'System default weather service.',
    type: 'http',
    provider: 'System',
    endpoint: {
      url: 'https://api.weather.example.com/system',
      method: 'GET',
      platform_type: 'generic_http',
    },
    request_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    response_schema: { /* schema */ },
    tags: ['system', 'http', 'weather'],
    created_at: '2024-02-20T11:00:00Z',
    rating: 4.2,
  },
  {
    tool_id: 'dev_tool_translator',
    name: 'Advanced Translator (Dev)',
    description: 'Community-provided translation service with more languages.',
    type: 'http',
    provider: 'DeveloperCommunity',
    isDeveloperTool: true,
    endpoint: {
      url: 'https://api.devtranslate.example.com/translate',
      method: 'POST',
      platform_type: 'generic_http',
    },
    request_schema: { type: 'object', properties: { text: { type: 'string' }, target_lang: { type: 'string'} }, required: ['text', 'target_lang'] },
    response_schema: { /* schema */ },
    tags: ['developer', 'http', 'translation', 'ai'],
    created_at: '2024-05-01T15:30:00Z',
    rating: 4.8,
  },
  {
    tool_id: 'dev_tool_imagegen',
    name: 'AI Image Generator (Dev)',
    description: 'Generate images from text prompts, by a third-party dev.',
    type: 'http',
    provider: 'ArtAIProvider',
    isDeveloperTool: true,
    endpoint: {
      url: 'https://api.ai-image.example.com/generate',
      method: 'POST',
      platform_type: 'generic_http',
    },
    request_schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
    response_schema: { /* schema */ },
    tags: ['developer', 'http', 'image', 'generation', 'creative'],
    created_at: '2024-04-10T09:00:00Z',
    rating: 4.9,
  }
];

// Database for developer-specific tools
let developerToolsDb = [
  {
    tool_id: 'dev_owned_dify_app_123',
    name: 'My Custom Dify App (Dev)',
    description: 'A Dify application integrated by the developer.',
    type: 'http',
    provider: 'devuser',
    isDeveloperTool: true,
    status: 'enabled',
    endpoint: {
      url: 'https://dify.example.com/api/dev-app-1/completion-messages',
      method: 'POST',
      platform_type: 'dify',
      authentication: { type: 'bearer', token: 'dify-secret-token-dev1' },
      dify_config: {
        app_id: 'dify-app-id-123', // Example app_id
        user_query_variable: 'query',
        fixed_inputs: { "scene_mode": "chat" }
      }
    },
    documentation: 'This is a Dify app for testing. Input: query (string). Output: text response.',
    request_schema: { },
    response_schema: { },
    tags: ['developer', 'http', 'dify', 'custom'],
    created_at: '2024-05-15T10:00:00Z',
    rating: 0, 
  },
  {
    tool_id: 'dev_owned_coze_bot_456',
    name: 'Personal Coze Bot (Dev)',
    description: 'A Coze bot for personal assistance, by the developer.',
    type: 'http',
    provider: 'devuser',
    isDeveloperTool: true,
    status: 'disabled',
    endpoint: {
      url: 'https://coze.example.com/api/v2/chat',
      method: 'POST',
      platform_type: 'coze',
      authentication: { type: 'api_key', key_name: 'Authorization', api_key: 'Bearer coze-secret-key-dev1' }, 
      coze_config: {
        bot_id: 'coze-bot-xyz789',
        user_query_variable: 'query' 
      }
    },
    documentation: 'This is a Coze bot. Input: query (string). Output: chat message.',
    request_schema: { },
    response_schema: { },
    tags: ['developer', 'http', 'coze', 'chatbot'],
    created_at: '2024-05-16T11:30:00Z',
    rating: 0,
  }
];

export const handlers = [
  // Authentication
  rest.post('/auth/register', async (req, res, ctx) => {
    const { username, email, password } = await req.json();
    if (!username || !email || !password) {
      return res(ctx.status(400), ctx.json({ error: { code: 'INVALID_PARAM', msg: 'Missing fields' } }));
    }
    // Simulate successful registration
    return res(
      ctx.status(201),
      ctx.json({
        id: Math.floor(Math.random() * 1000),
        username,
        email,
      })
    );
  }),

  rest.post('/auth/login', async (req, res, ctx) => {
    const { username, password } = await req.json();
    if (username === 'testuser' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'fake-jwt-token-string-for-testing',
          user: mockUser,
        })
      );
    } else if (username === 'devuser' && password === 'password') {
        return res(
            ctx.status(200),
            ctx.json({
                token: 'fake-jwt-developer-token-string',
                user: { ...mockUser, id: 2, username: 'devuser', role: 'developer' }
            })
        );
    } else {
      return res(
        ctx.status(401),
        ctx.json({ error: { code: 'AUTH_FAILED', msg: 'Invalid credentials' } })
      );
    }
  }),

  // Core API
  rest.post('/v1/api/interpret', async (req, res, ctx) => {
    const { sessionId, userId, query } = await req.json(); // Changed text to query
    if (!sessionId || userId === undefined || !query) {
      return res(ctx.status(400), ctx.json({ error: { code: 'INVALID_PARAM', msg: 'Missing fields for interpret' } }));
    }

    let action = 'unknown_tool';
    let params = {};
    let confirmText = `I understood: \"${query}\". Is that correct?`;
    const lowerText = query.toLowerCase();

    if (lowerText.includes('transfer') || lowerText.includes('mcp')) {
      action = mockSystemTools.find(t => t.tool_id === 'mcp_system_transfer').tool_id;
      params = { amount: 100, currency: 'ETH', recipient: '0x123...' };
      confirmText = `Do you want to transfer 100 ETH to 0x123... using MCP?`;
    } else if (lowerText.includes('weather')) {
      action = mockSystemTools.find(t => t.tool_id === 'http_system_weather').tool_id;
      params = { city: 'London' };
      confirmText = `Should I get the weather for London?`;
    } else if (lowerText.includes('translate') || lowerText.includes('translator')) {
      action = mockSystemTools.find(t => t.tool_id === 'dev_tool_translator').tool_id;
      params = { text: 'Hello world', target_lang: 'es' };
      confirmText = `Do you want to translate "Hello world" to Spanish?`;
    } else if (lowerText.includes('image') || lowerText.includes('generate picture')) {
      action = mockSystemTools.find(t => t.tool_id === 'dev_tool_imagegen').tool_id;
      params = { prompt: 'A cat wearing a hat' };
      confirmText = `Should I generate an image of a cat wearing a hat?`;
    } else {
       // Try to match against developer tools if no system tool matches
      const devToolMatch = developerToolsDb.find(tool => lowerText.includes(tool.name.toLowerCase().split(' ')[0]));
      if (devToolMatch) {
        action = devToolMatch.tool_id;
        // For simplicity, let's assume all dev tools take a generic 'input' param for now
        params = { input: query }; 
        confirmText = `Do you want to use the '${devToolMatch.name}' service for your query: "${query}"?`;
      }
    }

    return res(
      ctx.status(200),
      ctx.json({
        sessionId,
        type: 'confirm',
        action,
        params,
        confirmText,
      })
    );
  }),

  rest.post('/v1/api/execute', async (req, res, ctx) => {
    const { sessionId, userId, tool_id, params } = await req.json();
    if (!sessionId || !tool_id || !params) {
      return res(ctx.status(400), ctx.json({ error: { code: 'INVALID_PARAM', msg: 'Missing fields for execute' } }));
    }

    const tool = [...mockSystemTools, ...developerToolsDb].find(t => t.tool_id === tool_id);
    if (!tool) {
      return res(ctx.status(404), ctx.json({ error: { code: 'TOOL_NOT_FOUND', msg: `Tool ${tool_id} not found` } }));
    }

    if (tool.isDeveloperTool && tool.status === 'disabled') {
      return res(ctx.status(403), ctx.json({ error: { code: 'TOOL_DISABLED', msg: `Tool ${tool_id} is currently disabled by the developer.`}}));
    }

    let responseData = {};
    // Simulate execution based on tool type or platform_type
    if (tool.type === 'mcp') {
      responseData = { success: true, data: { transactionHash: `0x_mcp_tx_${Date.now()}`, message: `MCP call to ${tool.name} successful.` } };
    } else if (tool.type === 'http') {
      if (tool.endpoint?.platform_type === 'dify') {
        responseData = { success: true, data: { answer: `Dify app '${tool.name}' processed '${params[tool.endpoint.dify_config?.user_query_variable || 'query']}'. Mocked response.`, conversation_id: `dify_conv_${Date.now()}` } };
      } else if (tool.endpoint?.platform_type === 'coze') {
        responseData = { success: true, data: { answer: `Coze bot '${tool.name}' responded to '${params[tool.endpoint.coze_config?.user_query_variable || 'query']}'. This is a mock.`, conversation_id: `coze_conv_${Date.now()}` } };
      } else { // Generic HTTP
        responseData = { success: true, data: { message: `HTTP call to ${tool.name} successful. Input was: ${JSON.stringify(params)}` } };
      }
    } else {
      responseData = { success: false, error: { code: 'UNKNOWN_TOOL_TYPE', msg: `Tool type ${tool.type} not supported for execution.` } };
    }

    return res(ctx.status(200), ctx.json({ sessionId, ...responseData }));
  }),

  rest.get('/v1/api/tools', (req, res, ctx) => {
    const allTools = [
      ...mockSystemTools.filter(t => !t.isDeveloperTool), 
      ...developerToolsDb.filter(t => t.status === 'enabled') // Only show enabled developer tools
    ];
    return res(ctx.status(200), ctx.json({ tools: allTools }));
  }),

  // Developer API Endpoints
  rest.get('/api/dev/tools', (req, res, ctx) => {
    // This should ideally be user-specific, but for mock, return all dev tools
    return res(ctx.status(200), ctx.json({ tools: developerToolsDb }));
  }),

  rest.post('/api/dev/tools', async (req, res, ctx) => {
    const serviceData = await req.json();
    const newTool = {
      tool_id: `dev_tool_${uuidv4().slice(0,8)}`,
      provider: 'devuser', // Assuming current authenticated user is the provider
      isDeveloperTool: true,
      status: 'enabled', // Default to enabled
      created_at: new Date().toISOString(),
      rating: 0,
      tags: serviceData.tags || ['custom', serviceData.platformType || 'http'],
      // Carry over all relevant fields from serviceData
      name: serviceData.serviceName,
      description: serviceData.serviceDescription,
      type: 'http', // All dev tools are HTTP for now in this mock
      endpoint: {
        url: serviceData.endpointUrl,
        method: serviceData.method || 'POST', // Default to POST if not provided
        platform_type: serviceData.platformType,
        authentication: { type: 'bearer', token: serviceData.apiKey }, // Simplify auth for mock
        // Add platform-specific configs if they exist
        ...(serviceData.platformType === 'dify' && { dify_config: { app_id: serviceData.difyAppId, user_query_variable: serviceData.userInputVar } }),
        ...(serviceData.platformType === 'coze' && { coze_config: { bot_id: serviceData.cozeBotId, user_query_variable: serviceData.userInputVar } }),
      },
      documentation: serviceData.documentation, // Save documentation
      // request_schema and response_schema can be added later if needed for dev tools
    };
    developerToolsDb.push(newTool);
    return res(ctx.status(201), ctx.json(newTool));
  }),

  rest.put('/api/dev/tools/:toolId', async (req, res, ctx) => {
    const { toolId } = req.params;
    const updateData = await req.json();
    const toolIndex = developerToolsDb.findIndex(t => t.tool_id === toolId);
    if (toolIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Tool not found' }));
    }
    // Only allow status updates for simplicity in mock
    if (updateData.status) {
      developerToolsDb[toolIndex].status = updateData.status;
    }
    // Could extend to update other fields if necessary
    return res(ctx.status(200), ctx.json(developerToolsDb[toolIndex]));
  }),

  rest.delete('/api/dev/tools/:toolId', (req, res, ctx) => {
    const { toolId } = req.params;
    const initialLength = developerToolsDb.length;
    developerToolsDb = developerToolsDb.filter(t => t.tool_id !== toolId);
    if (developerToolsDb.length < initialLength) {
      return res(ctx.status(200), ctx.json({ message: 'Tool deleted successfully' }));
    }
    return res(ctx.status(404), ctx.json({ error: 'Tool not found for deletion' }));
  }),

  // NEW: Mock for testing an unsaved developer tool configuration
  rest.post('/api/dev/tools/test', async (req, res, ctx) => {
    const toolConfig = await req.json();
    const { platformType, apiKey, difyAppId, cozeBotId, endpointUrl, testInput, userInputVar } = toolConfig;

    if (!testInput) {
      return res(ctx.status(400), ctx.json({ success: false, error: 'Test input is required.' }));
    }

    let responseData = { success: false, error: 'Unknown platform or configuration error.', raw_response: null };

    if (platformType === 'dify') {
      if (apiKey && difyAppId && endpointUrl) {
        responseData = {
          success: true,
          raw_response: {
            dify_answer: `Mock Dify response for '${testInput}' using app ${difyAppId}. This is a simulated test.`,
            conversation_id: `test_dify_conv_${uuidv4()}`,
          }
        };
      } else {
        responseData.error = 'Dify configuration incomplete (API Key, App ID, or URL missing).';
      }
    } else if (platformType === 'coze') {
      if (apiKey && cozeBotId && endpointUrl) {
        responseData = {
          success: true,
          raw_response: {
            coze_message: `Mock Coze bot ${cozeBotId} response for '${testInput}'. Simulation successful.`,
            messages: [{ type: 'answer', content: `Mocked Coze: ${testInput}`}],
            conversation_id: `test_coze_conv_${uuidv4()}`,
          }
        };
      } else {
        responseData.error = 'Coze configuration incomplete (API Key, Bot ID, or URL missing).';
      }
    } else if (platformType === 'http') {
      if (apiKey && endpointUrl) {
        responseData = {
          success: true,
          raw_response: {
            generic_http_data: `Mock generic HTTP response for input '${testInput}' to URL ${endpointUrl}. Test OK.`,
            status_code: 200
          }
        };
      } else {
        responseData.error = 'Generic HTTP configuration incomplete (API Key or URL missing).';
      }
    } else {
      responseData.error = `Platform type '${platformType}' not supported for testing in mock.`;
    }
    await new Promise(resolve => setTimeout(resolve, 750)); // Simulate network delay
    return res(ctx.status(200), ctx.json(responseData));
  }),

  // Example for /api/dev/upload (placeholder)
  rest.post('/api/dev/upload', (req, res, ctx) => {
    // This would normally handle file uploads. For mock, just acknowledge.
    return res(ctx.status(200), ctx.json({ message: 'File upload acknowledged (mock)' }));
  }),
];

// Helper to simulate getting the authenticated user's ID or context if needed later
// function getAuthenticatedDeveloperId(req) {
//   // In a real scenario, you'd inspect the Authorization header or session
//   // For now, we can assume a fixed developer ID or a mock mechanism
//   const authToken = req.headers.get('Authorization');
//   if (authToken === 'Bearer fake-jwt-developer-token-string') {
//       return 2; // Matches devuser in login mock
//   }
//   return null; 
// } 