declare module "d3-composite-projections" {
  import type { GeoProjection } from "d3-geo";

  export interface CompositeProjection extends GeoProjection {
    getCompositionBorders(): string;
  }

  export function geoConicConformalSpain(): CompositeProjection;
}
