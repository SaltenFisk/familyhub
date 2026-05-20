module.exports = {
  apps: [
    {
      name: 'familyhub',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        BASE_PATH: '/familyhub',
      },
    },
  ],
}
