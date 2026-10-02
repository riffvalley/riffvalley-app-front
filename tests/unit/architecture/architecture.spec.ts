import { describe, expect, it } from "vitest";
import { analyzeFiles } from "../../../scripts/architecture.mjs";

describe("guard de arquitectura", () => {
  it("rechaza HTTP en presentation", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/presentation/composables/useCatalog.ts":
        'import axios from "axios";\naxios.get("/catalog");',
    });

    expect(diagnostics.join("\n")).toContain("HTTP y servicios legacy solo se permiten detrás de infrastructure");
  });

  it("rechaza frameworks y any en domain/application", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/domain/catalog.ts": 'import { ref } from "vue";\nexport type Catalog = any;',
    });

    expect(diagnostics.join("\n")).toContain("no puede importar Vue");
    expect(diagnostics.join("\n")).toContain("no se permite any nuevo");
  });

  it("rechaza imports internos entre módulos y detecta ciclos", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/application/read.ts": 'import { item } from "@/modules/community/domain/item"; export { item };',
      "src/modules/community/domain/item.ts": 'import { read } from "../../catalog/application/read"; export const item = read;',
    });

    expect(diagnostics.join("\n")).toContain("importa internals del módulo community");
    expect(diagnostics.join("\n")).toContain("ciclo relevante");
  });

  it("acepta un adaptador HTTP aislado en infrastructure", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/infrastructure/catalogApi.ts": 'import axios from "axios"; export const load = () => axios.get("/catalog");',
    });

    expect(diagnostics).toEqual([]);
  });

  it("rechaza dependencias hacia presentation desde application", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/application/read.ts": 'import { view } from "../presentation/view"; export { view };',
      "src/modules/catalog/presentation/view.ts": "export const view = true;",
    });

    expect(diagnostics.join("\n")).toContain("la capa application no puede depender de presentation");
  });

  it("rechaza any en el composition root", () => {
    const diagnostics = analyzeFiles({ "src/app/bootstrap/types.ts": "export type Loose = any;" });

    expect(diagnostics.join("\n")).toContain("no se permite any nuevo");
  });

  it("rechaza fetch directo en presentation", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/presentation/pages/CatalogPage.ts": "export const load = () => fetch('/catalog');",
    });

    expect(diagnostics.join("\n")).toContain("no puede realizar HTTP directamente");
  });
  it("permite publicar la API propia sin permitir internals de otro módulo", () => {
    expect(analyzeFiles({
      "src/modules/identity/index.ts": 'export { store } from "./presentation/store";',
      "src/modules/identity/presentation/store.ts": 'export const store = true;',
      "src/modules/workspace/presentation/consumer.ts": 'import { store } from "@/modules/identity"; export { store };',
    })).toEqual([]);
    expect(analyzeFiles({
      "src/modules/workspace/index.ts": 'export { store } from "@/modules/identity/presentation/store";',
    }).join("\n")).toContain("importa internals del módulo identity");
  });

  it("aplica los límites de capas dentro de capacidades y funcionalidades", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/artists/listing/application/read.ts":
        'import { view } from "../presentation/view"; import { ref } from "vue"; export const read = () => { ref(window.location); return view; };',
      "src/modules/catalog/artists/listing/presentation/view.ts":
        'import api from "@/shared/infrastructure/http/client"; export const view = api;',
      "src/shared/infrastructure/http/client.ts": "export default {};",
    });
    expect(diagnostics.join("\n")).toContain("la capa application no puede depender de presentation");
    expect(diagnostics.join("\n")).toContain("la capa application no puede importar Vue");
    expect(diagnostics.join("\n")).toContain("APIs del navegador (window)");
    expect(diagnostics.join("\n")).toContain("HTTP y servicios legacy solo se permiten detrás de infrastructure");
  });

  it("reconoce adaptadores y contratos anidados sin relajar los límites entre módulos", () => {
    const files = {
      "src/modules/catalog/discs/calendars/infrastructure/api.ts":
        'import api from "@services/api/api.ts"; import type { Page } from "../application/port"; export const load = (): Promise<Page> => api.get("/discs/date");',
      "src/modules/catalog/discs/calendars/application/port.ts": "export interface Page { total: number }",
    };
    expect(analyzeFiles(files)).toEqual([]);
    expect(analyzeFiles({
      ...files,
      "src/modules/community/ratings/presentation/card.ts":
        'import { load } from "@/modules/catalog/discs/calendars/infrastructure/api"; export { load };',
      "src/modules/catalog/artists/listing/application/read.ts":
        'import { rating } from "@/modules/community"; export { rating };',
    }).join("\n")).toContain("importa internals del módulo catalog");
    expect(analyzeFiles({
      "src/modules/catalog/artists/listing/application/read.ts":
        'import { rating } from "@/modules/community"; export { rating };',
    }).join("\n")).toContain("la capa application no puede depender de otro módulo (community)");
  });

  it("detecta ciclos entre funcionalidades y rechaza dependencias hacia app", () => {
    const diagnostics = analyzeFiles({
      "src/modules/catalog/artists/listing/application/read.ts":
        'import { edit } from "../../editing/application/edit"; export const read = edit;',
      "src/modules/catalog/artists/editing/application/edit.ts":
        'import { read } from "../../listing/application/read"; import { compose } from "@/app/dependencies/catalog"; export const edit = () => { compose(); return read; };',
      "src/app/dependencies/catalog.ts": "export const compose = () => {};",
    });
    expect(diagnostics.join("\n")).toContain("ciclo relevante");
    expect(diagnostics.join("\n")).toContain("un módulo no puede depender del composition root app");
  });

});
