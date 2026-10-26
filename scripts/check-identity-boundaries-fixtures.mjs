import assert from "node:assert/strict";
import {
  addedIdentityBoundaryFindings,
  classifyIdentityEdge,
  collectIdentityBoundaryFindings,
  countIdentityTestEdges,
  hasBlockingIdentityBoundaryDelta,
} from "./check-identity-boundaries.mjs";

const classify = (from, to) => classifyIdentityEdge({ from, to });

assert.equal(
  classify(
    "src/modules/identity/users/composables/useAdminUsersQuery.ts",
    "src/modules/identity/users/api/users.ts"
  ).reason,
  "same-owner",
  "internal imports inside one owner remain valid"
);
assert.equal(
  classify("src/views/articles/ArticlesKanban.vue", "src/modules/identity/users/index.ts").reason,
  "public-contract",
  "an alias-resolved external import through a public entry remains valid"
);
assert.equal(
  classify(
    "src/modules/identity/activity/composables/useAdminActivityQueries.ts",
    "src/modules/identity/users/api/users.ts"
  ).kind,
  "private-import",
  "cross-owner imports to private implementation files are rejected"
);
assert.equal(
  classify(
    "src/modules/identity/account/preferences/composables/useDashboardPreferences.ts",
    "src/modules/identity/users/index.ts"
  ).kind,
  "forbidden-owner-dependency",
  "public entrypoints do not permit an unapproved owner direction"
);
assert.equal(
  classify(
    "src/router/index.ts",
    "src/modules/identity/activity/user-activity/UserActivityView.vue"
  ).reason,
  "router-view-composition",
  "Router may compose the explicitly approved Vue route views"
);
assert.equal(
  classify("src/router/index.ts", "src/modules/identity/activity/api/activity.ts").kind,
  "private-import",
  "Router composition does not grant access to feature implementation"
);
assert.equal(
  classify("src/views/articles/ArticlesKanban.test.ts", "src/modules/identity/users/api/users.ts")
    .reason,
  "test",
  "tests remain classified separately from production boundaries"
);

const baseline = [
  {
    from: "src/views/legacy/OldView.vue",
    to: "src/modules/identity/users/api/users.ts",
    kind: "private-import",
  },
];
const current = [
  ...baseline,
  {
    from: "src/views/new/NewView.vue",
    to: "src/modules/identity/users/api/users.ts",
    kind: "private-import",
  },
];
const graph = new Map([
  [baseline[0].from, [{ to: baseline[0].to }]],
  [current[1].from, [{ to: current[1].to }]],
  [
    "src/views/articles/ArticlesKanban.test.ts",
    [{ to: "src/modules/identity/users/api/users.ts" }],
  ],
]);
assert.deepEqual(collectIdentityBoundaryFindings(graph), current);
assert.equal(
  countIdentityTestEdges(graph),
  1,
  "test imports are counted separately from production"
);
assert.deepEqual(
  addedIdentityBoundaryFindings(current, baseline),
  [current[1]],
  "only the new violation is blocking; an identical legacy violation is baseline debt"
);
assert.equal(
  hasBlockingIdentityBoundaryDelta(false, current, baseline),
  false,
  "an incomplete Git comparison reports but never blocks a delta"
);
assert.equal(
  hasBlockingIdentityBoundaryDelta(true, current, baseline),
  true,
  "a new production violation blocks when the comparison is reliable"
);

console.log(
  "Identity boundary fixtures passed (internal, public, private, owner direction, Router Vue, test, delta)."
);
