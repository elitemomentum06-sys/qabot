# Reconciliation Rules — Mock Deterministic Mapping

## Overview
After Axon processes a batch file (Step 5), reconciliation determines whether each transaction is **RECONCILED** or an **EXCEPTION** (Step 6).

## Deterministic Rules (Mock)

| fileId Pattern | Outcome | Exception Category |
|---|---|---|
| Ends in `1` | EXCEPTION | RC_1 — UNKNOWN (Record not found in SEND DB) |
| Ends in `9` | EXCEPTION | RC_4_FOR_TRAN_REC_AMT_0 — REVERSAL |
| Contains `EXC` | EXCEPTION | RC_2 — FAILED_MATCH |
| All others | RECONCILED | N/A |

Override: Use `?force=RECONCILED` or `?force=EXCEPTION` query param.

## RECONCILED Response
When reconciled, the mock returns a `dbProjection` showing what would be written:
- **Table**: `ACSTRANSACTION`
- **Fields updated**: `NTWRK_SETL_AMT`, `NTWRK_SETL_CURR_CD`, `NTWRK_SETL_DT`, `RECONCILED_DT`, `STATUS`
- **Match key**: `ART` (Acquirer Reference Text)

## EXCEPTION Response
When exception, the mock returns:
- **Table**: `RECON_EXCP`
- **Fields inserted**: `EXCP_CATG`, `EXCP_RSN`, `FILE_ID`, `CRTE_DT`

## Real Business Rules Reference
| # | Condition | Result |
|---|---|---|
| 1 | ART match + same Amount & Currency | RECONCILED |
| 2 | ART match + different Currency | RECONCILED (overwrite Currency) |
| 3 | ART match + different Amount | RECONCILED (overwrite Amount) |
| 4 | ART match + both differ | RECONCILED (overwrite both) |
| 5 | No ART match | EXCEPTION (RC_1 — Unknown) |
| 6 | No ART match + Reversal Indicator Y | RC_4_FOR_TRAN_REC_AMT_0 (skip) |
| 7 | Record in SEND DB, status FAILED | RC_2 (mark reconciled, update) |
| 8 | Record in SEND DB, status SUCCESS | RECONCILED |
| 9 | ICA not in processed list | SKIP |
| 10 | Business partner ICA | CLEARING (skip recon) |
| 11 | Message Type 1740, valid function code | DISPUTE |
| 12 | Message Type other than 1240/1740/1442 | SKIP |
