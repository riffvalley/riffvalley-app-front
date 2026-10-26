function incompleteCount(scan) {
  return Math.max(scan?.unresolved?.length ?? 0, scan?.outOfSourceDependencyCount ?? 0);
}

export function evaluateComparison({
  control,
  required,
  baseSha,
  headSha,
  baseline,
  current,
  regressionCount = 0,
  regressionDescription,
  referenceError,
  analysisError,
}) {
  const fail = (reason) => ({
    reliable: false,
    exitCode: required ? 2 : 0,
    status: required ? "failed" : "informational",
    message: required
      ? `Required ${control} comparison failed: ${reason}.`
      : `${control} comparison is informational: ${reason}.`,
  });

  if (referenceError) return fail(referenceError);
  if (required && (!baseSha || !headSha)) {
    return fail("base and head references are required");
  }
  if (!baseSha || !headSha) return fail("no reproducible base/head reference is available");
  if (analysisError) return fail(`analyzer failed (${analysisError})`);
  if (!baseline || !current) return fail("base or head graph is unavailable");

  const baselineIncomplete = incompleteCount(baseline);
  const currentIncomplete = incompleteCount(current);
  if (baselineIncomplete || currentIncomplete) {
    const example = (scan) => scan?.unresolved?.[0];
    const baseExample = example(baseline);
    const headExample = example(current);
    return fail(
      `base graph has ${baselineIncomplete} unresolved/out-of-scope edge(s)${baseExample ? ` (for example: ${baseExample})` : ""}; head graph has ${currentIncomplete}${headExample ? ` (for example: ${headExample})` : ""}`
    );
  }

  if (regressionCount > 0) {
    return {
      reliable: true,
      exitCode: 1,
      status: "regression",
      message: `${control} comparison found ${regressionCount} new ${regressionDescription}.`,
    };
  }

  return {
    reliable: true,
    exitCode: 0,
    status: "passed",
    message: `${control} comparison passed against ${baseSha}..${headSha}.`,
  };
}
