# Design System Master File — Cyber-Glassmorphism Dark Theme

> **LOGIC:** When building any UI component or page, strictly follow the Cyber-Glassmorphism tokens and rules below.

---

**Project:** Reviewii  
**Theme:** Cyber-Glassmorphism Dark Theme  
**Updated:** 2026-08-08  

---

## 🎨 Color Palette Tokens

### Background & Glass Canvas
| Role | Value | CSS Variable |
|---|---|---|
| Base Background | `#07090e` | `--color-bg-base` |
| Ambient Top Radial | `radial-gradient(circle at 85% 8%, rgba(0, 240, 201, 0.14) 0%, transparent 38%)` | `--bg-ambient-top` |
| Ambient Bottom Radial | `radial-gradient(circle at 12% 92%, rgba(138, 119, 255, 0.11) 0%, transparent 42%)` | `--bg-ambient-bottom` |
| Glass Default | `linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)` | `--glass-bg-default` |
| Glass Elevated | `linear-gradient(145deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.015) 100%)` | `--glass-bg-elevated` |
| Translucent Input | `rgba(0, 0, 0, 0.45)` | `--glass-bg-input` |
| Glass Border | `1px solid rgba(255, 255, 255, 0.09)` | `--glass-border-default` |
| Border Focus Glow | `1px solid #00f0c9` | `--glass-border-focus` |

### Accent Palette
| Accent Token | Hex Value | Role |
|---|---|---|
| Cyan Primary | `#00f0c9` | Main action buttons, active checkboxes, success glow |
| Emerald Secondary | `#10b981` | Button gradient pair (`#00f0c9` -> `#10b981`) |
| Amber Warning | `#f59e0b` | Pending status, timestamps, time range alerts |
| Coral Red Alert | `#ef4444` | Perlu revisi status, errors, alert rings |
| Purple Accent | `#8a77ff` | Ambient lighting & gradient text accents |
| Blue Accent | `#93c5fd` | Header sub-elements & secondary accents |

---

## 🔤 Typography Tokens

- **Primary Sans-Serif Font:** `'Poppins', sans-serif` (Google Fonts: 400, 600, 700, 900)
- **Monospace Data Font:** `'JetBrains Mono', monospace` (Google Fonts: 500)

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Poppins:wght@400;600;700;900&display=swap');
```

---

## 💎 Glassmorphism & Component Specs

```css
/* Glass Panel */
.glass-panel {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}

/* Primary Button */
.btn-primary {
  background: linear-gradient(90deg, #00f0c9, #10b981);
  color: #06070a;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 900;
  padding: 12px 20px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  transition: filter 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
}
.btn-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 18px rgba(0, 240, 201, 0.35);
}
.btn-primary:active {
  transform: scale(0.98);
}

/* Glass Translucent Input */
.text-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  color: #ffffff;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  padding: 10px 13px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.text-input:focus {
  border-color: #00f0c9;
  box-shadow: 0 0 0 3px rgba(0, 240, 201, 0.12);
}
```
