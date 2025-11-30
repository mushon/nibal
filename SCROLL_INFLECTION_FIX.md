# Scroll-Completion-Based Inflection Fix

## Problem
Previously, when users clicked nav links or hash anchors to jump to a section, inflection (iframe loading) would trigger as the section scrolled into view during the animation, rather than waiting until the scroll completed and the section was properly centered.

## Solution Architecture

### Three-Stage Process:

#### 1. **Initiation** (in `chapters.js`)
When nav button or hash handler initiates scroll:
```javascript
window.__scrollTargetId = targetId;           // Mark the destination
window.__skipSectionInflection = true;        // Suppress intermediate inflections
window.__scrollInflectionPending = true;      // Flag that we're waiting for completion
window.__chaptersAnimating = true;            // Scroll animation in progress
```

#### 2. **Suppression** (in `index.html` section observer)
During scroll animation, filter out inflections for all sections except target:
```javascript
const duringProgrammaticScroll = window.__scrollInflectionPending && sec.id !== window.__scrollTargetId;
if (duringProgrammaticScroll) {
  return; // Skip inflection for non-target sections
}
```

#### 3. **Completion Detection** (in `chapters.js`)
When `__smoothScrollTo` finishes, use **viewport polling** instead of timeout:
```javascript
function isTargetInViewport() {
  const rect = targetElement.getBoundingClientRect();
  const tolerance = viewportHeight * 0.3;
  const sectionCenter = rect.top + rect.height / 2;
  const viewportCenter = viewportHeight / 2;
  return Math.abs(sectionCenter - viewportCenter) < tolerance;
}

// Poll until target is centered (max 1 second)
const pollInterval = setInterval(() => {
  if (isTargetInViewport() || pollCount >= maxPolls) {
    clearInterval(pollInterval);
    triggerInflectionOnTarget();
  }
  pollCount++;
}, 100);
```

## Bug Prevention Strategy

### Risk 1: **Timeout Misfires**
**Prevention:** Instead of relying on fixed timeout, poll the actual viewport position. Even if animation finishes early/late, we detect when the section is truly in frame.

### Risk 2: **Double Inflections**
**Prevention:** 
- Use `__scrollInflectionPending` flag to block all inflections during scroll
- Set `__skipSectionInflection = true` before animation
- Only set to `false` in `triggerInflectionOnTarget()` after completion check

### Risk 3: **Scroll Interruption by User**
**Prevention:** 
- If user manually scrolls while animation is running, `__userInputAt` timestamp gets updated
- Section observer can detect this and handle it appropriately
- Both nav-initiated and hash-initiated scrolls use same mechanism

### Risk 4: **Race Conditions**
**Prevention:**
- Each scroll handler uses local `scrollDone` flag to prevent multiple `onScrollDone()` executions
- Polling uses atomic `clearInterval()` to ensure cleanup
- All state variables checked within `triggerInflectionOnTarget()` after refetching element

### Risk 5: **Stale Element References**
**Prevention:**
- Don't store element references, only IDs
- In `triggerInflectionOnTarget()`, refetch element fresh: `document.getElementById(targetId)`
- This ensures if DOM was modified, we get the current element

## Variables Used

| Variable | Purpose | Set By | Cleared By |
|----------|---------|--------|-----------|
| `__scrollTargetId` | Current destination section | nav/hash handler | `triggerInflectionOnTarget()` |
| `__skipSectionInflection` | Block intermediate inflections | nav/hash handler | `triggerInflectionOnTarget()` |
| `__scrollInflectionPending` | Scroll is animating to target | nav/hash handler | `triggerInflectionOnTarget()` |
| `__chaptersAnimating` | General animation flag | already used | already cleared |
| `__snapSuppressUntil` | Suppress wheel/keyboard | already used | already cleared |

## Flow Diagram

```
User clicks nav link or hash anchor
    ↓
Set __scrollTargetId, __skipSectionInflection=true
    ↓
Start smooth scroll animation
    ↓
   [INFLECTION SUPPRESSED during scroll]
Section observer tries to inflect → SKIPPED (non-target section)
    ↓
Scroll animation completes
    ↓
onScrollDone() called
    ↓
Poll viewport position every 100ms
    ↓
isTargetInViewport() === true
    ↓
triggerInflectionOnTarget()
    ↓
__skipSectionInflection = false
__scrollInflectionPending = false
Dispatch scroll-target-reached event
    ↓
[INFLECTION NOW OCCURS] ✓
```

## Testing Checklist

- [ ] Click nav link → should NOT inflect during scroll, ONLY after scroll completes
- [ ] Click hash anchor → same behavior
- [ ] Manually scroll while animation in progress → animation completes, then inflection
- [ ] Click different nav link while previous scroll animating → cancels old, starts new
- [ ] Inflection fires once per scroll (no duplicate iframes)
- [ ] Typewriter waits until inflection completes
- [ ] Mobile/tablet: works with different viewport sizes
- [ ] Fast network: poll completes quickly
- [ ] Slow network: maxPolls (1s) ensures timeout doesn't block forever

## Code Changes Summary

### `chapters.js`
- `createScrollHandler()`: Added viewport polling logic
- `handleHashJump()`: Added viewport polling logic  
- Both now set `__scrollTargetId`, `__skipSectionInflection`, `__scrollInflectionPending`
- `triggerInflectionOnTarget()`: Clears flags and fires inflection only after position confirmed

### `index.html`
- Section observer: Added `duringProgrammaticScroll` check to skip non-target sections
- Section observer: Added check to skip inflection if different target is being scrolled to
