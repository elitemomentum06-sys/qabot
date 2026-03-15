const { handler } = require("../netlify/functions/upload");

function makeEvent(body, method = "POST", query = {}) {
  return {
    httpMethod: method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    queryStringParameters: query,
    path: "/.netlify/functions/upload"
  };
}

describe("POST /upload", () => {
  test("returns 200 QUEUED for valid request", async () => {
    const res = await handler(makeEvent({
      filename: "settlement.xml",
      contentHash: "unique_hash_1",
      isoType: "ISO20022",
      sizeBytes: 1024
    }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("QUEUED");
    expect(body.fileId).toBeDefined();
    expect(body.next).toContain("/batch/");
  });

  test("returns 400 when filename missing", async () => {
    const res = await handler(makeEvent({
      contentHash: "hash2",
      isoType: "ISO20022"
    }));
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("INVALID_REQUEST");
    expect(body.reason).toContain("filename");
  });

  test("returns 400 when contentHash missing", async () => {
    const res = await handler(makeEvent({
      filename: "test.xml",
      isoType: "ISO20022"
    }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).reason).toContain("contentHash");
  });

  test("returns 400 when isoType missing", async () => {
    const res = await handler(makeEvent({
      filename: "test.xml",
      contentHash: "hash3"
    }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).reason).toContain("isoType");
  });

  test("returns 400 INVALID_ISO for wrong isoType", async () => {
    const res = await handler(makeEvent({
      filename: "test.xml",
      contentHash: "hash4",
      isoType: "ISO8583"
    }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe("INVALID_ISO");
  });

  test("returns 409 DUPLICATE for same contentHash", async () => {
    // First upload
    await handler(makeEvent({
      filename: "test.xml",
      contentHash: "duplicate_hash_test",
      isoType: "ISO20022"
    }));
    // Second upload with same hash
    const res = await handler(makeEvent({
      filename: "test2.xml",
      contentHash: "duplicate_hash_test",
      isoType: "ISO20022"
    }));
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe("DUPLICATE");
  });

  test("returns 500 when force500=true", async () => {
    const res = await handler(makeEvent(
      { filename: "test.xml", contentHash: "hash5", isoType: "ISO20022" },
      "POST",
      { force500: "true" }
    ));
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).status).toBe("UNAVAILABLE");
  });

  test("returns 400 for invalid JSON body", async () => {
    const res = await handler(makeEvent("not json at all"));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe("INVALID_JSON");
  });

  test("returns 405 for GET method", async () => {
    const res = await handler(makeEvent({}, "GET"));
    expect(res.statusCode).toBe(405);
  });
});
