const { defineConfig } = require('cypress')

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    charts: true,
    reportPageTitle: 'Echo Project E2E Test Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
    // mochaFile: 'reports/test-results-[hash].json' // 如果需要输出到单独文件
  },
  e2e: {
    baseUrl: 'http://localhost:3000', // 假设前端开发服务器运行在3000端口
    setupNodeEvents(on, config) {
      // 集成 cypress-mochawesome-reporter
      require('cypress-mochawesome-reporter/plugin')(on);

      // implement node event listeners here
      // 例如，集成 cypress-axe 的 task
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        },
      })
    },
  },
}) 