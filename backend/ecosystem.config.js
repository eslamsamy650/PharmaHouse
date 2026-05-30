module.exports = {
  apps: [
    {
      name: 'pharmacy-server',
      script: 'server.js',
      cwd: 'C:\\Users\\Diaa\\Desktop\\Pharmaceutical Warehousing System\\backend',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
