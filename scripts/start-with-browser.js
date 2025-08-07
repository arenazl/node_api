const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const url = `http://localhost:${PORT}`;

console.log('🚀 Starting server...');
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT }
});

setTimeout(async () => {
  console.log(`🌐 Opening browser at ${url}`);
  const open = (await import('open')).default;
  open(url);
}, 2000);

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit();
});