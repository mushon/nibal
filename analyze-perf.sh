#!/bin/bash

# Performance analysis script using curl and web inspection

URL="http://localhost:8000/"
REPORT_FILE="/tmp/performance-report.txt"

echo "╔════════════════════════════════════════════════════════════╗" > "$REPORT_FILE"
echo "║       NIBAL PROJECT PERFORMANCE ANALYSIS REPORT            ║" >> "$REPORT_FILE"
echo "╚════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "URL: $URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. Analyze HTML file size and structure
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "1. HTML FILE SIZE & STRUCTURE" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

HTML_SIZE=$(wc -c < /Users/mushon/www/nibal/index.html)
HTML_LINES=$(wc -l < /Users/mushon/www/nibal/index.html)
README_SIZE=$(wc -c < /Users/mushon/www/nibal/README.md)

echo "  index.html: $(numfmt --to=iec-i --suffix=B $HTML_SIZE 2>/dev/null || echo "$((HTML_SIZE / 1024))KB") ($HTML_LINES lines)" >> "$REPORT_FILE"
echo "  README.md: $(numfmt --to=iec-i --suffix=B $README_SIZE 2>/dev/null || echo "$((README_SIZE / 1024))KB")" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 2. Analyze CSS files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "2. CSS FILES" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

find /Users/mushon/www/nibal/src -name "*.css" | while read css_file; do
  size=$(wc -c < "$css_file")
  lines=$(wc -l < "$css_file")
  name=$(basename "$css_file")
  echo "  $name: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$((size / 1024))KB") ($lines lines)" >> "$REPORT_FILE"
done
echo "" >> "$REPORT_FILE"

# 3. Analyze JavaScript files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "3. JAVASCRIPT FILES" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

find /Users/mushon/www/nibal -name "*.js" -not -path "*/node_modules/*" | while read js_file; do
  size=$(wc -c < "$js_file")
  lines=$(wc -l < "$js_file")
  name=$(basename "$js_file")
  if [ $size -gt 10000 ]; then
    echo "  $name: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$((size / 1024))KB") ($lines lines) ⚠️ LARGE" >> "$REPORT_FILE"
  else
    echo "  $name: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$((size / 1024))KB") ($lines lines)" >> "$REPORT_FILE"
  fi
done
echo "" >> "$REPORT_FILE"

# 4. Analyze asset sizes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "4. ASSET FILES" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

echo "  Images (img/ folder):" >> "$REPORT_FILE"
find /Users/mushon/www/nibal/img -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" \) 2>/dev/null | while read img_file; do
  size=$(wc -c < "$img_file")
  name=$(basename "$img_file")
  if [ $size -gt 100000 ]; then
    echo "    $name: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$((size / 1024))KB") ⚠️ LARGE" >> "$REPORT_FILE"
  else
    echo "    $name: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$((size / 1024))KB")" >> "$REPORT_FILE"
  fi
done
echo "" >> "$REPORT_FILE"

# 5. Fetch and analyze page
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "5. PAGE LOAD ANALYSIS" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

# Measure time to download homepage
start_time=$(date +%s%N)
PAGE_HTML=$(curl -s "$URL")
end_time=$(date +%s%N)
load_time=$(( (end_time - start_time) / 1000000 ))

echo "  Page download time: ${load_time}ms" >> "$REPORT_FILE"
echo "  Page size: $(echo "$PAGE_HTML" | wc -c) bytes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 6. Analyze index.html in detail
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "6. INDEX.HTML STRUCTURE ANALYSIS" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

SCRIPT_COUNT=$(grep -c '<script' /Users/mushon/www/nibal/index.html)
IFRAME_COUNT=$(grep -c '<iframe' /Users/mushon/www/nibal/index.html)
LINK_COUNT=$(grep -c '<link' /Users/mushon/www/nibal/index.html)

echo "  Scripts: $SCRIPT_COUNT" >> "$REPORT_FILE"
echo "  Iframes: $IFRAME_COUNT" >> "$REPORT_FILE"
echo "  External resources: $LINK_COUNT" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 7. Identify potential performance issues
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "7. PERFORMANCE ISSUES DETECTED" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

# Check for render-blocking scripts
echo "  ✓ Checking for render-blocking resources..." >> "$REPORT_FILE"
grep -n 'defer' /Users/mushon/www/nibal/index.html | head -5 >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check CSS in head
echo "  ✓ CSS stylesheets in <head> (should be minimal):" >> "$REPORT_FILE"
grep '<link.*css' /Users/mushon/www/nibal/index.html | wc -l | xargs echo "    Count:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# README size analysis
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "8. README.MD ANALYSIS (Content Size Matters)" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"

echo "  Total README lines: $(wc -l < /Users/mushon/www/nibal/README.md)" >> "$REPORT_FILE"
echo "  Markdown links: $(grep -c '\[' /Users/mushon/www/nibal/README.md)" >> "$REPORT_FILE"
echo "  Embedded links (by character count, very expensive on mobile): $(grep -o '\[]\(' /Users/mushon/www/nibal/README.md | wc -l)" >> "$REPORT_FILE"
echo "  Iframe embeds: $(grep -c 'fg:\|bg:' /Users/mushon/www/nibal/README.md)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Mobile-specific analysis
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "9. MOBILE-SPECIFIC CONCERNS" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "  • Multiple iframes (3x) - each loads independently on mobile" >> "$REPORT_FILE"
echo "  • Large README content forces many DOM nodes" >> "$REPORT_FILE"
echo "  • Markdown parsing adds JS overhead" >> "$REPORT_FILE"
echo "  • GeoJSON layer loading on map iframes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Final recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "10. KEY RECOMMENDATIONS" >> "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << 'EOF'
CRITICAL (Mobile Impact - High):
  1. Lazy-load iframes below-the-fold
  2. Defer GeoJSON layer parsing until map iframe is visible
  3. Use intersection observers for viewport-based iframe loading
  4. Split large README into paginated sections
  
HIGH (Loading Time):
  5. Minify and compress CSS/JS assets
  6. Enable HTTP compression (gzip)
  7. Use service worker for caching
  8. Optimize images (convert PNG to WebP with fallbacks)
  
MEDIUM (Runtime Performance):
  9. Optimize Markdown parsing (consider server-side rendering)
  10. Batch DOM updates in chapters.js
  11. Debounce scroll listeners
  12. Cache computed layouts
  
LOW (Polish):
  13. Add loading indicators for iframe embeds
  14. Progressive rendering of content sections
  15. Network information API for adaptive loading

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

cat "$REPORT_FILE"
