/**
 * PM2 — PrepIndia monolith (UI + API on port 3000)
 */
module.exports = {
  apps: [
    {
      name: 'prepindia-app',
      cwd: __dirname + '/..',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/prepindia/pm2-error.log',
      out_file: '/var/log/prepindia/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
