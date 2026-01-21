module.exports = {
  apps: [
    {
      name: "bakus-tms",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/home/deploy/bakus-tms/app",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
