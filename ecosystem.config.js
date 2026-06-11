// PM2 process definition. Start: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "scamcheckerapi",
      script: "dist/server.js",
      cwd: "/var/www/scamcheckerapi",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      autorestart: true,
    },
  ],
};
