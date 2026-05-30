module.exports = {
  apps: [
    {
      name: 'pharmacy-server',
      script: 'server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    }
  ]
};
