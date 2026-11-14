const path = require('path');

module.exports = {
  apps: [
    {
      name: 'ranura-dasbor',
      script: 'server.ts',
      node_args: '--import tsx',
      cwd: __dirname,
      autorestart: true,
      watch: ['server.ts'],
      ignore_watch: ['node_modules', 'dist', 'data', '.git', '*.log', '*.bat'],
      max_restarts: 100,
      restart_delay: 2000,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    {
      name: 'ranura-bot',
      script: 'bot.ts',
      node_args: '--import tsx',
      cwd: __dirname,
      autorestart: true,
      watch: ['bot.ts'],
      ignore_watch: ['node_modules', 'dist', 'data', '.git', '*.log', '*.bat'],
      max_restarts: 100,
      restart_delay: 2000,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      }
    }
  ]
};
