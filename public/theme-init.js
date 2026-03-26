(function () {
  var LIGHT_BG = '#F0F0F2';
  var DARK_BG = '#141920';
  var LIGHT_SURFACE = '#ffffff';
  var DARK_SURFACE = '#1e2433';
  var LIGHT_BORDER = '#e5e7eb';
  var DARK_BORDER = '#374151';

  var ACCENTS = {
    Default: { hex: '#111827', fg: '#ffffff' },
    Blueberry: { hex: '#3689E6', fg: '#ffffff' },
    Strawberry: { hex: '#C6262E', fg: '#ffffff' },
    Bubblegum: { hex: '#DE3E80', fg: '#ffffff' },
    Grape: { hex: '#A56DE2', fg: '#ffffff' },
    Orange: { hex: '#F37329', fg: '#ffffff' },
    Banana: { hex: '#F9C440', fg: '#111827' },
    Lime: { hex: '#68B723', fg: '#ffffff' },
    Mint: { hex: '#28BCA3', fg: '#ffffff' },
    Latte: { hex: '#CFA25E', fg: '#111827' },
    Cocoa: { hex: '#715344', fg: '#ffffff' },
  };

  try {
    var mode = localStorage.getItem('app_mode') || 'light';
    var accentName = localStorage.getItem('app_accent') || 'Default';
    var accent = ACCENTS[accentName] || ACCENTS.Default;
    var dark = mode === 'dark';
    var r = document.documentElement;

    r.setAttribute('data-mode', mode);
    r.style.setProperty('--w-page-bg', dark ? DARK_BG : LIGHT_BG);
    r.style.setProperty('--w-surface', dark ? DARK_SURFACE : LIGHT_SURFACE);
    r.style.setProperty('--w-border', dark ? DARK_BORDER : LIGHT_BORDER);
    r.style.setProperty('--w-accent', accent.hex);
    r.style.setProperty('--w-accent-fg', accent.fg);

    // Directly set background so it applies before body is parsed
    r.style.backgroundColor = dark ? DARK_BG : LIGHT_BG;
  } catch (e) { }
})();
