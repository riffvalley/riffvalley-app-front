# Riff Valley Events Import v1

This is the portable JSON input format consumed by the frontend scraper importer at `/concerts-festivals/import`.

- Schema: [riffvalley-events-import-v1.schema.json](riffvalley-events-import-v1.schema.json)
- Example: [riffvalley-events-import-v1.example.json](riffvalley-events-import-v1.example.json)

The root object requires `format: "riffvalley.events-import"`, integer `version: 1`, `source.name`, `country`, and a non-empty `events` array. Each event requires `type` (`concert` or `festival`), `startDate`, a non-empty ordered `artists` array, and `locality`. A festival also requires a non-empty `title`; a concert title is optional.

| Field                              | Requirement                                   | Meaning                                                                                     |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `source.name`                      | Required, non-blank string                    | Scraper or source label.                                                                    |
| Root `country`                     | Required, non-blank string                    | ISO code such as `ES`, or a country name available in the importer's country catalog.       |
| `type`                             | Required enum                                 | `concert` or `festival`.                                                                    |
| `title`                            | Optional for concert; required for festival   | Event name.                                                                                 |
| `startDate`                        | Required date-only                            | `YYYY-MM-DD`.                                                                               |
| `endDate`                          | Optional date-only                            | Event end date when known.                                                                  |
| `artists`                          | Required array, at least one non-blank string | Lineup names, kept in array order. Do not send internal artist IDs.                         |
| `locality`                         | Required non-blank string                     | City/locality used by the current importer.                                                 |
| `province`                         | Optional non-blank string                     | Province text passed to locality resolution to distinguish homonymous localities.           |
| `region`                           | Optional non-blank string                     | Administrative region name; the frontend matches it against the selected country's catalog. |
| `country` on an event              | Optional non-blank string                     | If present, it must match the root country.                                                 |
| `venue`, `price`, `additionalInfo` | Optional strings                              | Venue/room, price text, and other event information.                                        |
| `url`, `externalId`                | Optional strings                              | Original source URL and source-side event identifier.                                       |

Unknown properties are tolerated by the current adapter and ignored. Keep scraper-only data in `source`, `url`, or `externalId`; arbitrary extra properties are not carried into the event editor. Source attribution and external identifiers are shown in the JSON preview, but the backend `ImportEventRowDto` has no fields to persist them. The adapter trims text values. `url` is only a string: it is not URI-validated, rendered as a link, or fetched by the browser.

## Validation and limits

The JSON Schema describes field types, required properties, the format/version constants, the event types, non-empty arrays, and the festival title condition. The adapter adds runtime rules JSON Schema cannot express or whose standards behavior varies by validator:

- It checks that date strings represent real calendar dates and rejects an end date earlier than the start date. A `format: "date"` keyword may be annotation-only unless a JSON Schema validator enables format assertions.
- An event-level `country`, when supplied, must equal the root country after trimming and case-insensitive comparison. The importer then resolves root country by ISO code or an allowed country-catalog label; unsupported countries cannot be imported.
- `region` is matched to an administrative region by trimmed/collapsed whitespace, case and diacritic-insensitive name. Only one matching catalog entry supplies the internal region UUID; an unmatched or ambiguous value needs review. Scrapers never supply Riff Valley IDs.
- `province` is a text hint sent through the existing locality resolver and included in the event-import DTO when present. It is independent of `region`: province helps distinguish locality names, while `region` resolves the administrative-region relation.
- Duplicate events within one file are flagged by a frontend fingerprint of type, title, dates, locality, and ordered lineup. The editor also avoids re-adding a JSON event already loaded in the current draft. This fingerprint is not a substitute for backend duplicate/conflict checks.
- The browser accepts `.json` files up to 2 MiB. This byte limit and file extension are transport/UI constraints, not JSON Schema constraints. There is no separate event-count limit in the JSON contract.
- Unknown event types, malformed field values, empty lineups/localities, and other incomplete rows are reported in the preview/editor. Rows with unknown types, a contradictory event country, or same-file duplicates are not copied into the editor.

The contract deliberately contains no internal `countryId`, `administrativeRegionId`, `venueId`, or `artistId`. Artists, localities and venues continue through the existing resolution and review flow. No spreadsheet format or direct URL scraping is part of this contract.
