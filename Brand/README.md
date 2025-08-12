# Vettale Brand System

This directory contains the brand assets and configuration for the Vettale application.

## Files

- `brand-tokens.json` - Brand color tokens in semantic format
- `Identidade Visual Vettale.pdf` - Official brand guidelines
- `Vettale Brand Book.pdf` - Brand book with detailed specifications

## Brand Colors

The brand system uses semantic color names that map to Vettale's official brand palette:

### Primary Colors
- `primary` - Main brand blue (#2B70B2)
- `secondary` - Light brand blue (#6BAEDB)
- `accent` - Light accent blue (#E7F0FF)

### Supporting Colors
- `neutral` - Dark blue (#1A4670)
- `muted` - Light gray (#F1F5F9)
- `warning` - Gold (#E8B74B)
- `danger` - Red (#DC2626)
- `success` - Sage green (#8FBF9F)

## Usage

### CSS Variables
Brand colors are available as CSS custom properties:
```css
:root {
  --brand-primary: 43 112 178;
  --brand-secondary: 107 174 219;
  --brand-accent: 231 240 255;
  /* ... */
}
```

### Tailwind Classes
Use the brand colors with Tailwind CSS:
```html
<button class="bg-brand-primary text-brand-primaryFg">
  Primary Button
</button>

<div class="text-brand-primary">
  Brand colored text
</div>
```

### Button Variants
The application includes predefined button variants:
- `.btn-primary` - Primary CTA buttons
- `.btn-secondary` - Secondary actions
- `.btn-ghost` - Ghost/outline buttons

### Surface Classes
For backgrounds and containers:
- `.surface-accent` - Light accent background
- `.surface-muted` - Muted background

## Updating Brand Colors

1. Edit `Brand/brand-tokens.json`
2. Run `npm run apply-brand` to regenerate CSS variables
3. The changes will automatically apply throughout the application

## Implementation Details

- **Font Family**: Pogonia (headlines) + Nunito (body text)
- **Color System**: Semantic RGB values with alpha channel support
- **Contrast**: WCAG AA compliant with forced contrast utilities
- **Focus States**: Brand primary color for accessibility

## Files Modified

- `src/styles/brand.css` - Brand CSS variables
- `src/styles/components.css` - Component utility classes
- `tailwind.config.ts` - Tailwind brand color configuration
- `src/components/ui/button.tsx` - shadcn/ui button variants
- `src/index.css` - Global link and focus styles
- Various component files - Updated to use brand colors
