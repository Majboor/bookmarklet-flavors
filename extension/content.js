// Thin content-script wrapper. flavors.js (loaded just before this file, same
// isolated world) defines `function flavorHub(){...}` but never calls it -
// the bookmarklet build wraps and calls it itself; here we just call it once
// the DOM is ready. This file is the ONLY thing that differs from the
// bookmarklet path: the browser re-runs both files automatically on every
// navigation, which is the one thing no javascript: bookmarklet can ever do
// for itself (see the "Workflow detection" section of the howto note).
if (typeof flavorHub === 'function') {
  try { flavorHub(); } catch (e) { /* a hostile page's own error should never break navigation */ }
}
