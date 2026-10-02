Negative control for the hidden general-analysis file input.
Run the re-analysis-1a UI regression suite against the prior delivered HTML
a4f0e445e132a02e042ac7b19a5fbe243eed537e83f7053bfb8c35dd60e4ceef.
Result: 21/22 pass; only the new explicit picker override test fails.
This is VM structural/event evidence, not a real browser visibility test.
Reproduce: node tests/re-analysis-ui.cjs <prior-re-analysis-1.html> <output-report.json>
The JSON/log retain the exact original local artifact path used.
