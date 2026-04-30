// Bootstrap script - loads modules and initializes app
(async () => {
  try {
    console.log('🚀 Bootstrap loading...');
    
    // Load modules
    const seedModule = await import('./src/data/seed.js');
    const utilsModule = await import('./src/lib/utils.js');
    const appModule = await import('./src/app.js');
    
    console.log('✓ Bootstrap complete - app initialized');
  } catch (e) {
    console.error('❌ Bootstrap failed:', e.message);
    console.error(e.stack);
    
    // Show error in UI
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `
        <div style="padding: 40px; color: #ff6b6b; font-family: monospace;">
          <div style="font-weight: bold; margin-bottom: 16px;">ERROR LOADING APPLICATION</div>
          <div style="font-size: 12px; line-height: 1.6;">
            <div>${e.message}</div>
            <div style="margin-top: 16px; color: #aaa; font-size: 10px;">
              Please check the browser console for details.
            </div>
          </div>
        </div>
      `;
    }
  }
})();
