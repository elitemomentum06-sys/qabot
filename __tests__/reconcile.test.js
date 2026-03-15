const { handler } = require("../netlify/functions/reconcile");

function makeEvent(fileId, query = {}) {
  return {
    httpMethod: "GET",
    path: `/.netlify/functions/reconcile/${fileId}`,
    queryStringParameters: query
  };
}

describe("GET /reconcile/:fileId", () => {
  test("returns RECONCILED for normal fileId (ends in 0)", async () => {
    const res = await handler(makeEvent("NGFT-1001-test0"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("RECONCILED");
    expect(body.dbProjection.table).toBe("ACSTRANSACTION");
    expect(body.dbProjection.updates.STATUS).toBe("RECONCILED");
  });

  test("returns EXCEPTION RC_1 for fileId ending in 1", async () => {
    const res = await handler(makeEvent("NGFT-1001-test1"));
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("EXCEPTION");
    expect(body.exception.category).toBe("RC_1");
    expect(body.exception.reason).toBe("UNKNOWN");
  });

  test("returns EXCEPTION RC_4 for fileId ending in 9", async () => {
    const res = await handler(makeEvent("NGFT-1001-test9"));
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("EXCEPTION");
    expect(body.exception.category).toBe("RC_4_FOR_TRAN_REC_AMT_0");
  });

  test("returns EXCEPTION for fileId containing EXC", async () => {
    const res = await handler(makeEvent("NGFT-EXC-test0"));
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("EXCEPTION");
    expect(body.dbProjection.table).toBe("RECON_EXCP");
  });

  test("force override to RECONCILED", async () => {
    const res = await handler(makeEvent("NGFT-1001-test1", { force: "RECONCILED" }));
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("RECONCILED");
  });

  test("force override to EXCEPTION", async () => {
    const res = await handler(makeEvent("NGFT-1001-test0", { force: "EXCEPTION" }));
    const body = JSON.parse(res.body);
    expect(body.outcome).toBe("EXCEPTION");
  });

  test("RECONCILED response has matchedBy ART", async () => {
    const res = await handler(makeEvent("NGFT-1001-test2"));
    const body = JSON.parse(res.body);
    expect(body.dbProjection.matchedBy).toBe("ART");
    expect(body.dbProjection.acquirerRefTxt).toContain("NGFT-1001-test2");
  });

  test("returns error for missing fileId", async () => {
    const res = await handler({
      httpMethod: "GET",
      path: "/.netlify/functions/reconcile/",
      queryStringParameters: {}
    });
    expect(res.statusCode).toBe(400);
  });
});
