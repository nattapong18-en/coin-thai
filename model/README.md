# Model files go here

Place the real exported model files in this directory:

- `model.json`
- `metadata.json` (recommended; required for a Teachable Machine label mapping)
- one or more weight files referenced by `model.json`, commonly `weights.bin`

The current prototype uses one model with this label order:

```text
coin_1
coin_50_satang
unknown
```

No placeholder model is included because the scanner must never show fake predictions.
