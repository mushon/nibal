const playwright = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  
  // Desktop test
  console.log('\n=== DESKTOP TEST ===');
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  await runPerformanceTest(desktopContext, 'Desktop', 'http://localhost:8000/');
  await desktopContext.close();
  
  // Mobile test
  console.log('\n=== MOBILE TEST ===');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15'
  });
  await runPerformanceTest(mobileContext, 'Mobile', 'http://localhost:8000/');
  await mobileContext.close();
  
  // Tablet test
  console.log('\n=== TABLET TEST ===');
  const tabletContext = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15'
  });
  await runPerformanceTest(tabletContext, 'Tablet', 'http://localhost:8000/');
  await tabletContext.close();
  
  await browser.close();
})();

async function runPerformanceTest(context, label, url) {
  const page = await context.newPage();
  
  // Collect performance metrics
  const metrics = {
    label,
    url,
    metrics: {},
    resourceTimings: [],
    largeResources: [],
    slowOperations: []
  };
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(`  [PAGE LOG] ${msg.text()}`);
    }
  });
  
  try {
    // Navigate and measure
    const navigationStart = Date.now();
    await page.goto(url, { waitUntil: 'networkidle' });
    const navigationEnd = Date.now();
    
    metrics.metrics.navigationTime = navigationEnd - navigationStart;
    
    // Get performance metrics from browser
    const perfMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const paints = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart : 0,
        loadComplete: nav ? nav.loadEventEnd - nav.loadEventStart : 0,
        domInteractive: nav ? nav.domInteractive - nav.fetchStart : 0,
        resourceCount: resources.length,
        resources: resources.map(r => ({
          name: r.name,
          duration: r.duration,
          transferSize: r.transferSize,
          decodedBodySize: r.decodedBodySize
        })).sort((a, b) => b.duration - a.duration),
        paints,
        firstContentfulPaint: (paints.find(p => p.name === 'first-contentful-paint') || {}).startTime
      };
    });
    
    metrics.metrics.domContentLoaded = perfMetrics.domContentLoaded;
    metrics.metrics.loadComplete = perfMetrics.loadComplete;
    metrics.metrics.domInteractive = perfMetrics.domInteractive;
    metrics.metrics.firstContentfulPaint = perfMetrics.firstContentfulPaint;
    metrics.resourceTimings = perfMetrics.resources;
    
    // Identify large resources
    metrics.largeResources = perfMetrics.resources
      .filter(r => r.decodedBodySize > 100000)
      .map(r => ({
        name: r.name,
        size: `${(r.decodedBodySize / 1024).toFixed(1)}KB`,
        duration: `${r.duration.toFixed(0)}ms`,
        transferSize: r.transferSize
      }));
    
    // Measure layout operations
    const layoutMetrics = await page.evaluate(() => {
      const startTime = performance.now();
      
      // Scroll through the page to trigger layout operations
      let maxLayoutTime = 0;
      const checkLayout = (element) => {
        const before = performance.now();
        const rect = element.getBoundingClientRect();
        const after = performance.now();
        const layoutTime = after - before;
        if (layoutTime > maxLayoutTime) {
          maxLayoutTime = layoutTime;
        }
      };
      
      // Sample elements on the page
      const elements = document.querySelectorAll('main > *, iframe, div[id]');
      elements.forEach(el => {
        try { checkLayout(el); } catch (e) {}
      });
      
      return { maxLayoutTime };
    });
    
    metrics.metrics.maxLayoutTime = layoutMetrics.maxLayoutTime;
    
    // Scroll performance test
    await page.evaluate(() => {
      window.scrollY = 0;
    });
    
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 10);
    });
    const scrollEnd = Date.now();
    
    metrics.metrics.scrollTime = scrollEnd - scrollStart;
    
    // Get DOM size
    const domMetrics = await page.evaluate(() => {
      return {
        domNodes: document.querySelectorAll('*').length,
        textNodes: document.evaluate(
          "count(//text())",
          document,
          null,
          XPathResult.NUMBER_TYPE,
          null
        ).numberValue
      };
    });
    
    metrics.metrics.domNodes = domMetrics.domNodes;
    metrics.metrics.textNodes = domMetrics.textNodes;
    
  } catch (error) {
    console.error(`  Error during test: ${error.message}`);
    metrics.error = error.message;
  } finally {
    await page.close();
  }
  
  // Report
  console.log(`\n${label} Performance Report:`);
  console.log(`  Navigation Time: ${metrics.metrics.navigationTime}ms`);
  console.log(`  DOM Content Loaded: ${metrics.metrics.domContentLoaded ? metrics.metrics.domContentLoaded.toFixed(0) : 0}ms`);
  console.log(`  Page Load Complete: ${metrics.metrics.loadComplete ? metrics.metrics.loadComplete.toFixed(0) : 0}ms`);
  console.log(`  DOM Interactive: ${metrics.metrics.domInteractive ? metrics.metrics.domInteractive.toFixed(0) : 0}ms`);
  console.log(`  First Contentful Paint: ${metrics.metrics.firstContentfulPaint ? metrics.metrics.firstContentfulPaint.toFixed(0) : 0}ms`);
  console.log(`  Max Layout Time: ${metrics.metrics.maxLayoutTime ? metrics.metrics.maxLayoutTime.toFixed(2) : 0}ms`);
  console.log(`  Scroll Performance: ${metrics.metrics.scrollTime}ms`);
  console.log(`  DOM Nodes: ${metrics.metrics.domNodes}`);
  console.log(`  Text Nodes: ${metrics.metrics.textNodes}`);
  console.log(`  Total Resources: ${metrics.resourceTimings.length}`);
  
  if (metrics.largeResources.length > 0) {
    console.log(`\n  Large Resources (>100KB):`);
    metrics.largeResources.forEach(r => {
      console.log(`    - ${r.name.substring(r.name.lastIndexOf('/') + 1)}: ${r.size} (${r.duration})`);
    });
  }
  
  // Top slow resources
  console.log(`\n  Top 5 Slowest Resources:`);
  metrics.resourceTimings.slice(0, 5).forEach(r => {
    const name = r.name.substring(r.name.lastIndexOf('/') + 1) || r.name;
    console.log(`    - ${name}: ${r.duration.toFixed(0)}ms`);
  });
  
  // Save detailed report
  fs.writeFileSync(
    `/tmp/perf-report-${label.toLowerCase()}.json`,
    JSON.stringify(metrics, null, 2)
  );
  console.log(`\n  Detailed report saved to: /tmp/perf-report-${label.toLowerCase()}.json`);
}
