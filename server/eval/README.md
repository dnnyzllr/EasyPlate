# Ingredient detection evaluation

Scores a detector against labelled photos. Everything runs locally: images are read from disk and passed to the detector in-process. Nothing is uploaded.

```
cd server
npm run eval:detect -- --manifest eval/manifest.example.json
```

Options: `--split dev|heldout|all` (default `dev`), `--detector <id>` (default `$DETECTOR`, then `fixture`), `--min-confidence 0..1` (default `0.5`, the same as the app's "Not sure" threshold), `--prompt-version <s>`, `--out <path>`.

## Manifest

```json
{ "version": 1, "images": [
  { "id": "fridge-1", "file": "fridge-1.jpg", "split": "dev",
    "visible": ["Eggs", "milk"], "notes": "optional" } ] }
```

- `file` is relative to the manifest. JPEG, PNG or WebP, up to 5 MB.
- `visible` lists only items that are visible or legible. Leave opaque containers and unreadable labels out.
- Labels and predictions go through the same normalization (`Eggs` and `egg` match). Precision and recall are micro-averaged over images.

## Splits

Use `dev` while you tune. Put photos from different fridges or shoots in `heldout`, and run `--split heldout` only for final comparisons. The default run never touches them.

## Your own photos

Put photos and their manifest in `server/eval/photos/`, which is git-ignored:

```
npm run eval:detect -- --manifest eval/photos/manifest.json
```

Only use photos you own or have permission to use. Never commit them.

## Runs

Each run writes a JSON record to `eval/runs/` (git-ignored): detector id, version and prompt version, the manifest hash, raw predictions, per-image hits, misses and false guesses, and the aggregate. Compare runs on the same manifest by `detector.version` and `promptVersion`.

Exit codes: 0 ok, 1 an image errored or the split was empty (a record is still written), 2 bad arguments or manifest (no record).

## Not here yet

Fine-tuning and opt-in training data are future work.
