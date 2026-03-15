// Deterministic reconciliation based on fileId
// fileId containing "EXC" or ending in "1" → EXCEPTION
// everything else → RECONCILED

function getOutcome(fileId, forceOutcome) {
  if (forceOutcome) {
    const valid = ["RECONCILED", "EXCEPTION"];
    if (valid.includes(forceOutcome.toUpperCase())) {
      return forceOutcome.toUpperCase();
    }
  }

  const upper = fileId.toUpperCase();
  const lastChar = fileId.slice(-1);

  if (upper.includes("EXC") || lastChar === "1" || lastChar === "9") {
    return "EXCEPTION";
  }
  return "RECONCILED";
}

function getExceptionDetails(fileId) {
  const lastChar = fileId.slice(-1);
  if (lastChar === "1") {
    return { category: "RC_1", reason: "UNKNOWN", detail: "Record not found in SEND DB" };
  }
  if (lastChar === "9") {
    return { category: "RC_4_FOR_TRAN_REC_AMT_0", reason: "REVERSAL", detail: "Reversal indicator present, amount is zero" };
  }
  return { category: "RC_2", reason: "FAILED_MATCH", detail: "Record found in SEND DB but status is FAILED" };
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  // Extract fileId from path
  const pathParts = event.path.split("/").filter(Boolean);
  let fileId = null;
  const reconIdx = pathParts.indexOf("reconcile");
  if (reconIdx !== -1 && pathParts[reconIdx + 1]) {
    fileId = pathParts[reconIdx + 1];
  }

  if (!fileId) {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "ERROR", reason: "Missing fileId in path" }) };
  }

  const forceOutcome = event.queryStringParameters && event.queryStringParameters.force;
  const outcome = getOutcome(fileId, forceOutcome);

  const response = {
    fileId,
    outcome,
    timestamp: new Date().toISOString()
  };

  if (outcome === "RECONCILED") {
    response.dbProjection = {
      table: "ACSTRANSACTION",
      updates: {
        NTWRK_SETL_AMT: 1500.00,
        NTWRK_SETL_CURR_CD: "USD",
        NTWRK_SETL_DT: new Date().toISOString().split("T")[0],
        RECONCILED_DT: new Date().toISOString(),
        STATUS: "RECONCILED"
      },
      matchedBy: "ART",
      acquirerRefTxt: `ART-${fileId}`
    };
  } else {
    response.exception = getExceptionDetails(fileId);
    response.dbProjection = {
      table: "RECON_EXCP",
      insert: {
        EXCP_CATG: response.exception.category,
        EXCP_RSN: response.exception.reason,
        FILE_ID: fileId,
        CRTE_DT: new Date().toISOString()
      }
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
};
