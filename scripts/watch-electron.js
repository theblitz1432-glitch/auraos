const { build } = require('esbuild');
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

let electronProcess = null;

async function buildElectron() {
  await build({
    entryPoints: [
      path.join(__dirname, '../electron/main.ts'),
      path.join(__dirname, '../electron/preload.ts')
    ],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: path.join(__dirname, '../dist-electron'),
    external: ['electron'],
    sourcemap: 'inline',
  });
}

function startElectron() {
  if (electronProcess) {
    electronProcess.kill();
  }
  electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('close', () => {
    process.exit(0);
  });
}

async function main() {
  try {
    console.log('Building Electron main & preload scripts...');
    await buildElectron();
    console.log('Starting Electron process...');
    startElectron();
  } catch (err) {
    console.error('Failed to start Electron:', err);
    process.exit(1);
  }
}

main();
