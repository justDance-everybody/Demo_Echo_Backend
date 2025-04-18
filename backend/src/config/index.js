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
  
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
    ttl: process.env.REDIS_TTL || 3600 // 默认缓存时间1小时
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