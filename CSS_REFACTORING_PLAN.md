# CSS Refactoring Plan

## Current State Analysis

### Existing CSS Files
1. **src/base.css** - Base layout (mixed with some theme styles)
2. **src/theme.css** - Theme-specific styles (mixed with layout)
3. **src/ar.css** - Arabic language overrides
4. **src/ltr.css** - LTR language overrides
5. **src/extensions/chapters.css** - Chapter navigation
6. **src/extensions/dual-iframe.css** - Dual iframe mode
7. **map/css/map.css** - Map base styles
8. **map/css/layer-controls.css** - Map layer controls
9. **map/css/ui-controls.css** - Map UI controls

### Problems Identified
1. **Mixed concerns**: Layout and theme styles are intermingled
2. **No CSS variables**: Colors, fonts, spacing hardcoded everywhere
3. **Inconsistent naming**: Different conventions across files
4. **Duplication**: Same colors/values repeated
5. **No systematic scales**: Typography, spacing, colors are arbitrary
6. **Hard to maintain**: Changing colors/fonts requires editing multiple files
7. **Theme coupling**: Can't easily swap themes or layouts independently

## Refactoring Goals

### 1. **Separation of Concerns**
- **Variables** - All design tokens in one place
- **Layout** - Pure structural/positioning rules
- **Theme** - Colors, shadows, borders, backgrounds
- **Typography** - Font families, sizes, weights, line heights
- **Components** - Reusable component styles
- **Utilities** - Helper classes
- **Language overrides** - RTL/LTR and language-specific

### 2. **Design System Foundation**
- CSS custom properties for all values
- Systematic color palette
- Type scale
- Spacing scale
- Consistent naming conventions

### 3. **Better Organization**
```
src/styles/
├── 0-variables/
│   ├── colors.css          # Color palette
│   ├── typography.css      # Font definitions & type scale
│   ├── spacing.css         # Spacing scale
│   └── layout.css          # Layout breakpoints & dimensions
├── 1-base/
│   ├── reset.css           # Minimal reset/normalize
│   ├── fonts.css           # @font-face declarations
│   └── global.css          # Global element defaults
├── 2-layout/
│   ├── grid.css            # Main layout structure (iframe + main)
│   ├── sections.css        # Section positioning
│   └── responsive.css      # Responsive layout adjustments
├── 3-components/
│   ├── inflect-caption.css # Caption overlays
│   ├── chapter-nav.css     # Chapter navigation
│   ├── buttons.css         # Button styles
│   └── links.css           # Link styles
├── 4-themes/
│   ├── nibal-theme.css     # Current Nibal theme
│   └── base-theme.css      # Original base theme
├── 5-languages/
│   ├── rtl.css             # RTL overrides
│   ├── ltr.css             # LTR overrides
│   ├── arabic.css          # Arabic-specific
│   └── english.css         # English-specific
├── 6-extensions/
│   ├── dual-iframe.css     # Dual iframe mode
│   └── animations.css      # Slide animations
└── main.css                # Master import file

map/styles/
├── 0-variables/
│   └── map-vars.css        # Map-specific variables
├── 1-base/
│   └── map-base.css        # Map container
├── 2-components/
│   ├── layer-panel.css     # Layer controls panel
│   ├── layer-list.css      # Layer list items
│   ├── layer-form.css      # Add layer form
│   ├── distance-ticker.css # Distance ticker
│   └── map-controls.css    # UI buttons
└── map-main.css            # Master import
```

## Implementation Plan

### Phase 1: Extract Design Tokens ✅
1. Create `0-variables/` directory
2. Extract all colors to `colors.css` with CSS custom properties
3. Extract all typography to `typography.css`
4. Extract spacing/dimensions to `spacing.css`
5. Extract layout breakpoints to `layout.css`

### Phase 2: Restructure Base Styles ✅
1. Create `1-base/` directory
2. Move `@font-face` to `fonts.css`
3. Create minimal `reset.css`
4. Extract global element styles to `global.css`
5. Remove all theme-specific styles from base

### Phase 3: Separate Layout from Theme ✅
1. Create `2-layout/` directory
2. Extract pure layout/positioning to `grid.css`
3. Extract section layout to `sections.css`
4. Create `3-components/` with component-specific layouts
5. Create `4-themes/` with color/visual styles only

### Phase 4: Refactor Map Styles ✅
1. Apply same structure to `map/styles/`
2. Extract map variables
3. Separate map components
4. Use consistent naming

### Phase 5: Language Support ✅
1. Create `5-languages/` directory
2. Refactor RTL/LTR overrides
3. Separate language-specific fonts/styles

### Phase 6: Integration & Testing ✅
1. Create master import files
2. Update HTML files to use new structure
3. Test all pages
4. Verify theme switching works
5. Test RTL/LTR modes
6. Test responsive breakpoints

## Naming Conventions

### CSS Custom Properties
```css
/* Colors */
--color-primary: #FA5F5F;
--color-bg-dark: #333;
--color-text-light: #fff;

/* Typography */
--font-family-display: Levit_1950, sans-serif;
--font-family-body: 'David Libre', serif;
--font-size-h1: 2.4em;
--line-height-body: 1.5;

/* Spacing */
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 1rem;
--space-lg: 2rem;
--space-xl: 4rem;

/* Layout */
--layout-iframe-width: 60vw;
--layout-section-max-width: 640px;
--breakpoint-mobile: 1000px;
```

### Class Names (BEM-inspired)
```css
.component-name { }           /* Block */
.component-name__element { }  /* Element */
.component-name--modifier { } /* Modifier */
```

## Migration Strategy

1. **Create branch**: `css-refactor`
2. **Keep old files**: Don't delete during migration
3. **Parallel development**: New structure alongside old
4. **Page-by-page migration**: Test incrementally
5. **Final switch**: Update imports, delete old files
6. **Merge to main**: After thorough testing

## Benefits

### Developer Experience
- ✅ Change colors in one place
- ✅ Swap themes easily
- ✅ Clear file organization
- ✅ Reusable components
- ✅ Predictable structure

### Performance
- ✅ Better caching (smaller files)
- ✅ Load only what's needed
- ✅ Reduced redundancy

### Maintainability
- ✅ Single source of truth for design tokens
- ✅ Easy to update across project
- ✅ Clear separation of concerns
- ✅ Consistent naming

## Timeline Estimate
- Phase 1: 2-3 hours (Design tokens)
- Phase 2: 2-3 hours (Base styles)
- Phase 3: 3-4 hours (Layout/Theme separation)
- Phase 4: 2-3 hours (Map refactor)
- Phase 5: 1-2 hours (Languages)
- Phase 6: 2-3 hours (Integration/testing)

**Total: 12-18 hours**

## Success Criteria
1. ✅ All design tokens use CSS variables
2. ✅ Layout can be changed without affecting theme
3. ✅ Theme can be swapped without breaking layout
4. ✅ No hardcoded colors/fonts/spacing in components
5. ✅ Consistent naming across all files
6. ✅ All existing functionality works
7. ✅ Clear documentation
8. ✅ Easier to maintain going forward
