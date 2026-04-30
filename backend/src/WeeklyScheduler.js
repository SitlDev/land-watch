const DataAggregationManager = require('./DataAggregationManager');

class WeeklyScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  /**
   * Start weekly scheduler
   * Runs aggregation every Monday at 00:00 UTC
   */
  async start() {
    if (this.isRunning) {
      console.log('◈ Weekly scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('◈ WEEKLY SCHEDULER STARTED');
    console.log('◈ Data refresh scheduled: Every Monday at 00:00 UTC');

    // Run immediately on startup
    this.scheduleNextRun();
    await this.runAggregation();
  }

  /**
   * Calculate next Monday at 00:00 UTC
   */
  scheduleNextRun() {
    const now = new Date();
    const nextMonday = new Date(now);
    
    // Calculate days until Monday (0 = Sunday)
    const daysUntilMonday = (1 - now.getUTCDay() + 7) % 7 || 7;
    
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    this.nextRun = nextMonday;
    console.log(`◈ Next scheduled run: ${nextMonday.toISOString()}`);

    // Set timeout for next run
    const millisecondsUntilNextRun = nextMonday.getTime() - now.getTime();
    setTimeout(() => {
      this.runAggregation().catch(err => {
        console.error('❌ Scheduled aggregation failed:', err);
      });
      this.scheduleNextRun();
    }, millisecondsUntilNextRun);
  }

  /**
   * Execute data aggregation from all sources
   */
  async runAggregation() {
    try {
      console.log('\n◈ WEEKLY DATA REFRESH STARTED...');
      const startTime = Date.now();

      const manager = new DataAggregationManager();
      
      // Run all scrapers
      const sources = [
        'GSA Auctions',
        'HUD Foreclosures',
        'NYC Tax Auctions',
        'County Deed Recordings'
      ];

      console.log(`◈ Running ${sources.length} data sources...`);
      const results = await manager.runSpecificSources(sources);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      this.lastRun = new Date();

      console.log(`✓ WEEKLY DATA REFRESH COMPLETE`);
      console.log(`  Duration: ${elapsed}s`);
      console.log(`  Records processed: ${results.totalFound || 0}`);
      console.log(`  Next run: ${this.nextRun.toISOString()}\n`);

      await manager.close();
      return { success: true, lastRun: this.lastRun, nextRun: this.nextRun };
    } catch (error) {
      console.error('❌ Weekly aggregation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    this.isRunning = false;
    console.log('◈ Weekly scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      schedule: 'Every Monday at 00:00 UTC'
    };
  }
}

module.exports = WeeklyScheduler;
