# File: globals.css

### Summary
Global styles for the admin panel including color tokens, gradients, glassmorphism, typography, and utility classes.

### Fixes Applied log
- Change: Switched font stack to "Plus Jakarta Sans" for improved readability.
- Update: Mapped font weight variables to numeric values for consistent rendering.

### How Fixes Were Implemented
- Updated Google Fonts link in `index.html` to load `Plus Jakarta Sans`.
- Changed `--font-family` to prefer `Plus Jakarta Sans` with a robust system fallback stack.
- Replaced named font families with numeric weights (`--font-bold: 700`, etc.) to align with the loaded font weights.
