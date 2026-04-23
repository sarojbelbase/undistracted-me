# Copilot Instructions for Undistracted Me

## Project Overview
This is a React-based browser extension that replaces the new tab page with a distraction-free Nepali date display. The extension supports both Chrome and Firefox through Manifest V3.

## Architecture & Key Components

### Build System
- **Vite + @crxjs/vite-plugin**: Uses Vite for development with CRXJS plugin for browser extension support
- **Development**: `bun run dev` starts Vite dev server on port 3000
- **Production**: `bun run build` creates extension bundle in `dist/`
- **Extension packaging**: Uses web-ext for Firefox packaging

### Core Components Structure
```
src/
├── App.jsx              # Main app with settings overlay and component orchestration
├── components/          # Core UI components
│   ├── NepaliMiti.jsx   # Main Nepali date display (9vw font size)
│   ├── DateToday.jsx    # English date display
│   ├── LiveClock.jsx    # Real-time clock
│   └── Settings.jsx     # Settings overlay with language toggles
├── constants/           # Static data and configurations
│   ├── index.js         # Nepali calendar data, language/font mappings
│   └── settings.js      # Settings enums and defaults
├── utilities/           # Business logic
│   ├── index.js         # Nepali calendar conversion algorithms
│   └── chrome.js        # Chrome extension API interactions
└── widgets/             # Future widget components (calendar, timer, etc.)
```

### Critical Date Conversion Logic
- **Base conversion**: English to Nepali date using hardcoded calendar data in `NEPALI_YEARS_AND_DAYS_IN_MONTHS`
- **Timezone handling**: Uses dayjs with timezone plugin for Nepal timezone (Asia/Kathmandu)
- **Language support**: Dual English/Nepali display with font switching (`Saira Extra Condensed` for EN, `Akshar` for NE)

## Development Patterns

### State Management
- **localStorage persistence**: Settings (language) automatically persist
- **Local state**: Uses React hooks with useCallback for performance optimization
- **Real-time updates**: 1-second intervals for live updates across components

### Extension Integration
- **New tab override**: `chrome_url_overrides.newtab` in manifest.json
- **Cross-browser support**: Conditional Chrome API usage with error handling

### Styling Approach
- **TailwindCSS**: Utility-first styling with responsive viewport units (9vw for main date)
- **Custom fonts**: Loaded via CSS imports in `src/assets/css/fonts.css`
- **Dark theme**: Default gray-900 background with white text and subtle hover effects

## File Conventions

### Component Naming
- PascalCase for components: `NepaliMiti.jsx`, `DateToday.jsx`
- Named exports with destructuring: `export const NepaliMiti = ({ language }) => {}`

### Constants Organization  
- Freeze objects for immutability: `Object.freeze({ ne: "ne", en: "en" })`
- Separate files for different constant types (settings vs. calendar data)

### Utility Functions
- Pure functions for date calculations
- Chrome API interactions isolated in `chrome.js`
- Error boundaries around extension API calls

## Key Integration Points

### Chrome Extension APIs
- Manifest V3 structure with proper permissions and icons
- Cross-browser compatibility checks (`typeof chrome !== 'undefined'`)

### External Dependencies
- **dayjs**: Date manipulation with timezone plugin for accurate Nepal time
- **React 18**: Modern React with hooks and concurrent features
- **TailwindCSS**: Utility-first styling framework

## Development Workflow

### Local Development
```bash
bun run dev        # Start Vite dev server
# Load unpacked extension from dist/ folder in Chrome
```

### Building & Testing
```bash
bun run build      # Production build
bun run preview    # Preview built extension
```

### Extension Deployment
- Chrome: Upload `dist/` folder contents to Chrome Web Store
- Firefox: Use web-ext tools for packaging and validation

## Common Patterns to Follow

1. **Component updates**: Always use useCallback for functions passed to useEffect dependencies
2. **Extension API calls**: Wrap in try-catch with console.warn fallbacks
3. **Date handling**: Use dayjs with proper timezone configuration for Nepal
4. **Styling**: Prefer viewport units (vw/vh) for responsive extension UI
5. **Constants**: Add new calendar years to `NEPALI_YEARS_AND_DAYS_IN_MONTHS` array as needed