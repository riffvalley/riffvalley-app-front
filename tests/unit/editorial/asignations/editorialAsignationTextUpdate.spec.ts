import { expectTypeOf, it } from "vitest";
import type { AsignationTextUpdatePort } from "../../../../src/modules/editorial/asignations/application/asignationTextUpdatePort";
import type { AsignationTextUpdate } from "../../../../src/modules/editorial/asignations/domain/asignationTextUpdate";

it("limits the update payload to the four fields emitted by DiscDescriptionModal", () => {
  expectTypeOf<AsignationTextUpdate>().toEqualTypeOf<{
    description: string;
    similarBands: string;
    spotifyTrackId: string;
    genre: string;
  }>();
  expectTypeOf<AsignationTextUpdatePort["updateAsignationText"]>().toEqualTypeOf<(
    asignationId: string,
    data: AsignationTextUpdate,
  ) => Promise<void>>();
});
