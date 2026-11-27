# Riff Valley Events Import v2

Version 2 adds `tour` rows. Version 1 remains accepted with its original two event types and validation rules.

- Schema: [riffvalley-events-import-v2.schema.json](riffvalley-events-import-v2.schema.json)
- Example: [riffvalley-events-import-v2.example.json](riffvalley-events-import-v2.example.json)

The root fields and all shared event fields follow [v1](riffvalley-events-import-v1.md). A tour row uses `type: "tour"` and requires `title`; this title is the Tour name passed to the existing Tour resolver. The row still represents one concrete event date, with its ordered lineup and locality. `endDate`, `venue`, `province`, `region`, `price`, `additionalInfo`, `url`, and `externalId` remain optional.

Tour names go through the importer's existing resolution and confirmation flow. Existing Tours require the same explicit confirmation as rows entered manually. New Tours use the existing import-batch contract and are not assigned a scraper-provided internal ID. Artist, Locality, Venue, conflict review, duplicate detection, and persistence continue through the shared import flow. Tour metadata has no independent scraper-provenance persistence field in the backend DTO; `url`, `externalId`, and `source` remain preview-only.

As in v1, the browser reads local `.json` files only, caps them at 2 MiB, validates real calendar dates and root/event country consistency, preserves artist order, and never creates artists automatically. Unsupported versions and malformed JSON are rejected. The JSON Schema represents shape and required fields; the runtime adapter additionally enforces calendar and cross-field checks.
