module.exports = {
  apps: [{
    name: "messenger-backend",
    script: "./server/index.js",
    watch: false,
    env: {
      NODE_ENV: "development",
      PORT: 3001
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
};
