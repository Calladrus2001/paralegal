export const SUMMARY_INSTRUCTIONS = `
Your task is to maintain a concise, factual case summary for a Legal Q&A assistant.
- Format: Use bullet points.
- Tone: Professional and objective.
- Length: Strictly under 200 words.
- Update: Integrate new facts from the provided turn into the existing summary.
`.trim();

export const buildSummaryData = (summary: string | null, lastTurn: any, query: string, assistantResponse: string) => `
Existing Summary: ${summary || "None"}
Previous Turn: ${lastTurn ? `User: ${lastTurn.user}\nAI: ${lastTurn.assistant}` : "None"}
New Interaction:
User Question: ${query}
AI Response: ${assistantResponse}
`.trim();
