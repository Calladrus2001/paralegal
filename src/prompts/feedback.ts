export const buildAttributionPrompt = (incorrectClaim: string, chunksText: string) => `
You are an expert legal auditor. A user has provided feedback about an AI-generated response.
Your task is to identify which of the following candidate chunks is the primary source or the most relevant context for this feedback.

Feedback Detail/Claim:
"${incorrectClaim}"

Candidate Chunks:
${chunksText}

Instructions:
1. Review each chunk carefully.
2. For each chunk, look for the specific sentences, figures, or context that most directly support or relate to the "Feedback Detail/Claim".
3. **Evidence-First Approach**: Identify the EXACT quote from the chunk that is most relevant to the feedback.
4. Pick the chunk that provides the most complete semantic match for the feedback. 
5. If the feedback is completely unrelated to any of the chunks, set culpritChunkId to null.
6. Provide the UUID of the most likely culprit, your reasoning, and the extracted quote.

Provide your result as a JSON object matching the requested schema.
`.trim();
