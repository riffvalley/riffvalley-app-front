import { describe, expect, it } from "vitest";
import { analyzeFiles } from "../../scripts/architecture.mjs";

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
});
