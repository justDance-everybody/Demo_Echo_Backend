require('dotenv').config();
const path = require('path');

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  },
  
  mcp: {
    clientPath: process.env.MCP_CLIENT_PATH || path.resolve(__dirname, '../../../MCP_Client/src/mcp_client.py'),
    configPath: process.env.MCP_CONFIG_PATH || path.resolve(__dirname, '../../../MCP_Client/config'),
    pythonPath: process.env.MCP_PYTHON_PATH || 'python3',
    amapServerId: process.env.DEFAULT_AMAP_SERVER_ID || 'amap-maps',
    minimaxServerId: process.env.DEFAULT_MINIMAX_SERVER_ID || 'MiniMax',
    debugMode: process.env.DEBUG_MODE === 'true',
    useMockResponses: process.env.USE_MOCK_RESPONSES === 'true'
  },
  
  amap: {
    key: process.env.AMAP_KEY,
    searchEndpoint: 'https://restapi.amap.com/v3/place/text'
  },
  
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY,
    ttsEndpoint: process.env.MINIMAX_TTS_ENDPOINT || 'https://api.minimax.chat/v1/text-to-speech'
  },
  
  llm: {
    apiKey: process.env.LLM_API_KEY,
    endpoint: process.env.LLM_ENDPOINT
  }
};

module.exports = config; 