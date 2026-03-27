module.exports = {
  apps: [
    {
      name: 'chatpdm-web',
      cwd: '/srv/chatpdm/current/frontend',
      script: 'node',
      args: 'dist/frontend/server/server.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 4101,
        API_BASE_URL: 'http://127.0.0.1:4301',
      },
    },
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
      },
    },
  ],
};
