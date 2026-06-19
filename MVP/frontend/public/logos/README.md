# Bank logos

Drop bank logo images here, named by bank id. `BankLogo.jsx` loads `/logos/<id>.png`
automatically; if a file is missing it falls back to a brand-coloured monogram tile.

Expected files:

| File           | Bank          |
|----------------|---------------|
| `barclays.png` | Barclays      |
| `hsbc.png`     | HSBC          |
| `lloyds.png`   | Lloyds Bank   |
| `monzo.png`    | Monzo         |
| `starling.png` | Starling Bank |
| `natwest.png`  | NatWest       |

Tips:
- Transparent-background PNGs (or square marks) look best on the white chip.
- SVG works too — either rename to `.svg` and pass `src="/logos/<id>.svg"`, or change
  the default extension in `components/BankLogo.jsx`.
- These are used only to identify each bank in this non-commercial academic demo.
