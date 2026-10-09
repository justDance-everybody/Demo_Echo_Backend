const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://xkvwqhdfaegy.sealosgzg.site',
      changeOrigin: true,
      secure: false,
    })
  );
};


