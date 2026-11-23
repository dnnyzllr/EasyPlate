# Ingredient detection API

`POST /api/ingredients/detect` suggests ingredient names for a photo. The app shows the suggestions for the user to review. Nothing is searched until the user confirms.

The only detector today is a deterministic **fixture** that ignores image content. It exists so the whole flow can be built and tested without a paid provider.

## Request

`Content-Type: application/json`

```json
{ "image": "<base64>", "mimeType": "image/jpeg" }
```

| Field | Rules |
|---|---|
| `image` | Required. Base64 of the raw image bytes (standard alphabet, padded; no `data:` prefix). ASCII whitespace is ignored. |
| `mimeType` | Optional. `image/jpeg`, `image/png` or `image/webp`. If present it must match the image's actual type. |

- Formats are detected from the file's signature bytes: JPEG, PNG, WebP. HEIC/HEIF is recognised and rejected (415); convert to JPEG first.
- Limit: 5 MiB (5,242,880 bytes) of decoded image. The JSON body is capped at 8 MB so the server can return a specific message.
- Validation checks the signature only. The image is not decoded, so a file with a valid header but corrupt content is accepted.

## Response (200)

```json
{"candidates":[{"name":"egg","confidence":0.91},{"name":"cheese","confidence":0.74},{"name":"tomato","confidence":0.31}],"detector":{"id":"fixture","version":"1.0.0"}}
```

- `name` is normalized with the same rules as recipe matching (lower case, aliases such as `Eggs` to `egg`). Duplicates are merged, keeping the highest confidence.
- `confidence` is 0 to 1 with at most 2 decimals. Clients treat values below 0.5 as "Not sure" and leave them unselected.
- Candidates are sorted by confidence (high first), then name, and capped at 20. The list can be empty.
- `detector` says which detector produced the result. A client can use `id: "fixture"` to show a demo notice.

## Errors

All errors are `{"error":"<message>"}`.

| Status | When |
|---|---|
| 400 | Empty body, malformed JSON, body not an object, `image` missing, not a string, blank, not valid base64, or decoding to zero bytes |
| 413 | Image over 5 MB (decoded), or the JSON body is over 8 MB |
| 415 | Content-Type is not JSON, HEIC, or an unsupported type; `mimeType` unsupported or different from the real type |
| 502 | The detector failed. Try again or type ingredients. |

## Configuration

`DETECTOR` selects the detector. Unset or empty means `fixture`. An unknown value stops the server at startup with `Unknown DETECTOR "<id>". Supported: fixture.`

## Privacy

Photos live only in the request's memory for the duration of the call. The server does not write them to disk, cache them, or log them (bodies and base64 are never logged). A real provider would receive the photo, which is why the owner must approve it before one is enabled.

## Adding a provider

Implement `Detector` (`src/detect/types.ts`) and add a case in `src/detect/registry.ts`. Read credentials from server environment variables inside the provider's factory only. They never go to clients and are never logged. Do not enable a provider or send real photos to one without the owner's approval.

Evaluate a detector before and after changes with `npm run eval:detect` (see `eval/README.md`).

## Example

```
printf '{"image":"%s"}' "$(base64 -w0 eval/fixtures/synthetic-red.png)" | curl -s -H 'Content-Type: application/json' --data-binary @- http://localhost:5000/api/ingredients/detect
```
