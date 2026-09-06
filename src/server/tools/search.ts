import { tool } from "@langchain/core/tools";
import { z } from "zod";

const SearchCaseDocumentsSchema = z.object({
  query: z.string().describe(
    "A standalone, detailed search query optimized for vector search. If the user's question is a follow-up referring to previous messages (e.g. 'when was this decided?'), resolve all pronouns and context from chat history to produce a fully self-contained search query (e.g. 'decision date for High Court judge appointment criteria')."
  ),
});

export const searchCaseDocumentsTool = tool(
  async ({ query }) => query,
  {
    name: "search_case_documents",
    description:
      "Searches the uploaded PDF case files and legal documents for relevant text chunks. Call this tool whenever the user asks a question requiring factual information, legal analysis, or specific details from their documents.",
    schema: SearchCaseDocumentsSchema,
  }
);
