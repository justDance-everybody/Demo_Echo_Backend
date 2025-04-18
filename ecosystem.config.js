module.exports = {
  apps: [
    {
      name: "echo-backend",
      script: "./backend/src/app.js",
      max_memory_restart: "1024M",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
