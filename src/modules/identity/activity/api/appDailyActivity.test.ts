import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { post } }));

import { notifyAppDailyActivity } from "@/modules/identity/activity/api/appDailyActivity";

describe("App daily activity notification", () => {
  beforeEach(() => post.mockReset());

  it("posts without a body through the authenticated API client", () => {
    post.mockResolvedValue({});

    notifyAppDailyActivity();

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith("/activity/app/daily");
  });

});
