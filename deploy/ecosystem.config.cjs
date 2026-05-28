/**
 * PM2 ecosystem — run on each EC2 app server behind ALB.
 * Usage: pm2 start deploy/ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'prepindia-web',
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
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
