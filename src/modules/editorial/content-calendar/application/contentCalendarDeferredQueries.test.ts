// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RvUser } from "@/modules/identity/users";
import type { RadarListDetails } from "@services/list/list";

const { getRvUsers, getListDetails } = vi.hoisted(() => ({
  getRvUsers: vi.fn(),
  getListDetails: vi.fn(),
}));

vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("@services/list/list", () => ({ getListDetails }));

import {
  contentCalendarDeferredQueryKeys,
  useAssignableUsersQuery,
  useRadarListDetailsQuery,
} from "./contentCalendarDeferredQueries";

const users: RvUser[] = [
  { id: "user-1", username: "RV", email: "rv@example.test", image: null, role: "riffvalley" },
];
const listDetails = (id: string): RadarListDetails => ({
  id,
  name: `Lista ${id}`,
  type: "week",
  status: "new",
  asignations: [],
});

describe("Content Calendar deferred queries", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;
  let state: {
    session: ReturnType<
      typeof ref<{ userId: string | null; generation: number; role: string | null }>
    >;
    usersEnabled: ReturnType<typeof ref<boolean>>;
    listId: ReturnType<typeof ref<string | null>>;
    usersQuery: ReturnType<typeof useAssignableUsersQuery>;
    secondUsersQuery?: ReturnType<typeof useAssignableUsersQuery>;
    listQuery: ReturnType<typeof useRadarListDetailsQuery>;
  };

  function mountQueries(withSecondUsersObserver = false) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 60_000, refetchOnWindowFocus: false },
      },
    });
    wrapper = mount(
      defineComponent({
        setup() {
          const session = ref({ userId: "user-1", generation: 3, role: "riffvalley" });
          const usersEnabled = ref(false);
          const listId = ref<string | null>(null);
          const options = { session: () => session.value, enabled: usersEnabled };
          const usersQuery = useAssignableUsersQuery(options);
          const secondUsersQuery = withSecondUsersObserver
            ? useAssignableUsersQuery(options)
            : undefined;
          const listQuery = useRadarListDetailsQuery({
            session: () => session.value,
            enabled: ref(true),
            listId,
          });
          state = { session, usersEnabled, listId, usersQuery, secondUsersQuery, listQuery };
          return () => null;
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getRvUsers.mockResolvedValue(users);
    getListDetails.mockImplementation(async (id: string) => listDetails(id));
  });

  afterEach(() => {
    wrapper?.unmount();
    queryClient?.clear();
  });

  it("keeps users and list details idle until a modal enables them", async () => {
    mountQueries();
    await flushPromises();
    expect(getRvUsers).not.toHaveBeenCalled();
    expect(getListDetails).not.toHaveBeenCalled();

    state.usersEnabled.value = true;
    state.listId.value = "list-1";
    await vi.waitFor(() => {
      expect(getRvUsers).toHaveBeenCalledOnce();
      expect(getListDetails).toHaveBeenCalledOnce();
    });
    expect(getRvUsers).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getListDetails).toHaveBeenCalledWith("list-1", expect.any(AbortSignal));
  });

  it("deduplicates simultaneous observers and reuses fresh user data", async () => {
    let resolveUsers!: (value: RvUser[]) => void;
    getRvUsers.mockImplementation(
      () =>
        new Promise<RvUser[]>((resolve) => {
          resolveUsers = resolve;
        })
    );
    mountQueries(true);
    state.usersEnabled.value = true;
    await vi.waitFor(() => expect(getRvUsers).toHaveBeenCalledOnce());
    resolveUsers(users);
    await flushPromises();

    state.usersEnabled.value = false;
    await flushPromises();
    state.usersEnabled.value = true;
    await flushPromises();
    expect(getRvUsers).toHaveBeenCalledOnce();
    expect(state.secondUsersQuery?.data.value).toEqual(users);
  });

  it("isolates user cache by session and retries an error without keeping local remote state", async () => {
    getRvUsers.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(users);
    mountQueries();
    state.usersEnabled.value = true;
    await vi.waitFor(() => expect(state.usersQuery.isError.value).toBe(true));
    expect(state.usersQuery.data.value).toBeUndefined();

    await state.usersQuery.refetch();
    expect(state.usersQuery.data.value).toEqual(users);
    expect(getRvUsers).toHaveBeenCalledTimes(2);

    state.session.value = { userId: "user-2", generation: 4, role: "riffvalley" };
    await vi.waitFor(() => expect(getRvUsers).toHaveBeenCalledTimes(3));
    expect(
      queryClient.getQueryData(
        contentCalendarDeferredQueryKeys.assignableUsers(state.session.value)
      )
    ).toEqual(users);
    expect(
      queryClient.getQueryData(
        contentCalendarDeferredQueryKeys.assignableUsers({
          userId: "user-1",
          generation: 3,
          role: "riffvalley",
        })
      )
    ).toEqual(users);
  });

  it("loads details per List ID, never exposes the previous List, and reuses cached IDs", async () => {
    mountQueries();
    state.listId.value = "list-1";
    await vi.waitFor(() => expect(state.listQuery.data.value?.id).toBe("list-1"));

    let resolveSecond!: (value: RadarListDetails) => void;
    getListDetails.mockImplementationOnce(
      async () =>
        new Promise<RadarListDetails>((resolve) => {
          resolveSecond = resolve;
        })
    );
    state.listId.value = "list-2";
    await nextTick();
    expect(state.listQuery.data.value).toBeUndefined();
    await vi.waitFor(() => expect(getListDetails).toHaveBeenCalledTimes(2));
    resolveSecond(listDetails("list-2"));
    await vi.waitFor(() => expect(state.listQuery.data.value?.id).toBe("list-2"));

    state.listId.value = "list-1";
    await flushPromises();
    expect(state.listQuery.data.value?.id).toBe("list-1");
    expect(getListDetails).toHaveBeenCalledTimes(2);
  });

  it("invalidates only the selected List details and refetches after a mutation", async () => {
    mountQueries();
    state.listId.value = "list-1";
    await vi.waitFor(() => expect(state.listQuery.data.value?.id).toBe("list-1"));

    await queryClient.invalidateQueries({
      queryKey: contentCalendarDeferredQueryKeys.listDetails(state.session.value, "list-1"),
      exact: true,
    });

    expect(getListDetails).toHaveBeenCalledTimes(2);
    expect(state.listQuery.data.value?.id).toBe("list-1");
  });

  it("shows List query errors without data and recovers through a retry", async () => {
    getListDetails.mockRejectedValueOnce(new Error("Lists unavailable"));
    mountQueries();
    state.listId.value = "list-1";
    await vi.waitFor(() => expect(state.listQuery.isError.value).toBe(true));
    expect(state.listQuery.data.value).toBeUndefined();

    await state.listQuery.refetch();

    expect(state.listQuery.data.value?.id).toBe("list-1");
    expect(getListDetails).toHaveBeenCalledTimes(2);
  });
});
