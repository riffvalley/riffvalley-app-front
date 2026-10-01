import type { DiscListPort, DiscListParams, DiscListResult } from "./discListPort";

export async function listDiscs(
  port: DiscListPort,
  params: DiscListParams,
): Promise<DiscListResult> {
  const result = await port.getDiscs(params);
  return {
    ...result,
    data: result.data.map((disc) => ({
      ...disc,
      userRate: disc.userRate
        ? {
            ...disc.userRate,
            rate: disc.userRate.rate == null ? null : Number(disc.userRate.rate),
            cover: disc.userRate.cover == null ? null : Number(disc.userRate.cover),
          }
        : null,
    })),
  };
}
