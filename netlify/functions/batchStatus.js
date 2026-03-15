// Deterministic state machine based on fileId
// fileId ending in odd digit or "FAIL" → FAILED path
// everything else → PROCESSED path

function getState(fileId, forceState) {
  if (forceState) {
    const valid = ["QUEUED", "PICKED", "PROCESSED", "FAILED"];
    if (valid.includes(forceState.toUpperCase())) {
      return forceState.toUpperCase();
    }
  }

  // Deterministic: hash the fileId to pick a state
  const lastChar = fileId.slice(-1);
  const isFail = fileId.toUpperCase().includes("FAIL") || lastChar === "7" || lastChar === "3";

  if (isFail) {
    return "FAILED";
  }
  return "PROCESSED";
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  // Extract fileId from path: /.netlify/functions/batchStatus/<fileId>
  const pathParts = event.path.split("/").filter(Boolean);
  // Path: .netlify/functions/batchStatus/<fileId> OR batch/<fileId>/status
  let fileId = null;
  const batchIdx = pathParts.indexOf("batchStatus");
  if (batchIdx !== -1 && pathParts[batchIdx + 1]) {
    fileId = pathParts[batchIdx + 1];
  }
  if (!fileId) {
    // Try /batch/:fileId/status pattern
    const bIdx = pathParts.indexOf("batch");
    if (bIdx !== -1 && pathParts[bIdx + 1]) {
      fileId = pathParts[bIdx + 1];
    }
  }

  if (!fileId) {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "ERROR", reason: "Missing fileId in path" }) };
  }

  const forceState = event.queryStringParameters && event.queryStringParameters.force;
  const currentState = getState(fileId, forceState);

  const stateFlow = currentState === "FAILED"
    ? ["QUEUED", "PICKED", "FAILED"]
    : ["QUEUED", "PICKED", "PROCESSED"];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      fileId,
      currentState,
      stateFlow,
      pollIntervalMs: currentState === "QUEUED" ? 5000 : currentState === "PICKED" ? 3000 : 0,
      terminal: currentState === "PROCESSED" || currentState === "FAILED",
      timestamp: new Date().toISOString()
    })
  };
};
