# Landing Page - Quick Reference Card

## 🎯 File Locations

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx          ← Main component
│   │   └── LANDING_PAGE_DESIGN.md   ← Detailed design docs
│   └── components/
│       └── FloatingParticles.jsx    ← Particle animation
├── tailwind.config.js               ← Custom animations
└── LANDING_PAGE_IMPLEMENTATION.md   ← Customization guide
```

---

## 🛠️ Most Common Customizations

### 1. Change Colors (Gradients)

**File:** `LandingPage.jsx` line 47

```jsx
// Current (Pink romance)
className="...bg-gradient-to-br from-red-950 via-rose-900 to-pink-100"

// Blue night
className="...bg-gradient-to-br from-slate-950 via-blue-900 to-blue-200"

// Purple dream
className="...bg-gradient-to-br from-purple-950 via-purple-900 to-purple-100"
```

### 2. Change Animation Speed

**Slow down everything (1.5x):**
```javascript
// Background (Line 54)
duration: 20 → duration: 30

// Title glow (Line 130)
duration: 3 → duration: 4.5

// Button pulse (Line 184)
duration: 1.8 → duration: 2.7
```

**Speed up everything (1.5x):**
```javascript
// Background: 20 → 13
// Title glow: 3 → 2
// Button pulse: 1.8 → 1.2
```

### 3. Adjust Particle Visibility

**File:** `LandingPage.jsx` line 85

```jsx
<FloatingParticles count={24} />

// More particles (ethereal):    count={48}
// Fewer particles (minimal):    count={12}
// No particles (clean):         count={0}
```

### 4. Change Button Text

**File:** `LandingPage.jsx` line 164

```jsx
<span className="relative block uppercase">
  Begin Your Evening  {/* ← Change here */}
</span>
```

### 5. Change Title Text & Font

**File:** `LandingPage.jsx` line 123

```jsx
<motion.h1>
  Je vous aime  {/* ← Change text */}
</motion.h1>

// Change font (Line 124)
fontFamily: 'Georgia, serif'  // Try: 'Garamond, serif'
```

---

## 🎨 Color Palette Reference

### Current (Rose/Pink)
```
Dark Red    #7f1d32  (red-950)
Rose        #881337  (rose-900)
Pink        #fbcfe8  (pink-200)
White       #fce7f3  (pink-50)
```

### Alternative Palettes

**Blue Night**
```
Dark Blue   #0f172a  (slate-950)
Navy        #1e3a8a  (blue-900)
Sky         #bfdbfe  (blue-200)
White       #f0f9ff  (blue-50)
```

**Purple Dream**
```
Dark Purple #581c87  (purple-950)
Purple      #6d28d9  (purple-800)
Lavender    #e9d5ff  (purple-200)
White       #faf5ff  (purple-50)
```

---

## ⏱️ Animation Timing Presets

### Entrance Sequence Delay

**File:** `LandingPage.jsx` line 20-27

```javascript
// Fast entrance (confident)
staggerChildren: 0.15,
delayChildren: 0.2,

// Default entrance (balanced)
staggerChildren: 0.25,
delayChildren: 0.4,

// Slow entrance (dramatic)
staggerChildren: 0.4,
delayChildren: 0.8,
```

### Effect Speed

| Duration | Feel | Usage |
|----------|------|-------|
| 1-2s | Snappy | Button interactions |
| 2-4s | Natural | Title glow, pulse |
| 8-15s | Slow | Particle drift |
| 15-30s | Very slow | Background breath |

---

## 🔘 Button Customization

### Colors
```jsx
// Current (Pink gradient)
background: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f472b6 100%)'

// Purple gradient
background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d8b4fe 100%)'

// Blue gradient
background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 50%, #93c5fd 100%)'
```

### Hover Scale
```jsx
whileHover={{ scale: 1.08 }}

// Subtle (professional)  →  scale: 1.03
// Default (balanced)     →  scale: 1.08
// Dramatic (playful)     →  scale: 1.15
```

### Pulse Speed
```jsx
duration: 1.8

// Fast heart (energetic)    →  duration: 1.2
// Default (calm)            →  duration: 1.8
// Slow breath (meditation)  →  duration: 2.5
```

---

## ✨ Glow Effects

### Title Glow (Text Shadow)

**File:** `LandingPage.jsx` line 133

```javascript
// Intensity levels:
// Subtle:  opacity 0.2→0.3 and 0.1→0.2
// Default: opacity 0.3→0.5 and 0.2→0.4
// Strong:  opacity 0.5→0.8 and 0.4→0.6

// Current (default):
'0 0 30px rgba(190, 24, 93, 0.3), ...'
'0 0 50px rgba(190, 24, 93, 0.5), ...'

// Very subtle:
'0 0 20px rgba(190, 24, 93, 0.15), ...'
'0 0 30px rgba(190, 24, 93, 0.25), ...'
```

### Button Pulse Glow

**File:** `LandingPage.jsx` line 184

```javascript
// Subtle pulse
'0 0 15px rgba(190, 24, 93, 0.2), inset 0 0 15px rgba(190, 24, 93, 0.05)'
'0 0 30px rgba(190, 24, 93, 0.4), inset 0 0 25px rgba(190, 24, 93, 0.1)'

// Strong pulse (current)
'0 0 20px rgba(190, 24, 93, 0.3), inset 0 0 20px rgba(190, 24, 93, 0.1)'
'0 0 40px rgba(190, 24, 93, 0.6), inset 0 0 30px rgba(190, 24, 93, 0.2)'
```

---

## 📱 Responsive Sizes

**File:** `LandingPage.jsx` (Title line 113)

```jsx
// Current
className="text-6xl md:text-7xl lg:text-8xl"

// Smaller (60px max)
className="text-5xl md:text-6xl lg:text-7xl"

// Larger (96px max)
className="text-7xl md:text-8xl lg:text-9xl"
```

**Pixel equivalents:**
- text-6xl = 36px
- text-7xl = 48px
- text-8xl = 64px

---

## 🔊 Motion Accessibility

All animations respect browser preference:

```javascript
// Automatically handled by Framer Motion
// If user has 'Reduce motion' enabled in OS:
// - Entrance animations become instant
// - Glow animations stop
// - Button animations remain (essential feedback)
```

**To test:** OS Settings → Accessibility → Display → Reduce motion

---

## 🚀 Dev Server Commands

```bash
# Start development with hot-reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for lint errors
npm run lint
```

---

## 🐛 Quick Fixes

### Animations Not Playing?
```bash
npm run dev
# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Particles Not Showing?
```jsx
// Increase count for testing
<FloatingParticles count={48} />  // Was 24
```

### Button Click Not Working?
```jsx
// Ensure onClick handler exists
<LandingPage onBegin={() => window.location.href = '/entrance'} />
```

### Gradient Looks Wrong?
```bash
npm run build  # Rebuild Tailwind CSS
npm run dev    # Restart dev server
```

---

## 📊 Animation Timeline (ms)

```
0ms     Background starts animating
400ms   Title fades in (1.2s animation)
650ms   Tagline fades in (1.0s animation)
900ms   Button fades in (0.8s animation)
1100ms  Line draws in
1200ms  Title glow & button pulse start

Loop (after completion):
- Background: 20s cycle
- Particles: 12-18s per particle
- Title glow: 3s cycle
- Button pulse: 1.8s cycle
```

---

## ✅ Pre-Launch Checklist

```
Visual Quality
  ☐ Colors look soft/romantic
  ☐ No harsh color transitions
  ☐ Glow effects visible but subtle
  ☐ Text readable on background
  ☐ Particles visible (slightly)

Animation Performance
  ☐ Smooth at 60fps (no jank)
  ☐ Entrance sequence feels natural
  ☐ Glow animations not distracting
  ☐ Button interactions responsive

Functionality
  ☐ Button click works
  ☐ Keyboard navigation works
  ☐ Mobile touch friendly
  ☐ Responsive on all breakpoints

Accessibility
  ☐ Color contrast sufficient
  ☐ Screen reader works
  ☐ Reduced motion respected
  ☐ Keyboard accessible
```

---

## 🎓 Learning Resources

- **Framer Motion:** https://www.framer.com/motion/
- **Tailwind CSS:** https://tailwindcss.com/
- **CSS Gradients:** https://www.w3schools.com/css/css3_gradients.asp
- **Animation Performance:** https://web.dev/animations-perf/

---

## 💡 Pro Tip

Make it your own by adjusting just 3 things:
1. **Color palette** (change gradient colors)
2. **Animation speed** (adjust durations)
3. **Particle count** (adjust atmosphere)

---

## 📞 Quick Support

**Problem:** X doesn't work
**Solution:** 
1. Check console for JS errors: F12
2. Restart dev server: `npm run dev`
3. Hard refresh: Cmd+Shift+R / Ctrl+Shift+R
4. Review `LANDING_PAGE_IMPLEMENTATION.md`
