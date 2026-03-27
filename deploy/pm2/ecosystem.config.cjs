module.exports = {
  apps: [
    {
      name: 'chatpdm-api',
      cwd: '/srv/chatpdm/current/backend',
      script: 'src/server.js',
      node_args: '--disable-warning=ExperimentalWarning',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4301,
        CHATPDM_FEEDBACK_DB_PATH: '/srv/chatpdm/shared/chatpdm-feedback.sqlite',
      },
    },
  ],
};
