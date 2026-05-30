/**
 * PM2 — PrepIndia backend (API server on port 3001)
 */
module.exports = {
  apps: [
    {
      name: 'prepindia-backend',
      cwd: __dirname + '/..',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/prepindia/pm2-backend-error.log',
      out_file: '/var/log/prepindia/pm2-backend-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
