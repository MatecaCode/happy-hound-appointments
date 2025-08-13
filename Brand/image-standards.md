# Vettale Image Standards

## Overview
This document outlines the image standardization strategy for the Vettale pet grooming booking system, focusing on achieving a "premium acolhedor" (premium welcoming) visual style.

## Image Audit Results
- **Total Images Found**: 9
- **Image Types**: 8 img tags, 1 inline SVG
- **Components**: Hero, Navigation, About, Testimonials

## Image Categories & Standards

### 1. Hero Images
**Location**: `src/components/Hero.tsx`
**Current**: Corgi dog image (`/lovable-uploads/58d1d3ba-3aac-4831-819e-db278e404d9d.png`)
**Target**: Premium clinic environment with pets
**Standards**:
- Aspect ratios: 16:9 (desktop), 4:3 (tablet), 1:1 (mobile)
- Size: 1600w minimum
- Format: WebP + JPG fallback
- Style: Natural light, shallow depth of field, warm temperature
- Content: Modern clinic interior with happy pets and staff

### 2. Logo
**Location**: `src/components/Navigation.tsx`
**Current**: Vettale logo (`/lovable-uploads/6e31bc13-c687-4ceb-87a4-29955094f30f.png`)
**Target**: High-quality Vettale brand logo
**Standards**:
- Format: SVG (preferred) or high-res PNG
- Multiple sizes: 32px, 64px, 128px
- Transparent background
- Brand colors: Primary blue (#2B70B2)

### 3. About Page Images (6 total)
**Location**: `src/pages/About.tsx`

#### 3.1 Historical Images
- **Inauguration Clinic**: First clinic in 1990
- **Cãominhada Event**: Community dog walking event
- **Classic Era**: Early years in Atibaia
- **MundiauPet Era**: Transition period
- **Team Photo**: Current staff
- **New Clinic**: Modern Vettale facility

**Standards**:
- Aspect ratios: 4:3 (desktop), 3:2 (tablet), 1:1 (mobile)
- Size: 1200w minimum
- Format: WebP + JPG fallback
- Style: Historical photos with consistent treatment
- Content: Authentic moments from clinic history

### 4. Testimonials SVG
**Location**: `src/components/Testimonials.tsx`
**Current**: Inline SVG
**Target**: Optimized SVG with brand colors
**Standards**:
- Optimized SVG code
- Brand color integration
- Responsive scaling
- Accessibility improvements

## Implementation Plan

### Phase 1: Responsive Delivery System
1. Replace `<img>` tags with `<picture>` elements
2. Implement aspect ratio utilities
3. Add lazy loading and async decoding
4. Ensure proper alt text

### Phase 2: Image Optimization
1. Create WebP versions of all images
2. Implement srcSet for responsive images
3. Add proper image compression
4. Optimize loading performance

### Phase 3: Brand Integration
1. Apply consistent visual style
2. Ensure color harmony with brand palette
3. Maintain "premium acolhedor" aesthetic
4. Test across all breakpoints

## Technical Implementation

### Responsive Picture Element Template
```jsx
<picture>
  <source 
    srcSet="/brand/hero/clinic@1600.webp" 
    type="image/webp" 
  />
  <img 
    src="/brand/hero/clinic@1600.jpg" 
    alt="Ambiente acolhedor da Vettale" 
    loading="lazy" 
    decoding="async" 
    className="w-full h-auto object-cover rounded-2xl" 
  />
</picture>
```

### Aspect Ratio Utilities
- Hero: `aspect-[16/9] md:aspect-[4/3] sm:aspect-square`
- Cards: `aspect-square`
- Staff: `aspect-[3/2]`
- About: `aspect-[4/3] md:aspect-[3/2] sm:aspect-square`

### File Structure
```
public/brand/
├── hero/
│   ├── clinic@1600.webp
│   ├── clinic@1600.jpg
│   ├── clinic@1200.webp
│   └── clinic@1200.jpg
├── cards/
├── staff/
└── about/
    ├── inauguration@1200.webp
    ├── inauguration@1200.jpg
    └── ...
```

## Quality Standards

### Visual Style
- **Lighting**: Natural, warm, welcoming
- **Composition**: Clean, uncluttered backgrounds
- **Color**: Harmonious with brand palette
- **Mood**: Professional yet approachable

### Technical Requirements
- **Performance**: Optimized file sizes
- **Accessibility**: Meaningful alt text
- **Responsive**: No layout shifts
- **Modern Formats**: WebP with fallbacks

### Content Guidelines
- **Authentic**: Real clinic moments
- **Diverse**: Various pet types and sizes
- **Professional**: Clean, modern clinic environment
- **Welcoming**: Warm, inviting atmosphere

## Next Steps
1. Source high-quality brand images
2. Implement responsive picture elements
3. Optimize all images for web delivery
4. Test across all devices and breakpoints
5. Validate accessibility and performance
