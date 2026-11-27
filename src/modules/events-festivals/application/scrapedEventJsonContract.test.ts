import { describe, expect, it } from "vitest";
import exampleJson from "../../../../docs/contracts/riffvalley-events-import-v1.example.json?raw";
import schemaJson from "../../../../docs/contracts/riffvalley-events-import-v1.schema.json?raw";
import exampleV2Json from "../../../../docs/contracts/riffvalley-events-import-v2.example.json?raw";
import schemaV2Json from "../../../../docs/contracts/riffvalley-events-import-v2.schema.json?raw";
import { parseScrapedEventJson } from "./scrapedEventJson";

type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePointer(root: JsonSchema, pointer: string): JsonSchema {
  const resolved = pointer
    .slice(2)
    .split("/")
    .reduce<unknown>((value, segment) => (isRecord(value) ? value[segment] : undefined), root);
  if (!isRecord(resolved)) throw new Error(`Unsupported schema reference: ${pointer}`);
  return resolved;
}

/** Minimal test-only evaluator for the JSON Schema keywords used by this contract. */
function schemaErrors(schema: JsonSchema, value: unknown, root = schema, path = "$"): string[] {
  if (typeof schema.$ref === "string")
    return schemaErrors(resolvePointer(root, schema.$ref), value, root, path);

  const errors: string[] = [];
  const type = schema.type;
  if (type === "object" && !isRecord(value)) return [`${path} must be an object`];
  if (type === "array" && !Array.isArray(value)) return [`${path} must be an array`];
  if (type === "string" && typeof value !== "string") return [`${path} must be a string`];
  if (type === "integer" && !Number.isInteger(value)) return [`${path} must be an integer`];
  if ("const" in schema && !Object.is(value, schema.const)) errors.push(`${path} must equal const`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value))
    errors.push(`${path} is outside enum`);
  if (typeof schema.pattern === "string" && typeof value === "string") {
    if (!new RegExp(schema.pattern, "u").test(value)) errors.push(`${path} does not match pattern`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      errors.push(`${path} has too few items`);
    if (isRecord(schema.items))
      value.forEach((item, index) =>
        errors.push(...schemaErrors(schema.items as JsonSchema, item, root, `${path}[${index}]`))
      );
  }
  if (isRecord(value)) {
    if (Array.isArray(schema.required)) {
      for (const property of schema.required) {
        if (typeof property === "string" && !(property in value))
          errors.push(`${path}.${property} is required`);
      }
    }
    if (isRecord(schema.properties)) {
      for (const [property, propertySchema] of Object.entries(schema.properties)) {
        if (property in value && isRecord(propertySchema))
          errors.push(
            ...schemaErrors(propertySchema, value[property], root, `${path}.${property}`)
          );
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const subschema of schema.allOf)
      if (isRecord(subschema)) errors.push(...schemaErrors(subschema, value, root, path));
  }
  if (
    isRecord(schema.if) &&
    isRecord(schema.then) &&
    schemaErrors(schema.if, value, root, path).length === 0
  )
    errors.push(...schemaErrors(schema.then, value, root, path));
  if (
    isRecord(schema.if) &&
    isRecord(schema.else) &&
    schemaErrors(schema.if, value, root, path).length > 0
  )
    errors.push(...schemaErrors(schema.else, value, root, path));
  return errors;
}

describe("CON-F11 external JSON contract", () => {
  it("accepts the documented concert and festival against the schema and real adapter", () => {
    const schema = JSON.parse(schemaJson) as JsonSchema;
    const example = JSON.parse(exampleJson) as unknown;

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schemaErrors(schema, example)).toEqual([]);
    const adapted = parseScrapedEventJson(exampleJson);
    expect(adapted.events).toHaveLength(2);
    expect(adapted.events.map(({ type }) => type)).toEqual(["concert", "festival"]);
    expect(adapted.events.map(({ issues }) => issues)).toEqual([[], []]);
    expect(adapted.events[1]?.artists).toEqual(["Artista A", "Artista B"]);
    expect(adapted.events[0]?.province).toBe("Barcelona");
    expect(
      (((schema.$defs as JsonSchema).event as JsonSchema).properties as JsonSchema).province
    ).toBeDefined();
  });

  it("encodes required fields and the festival title rule", () => {
    const schema = JSON.parse(schemaJson) as JsonSchema;
    const example = JSON.parse(exampleJson) as Record<string, unknown>;
    const festival = (example.events as Array<Record<string, unknown>>)[1]!;
    const withoutTitle = { ...example, events: [festival, { ...festival, title: undefined }] };
    delete (withoutTitle.events as Array<Record<string, unknown>>)[1]!.title;

    expect(schemaErrors(schema, withoutTitle)).toContain("$.events[1].title is required");
    expect(schemaErrors(schema, { ...example, version: 2 })).toContain(
      "$.version must equal const"
    );
  });

  it("accepts v2 tours while keeping tour rows out of the v1 contract", () => {
    const schemaV1 = JSON.parse(schemaJson) as JsonSchema;
    const schemaV2 = JSON.parse(schemaV2Json) as JsonSchema;
    const exampleV2 = JSON.parse(exampleV2Json) as Record<string, unknown>;
    const tour = (exampleV2.events as Array<Record<string, unknown>>)[2]!;
    const tourWithoutTitle = { ...tour };
    delete tourWithoutTitle.title;

    expect(schemaErrors(schemaV2, exampleV2)).toEqual([]);
    expect(parseScrapedEventJson(exampleV2Json).events.map(({ type }) => type)).toEqual([
      "concert",
      "festival",
      "tour",
    ]);
    expect(parseScrapedEventJson(exampleV2Json).events[2]?.title).toBe("European Tour 2027");
    expect(schemaErrors(schemaV2, { ...exampleV2, events: [tourWithoutTitle] })).toContain(
      "$.events[0].title is required"
    );
    expect(schemaErrors(schemaV1, { ...exampleV2, version: 1, events: [tour] })).toContain(
      "$.events[0].type is outside enum"
    );
    expect(
      parseScrapedEventJson(JSON.stringify({ ...exampleV2, version: 1, events: [tour] })).events[0]
        ?.issues
    ).toContain("Tipo inválido: usa concert o festival.");
  });

  it("documents the boundary between schema shape and adapter calendar checks", () => {
    const schema = JSON.parse(schemaJson) as JsonSchema;
    const example = JSON.parse(exampleJson) as Record<string, unknown>;
    const event = (example.events as Array<Record<string, unknown>>)[0]!;
    const invalidCalendarDate = { ...example, events: [{ ...event, startDate: "2027-02-30" }] };

    expect(schemaErrors(schema, invalidCalendarDate)).toEqual([]);
    expect(parseScrapedEventJson(JSON.stringify(invalidCalendarDate)).events[0]?.issues).toContain(
      "Fecha inicial inválida; usa AAAA-MM-DD."
    );
  });
});
