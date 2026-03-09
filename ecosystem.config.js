module.exports = {
  apps: [
    {
      name: "chain-menu-api",
      cwd: "./backend",
      interpreter: "none",
      script: "./venv/Scripts/uvicorn.exe",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "chain-menu-web",
      cwd: "./frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
