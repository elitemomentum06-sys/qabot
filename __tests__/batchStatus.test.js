const { handler } = require("../netlify/functions/batchStatus");

function makeEvent(fileId, query = {}) {
  return {
    httpMethod: "GET",
    path: `/.netlify/functions/batchStatus/${fileId}`,
    queryStringParameters: query
  };
}

describe("GET /batch/:fileId/status", () => {
  test("returns PROCESSED for normal fileId (ends in 0)", async () => {
    const res = await handler(makeEvent("NGFT-1001-test0"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("PROCESSED");
    expect(body.terminal).toBe(true);
    expect(body.fileId).toBe("NGFT-1001-test0");
  });

  test("returns FAILED for fileId ending in 7", async () => {
    const res = await handler(makeEvent("NGFT-1001-test7"));
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("FAILED");
    expect(body.terminal).toBe(true);
  });

  test("returns FAILED for fileId ending in 3", async () => {
    const res = await handler(makeEvent("NGFT-1001-test3"));
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("FAILED");
  });

  test("returns FAILED for fileId containing FAIL", async () => {
    const res = await handler(makeEvent("NGFT-FAIL-test0"));
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("FAILED");
  });

  test("force override returns requested state", async () => {
    const res = await handler(makeEvent("NGFT-1001-test0", { force: "FAILED" }));
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("FAILED");
  });

  test("returns PROCESSED for fileId ending in 2", async () => {
    const res = await handler(makeEvent("NGFT-1001-test2"));
    const body = JSON.parse(res.body);
    expect(body.currentState).toBe("PROCESSED");
  });

  test("returns error for missing fileId", async () => {
    const res = await handler({
      httpMethod: "GET",
      path: "/.netlify/functions/batchStatus/",
      queryStringParameters: {}
    });
    // Path parsing: batchStatus/ with nothing after → should have fileId as empty string
    // Actually the split will give empty string which is falsy
    expect(res.statusCode).toBe(400);
  });

  test("stateFlow is correct for processed", async () => {
    const res = await handler(makeEvent("NGFT-1001-test0"));
    const body = JSON.parse(res.body);
    expect(body.stateFlow).toEqual(["QUEUED", "PICKED", "PROCESSED"]);
  });

  test("stateFlow is correct for failed", async () => {
    const res = await handler(makeEvent("NGFT-1001-test7"));
    const body = JSON.parse(res.body);
    expect(body.stateFlow).toEqual(["QUEUED", "PICKED", "FAILED"]);
  });
});
