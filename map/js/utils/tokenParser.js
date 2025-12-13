/**
 * Token parsing utilities for hash-based layer syntax
 * Supports formats like:
 * - +layerName, ~layerName (show/hide)
 * - +layerName#2 (auto-incremented layers)
 * - +layerName.geojson, +layerName.csv (explicit file formats)
 * - +layerName(sourceHint) (styling from reference layer)
 * - +layerName(name=value) (property filters)
 * - +layerName(sourceHint,name=value,type!=other) (combined)
 * - +layerName:follow, +layerName:follow+1000 (path animation)
 * - +wayback:20240215 (satellite imagery by date)
 */

/**
 * Split layer tokens by comma, respecting parentheses nesting
 * @param {string} str - Comma-separated layer tokens
 * @returns {string[]} Array of sanitized tokens
 */
export function splitLayerTokens(str) {
  const tokens = [];
  let current = '';
  let parenDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') {
      parenDepth++;
      current += ch;
    } else if (ch === ')') {
      parenDepth--;
      current += ch;
    } else if (ch === ',' && parenDepth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  
  if (current.trim()) tokens.push(current.trim());
  
  // Sanitize and decode tokens
  return tokens.map(token => {
    let decoded = token;
    try {
      decoded = decodeURIComponent(token);
    } catch (e) {
      // Keep original if decode fails
    }
    // Remove dangerous characters but keep square brackets for filter syntax
    decoded = decoded.replace(/[<>"'`]/g, '');
    // Trim whitespace
    decoded = decoded.trim();
    return decoded;
  });
}

/**
 * Parse parentheses content into source hint and filter expressions
 * Examples:
 *   "roads" -> { sourceHint: 'roads', filters: [] }
 *   "name=foo" -> { sourceHint: null, filters: ['name=foo'] }
 *   "roads,name=foo,type!=bar|baz" -> { sourceHint: 'roads', filters: ['name=foo','type!=bar|baz'] }
 * 
 * @param {string} argStr - Content inside parentheses
 * @returns {{sourceHint: string|null, filters: string[]}}
 */
export function parseParenArgs(argStr) {
  if (!argStr || typeof argStr !== 'string') {
    return { sourceHint: null, filters: [] };
  }
  
  // Split by commas first, then split each part by '.' to support legacy multi-expr like a=b.c=d
  const rawParts = argStr.split(',')
    .flatMap(p => p.split('.'))
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  let sourceHint = null;
  const filters = [];
  
  rawParts.forEach((part) => {
    if (part.includes('=')) {
      filters.push(part);
    } else if (!sourceHint) {
      sourceHint = part;
    }
    // Extra non '=' parts beyond the first are ignored
  });
  
  return { sourceHint, filters };
}

/**
 * Build parentheses string from source hint and filter expressions
 * @param {string|null} sourceHint - Reference layer for styling
 * @param {string[]} filterExprs - Array of filter expressions
 * @returns {string} Parentheses string or empty string
 */
export function buildParenArgs(sourceHint, filterExprs) {
  const parts = [];
  if (sourceHint) parts.push(sourceHint);
  (filterExprs || []).forEach(expr => {
    if (expr && expr.trim()) parts.push(expr.trim());
  });
  return parts.length ? `(${parts.join(',')})` : '';
}

/**
 * Convert a filter expression string into a Mapbox GL filter array
 * Examples:
 *   "name=jabalia" -> ['==', ['get', 'name'], 'jabalia']
 *   "name=jabalia|beit_hanoun" -> ['any', ['==', ['get', 'name'], 'jabalia'], ['==', ['get', 'name'], 'beit_hanoun']]
 *   "type!=boundary" -> ['!=', ['get', 'type'], 'boundary']
 * 
 * @param {string} filterExpr - Filter expression (property=value or property!=value)
 * @returns {Array|null} Mapbox GL filter array or null if invalid
 */
export function parseFilterExprToMapbox(filterExpr) {
  if (!filterExpr) return null;
  
  const match = filterExpr.match(/^([^=!]+)(=|!=)(.+)$/);
  if (!match) return null;
  
  const [, property, operator, rawValue] = match;
  const decoded = decodeURIComponent(rawValue);
  const values = decoded.split('|').map(v => (isNaN(v) ? v : Number(v)));
  
  if (operator === '=') {
    if (values.length === 1) {
      return ['==', ['get', property], values[0]];
    }
    return ['any', ...values.map(val => ['==', ['get', property], val])];
  } else if (operator === '!=') {
    if (values.length === 1) {
      return ['!=', ['get', property], values[0]];
    }
    return ['all', ...values.map(val => ['!=', ['get', property], val])];
  }
  
  return null;
}

/**
 * Combine multiple filter expressions into a single Mapbox filter using 'all'
 * @param {string[]} filterExprs - Array of filter expressions
 * @returns {Array|null} Combined Mapbox GL filter array or null
 */
export function combineFilterExprsToMapbox(filterExprs) {
  const frags = (filterExprs || [])
    .map(expr => parseFilterExprToMapbox(expr))
    .filter(Boolean);
  
  if (!frags.length) return null;
  if (frags.length === 1) return frags[0];
  return ['all', ...frags];
}
