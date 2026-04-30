// Combined bootstrap - loads all modules sequentially and initializes app
(async () => {
  try {
    console.log('Step 1: Loading seed module...');
    const seedModule = await import('./src/data/seed.js');
    console.log('Step 1 OK: Seed module loaded');
    
    window.LISTINGS = seedModule.LISTINGS;
    window.COUNTIES = seedModule.COUNTIES;
    window.SCRAPE_JOBS = seedModule.SCRAPE_JOBS;
    window.REDEMPTION_PERIODS = seedModule.REDEMPTION_PERIODS;
    window.STATE_DATA = seedModule.STATE_DATA;
    
    console.log('Step 2: Loading utils module...');
    const utilsModule = await import('./src/lib/utils.js');
    console.log('Step 2 OK: Utils module loaded');
    window.utils = utilsModule;
    
    console.log('Step 3: Loading app module...');
    await import('./src/app.js');
    console.log('Step 3 OK: App module loaded');
    
  } catch (e) {
    console.error('Bootstrap failed:', e.message);
    console.error('Stack:', e.stack);
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `<div style="padding:40px;color:#ff6b6b;font-family:monospace;font-size:11px">
        <strong>INITIALIZATION ERROR</strong><br><br>
        ${e.message}<br><br>
        <small>${e.stack?.split('\n').slice(0,3).join('<br>') || ''}</small>
      </div>`;
    }
  }
})();
