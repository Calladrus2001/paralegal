export const buildCorrectionAuditorPrompt = (existingCorrectionsText: string, incorrectClaim: string, correctValue: string) => `
You are auditing corrections on a knowledge base chunk.
Existing corrections for this chunk:
${existingCorrectionsText}

New correction submitted by a user:
incorrect_claim: "${incorrectClaim}"
correct_value: "${correctValue}"

Classify the new correction as exactly one of:
- NEW: addresses a claim not covered by any existing correction.
- VOTE: agrees with an existing correction (return the claim_id it matches).
- CONTRADICTION: conflicts with an existing correction (return the claim_id it conflicts with).
`.trim();
