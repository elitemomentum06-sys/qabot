// In-memory stores (reset on cold start — fine for mock)
const hashStore = new Set();
let counter = 1000;

function generateFileId(filename) {
  counter++;
  return `NGFT-${counter}-${filename.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",  "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ status: "ERROR", reason: "Method not allowed. Use POST." }) };
  }

  // Force 500 for testing
  if (event.queryStringParameters && event.queryStringParameters.force500 === "true") {
    return { statusCode: 500, headers, body: JSON.stringify({ status: "UNAVAILABLE", code: "SERVER_ERROR", reason: "Forced 500 for testing" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "REJECTED", code: "INVALID_JSON", reason: "Request body is not valid JSON" }) };
  }

  // Validate required fields
  if (!body.filename) {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "REJECTED", code: "INVALID_REQUEST", reason: "Missing required field: filename" }) };
  }
  if (!body.contentHash) {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "REJECTED", code: "INVALID_REQUEST", reason: "Missing required field: contentHash" }) };
  }
  if (!body.isoType) {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "REJECTED", code: "INVALID_REQUEST", reason: "Missing required field: isoType" }) };
  }

  // Validate isoType
  if (body.isoType !== "ISO20022") {
    return { statusCode: 400, headers, body: JSON.stringify({ status: "REJECTED", code: "INVALID_ISO", reason: `isoType must be ISO20022, got: ${body.isoType}` }) };
  }

  // Check duplicate
  if (hashStore.has(body.contentHash)) {
    return { statusCode: 409, headers, body: JSON.stringify({ status: "DUPLICATE", code: "DUPLICATE", reason: `contentHash ${body.contentHash} already uploaded` }) };
  }

  hashStore.add(body.contentHash);
  const fileId = body.fileId || generateFileId(body.filename);
  const queueTimeUtc = new Date().toISOString();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "QUEUED",
      fileId,
      filename: body.filename,
      contentHash: body.contentHash,
      queueTimeUtc,
      next: `/batch/${fileId}/status`
    })
  };
};
