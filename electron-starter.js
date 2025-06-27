const { spawn } = require('child_process');
const net = require('net');

// Function to check if port is in use
const portInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};

// Start Vite and Electron
async function startApp() {
  // Check if port 5173 is already in use (Vite server running)
  const isViteRunning = await portInUse(5173);
  
  let viteProcess;
  if (!isViteRunning) {
    console.log('Starting Vite development server...');
    viteProcess = spawn('npm', ['run', 'dev'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    // Wait for Vite to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('Starting Electron...');
  const electronProcess = spawn('electron', ['.'], { 
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ELECTRON_START_URL: 'http://localhost:5173'
    }
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    if (viteProcess) viteProcess.kill();
    process.exit(code);
  });
}

startApp().catch(err => {
  console.error('Error starting application:', err);
  process.exit(1);
});