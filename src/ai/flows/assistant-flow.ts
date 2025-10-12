
'use server';
/**
 * @fileOverview The main AI assistant flow for the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { orderSearchTool } from '@/ai/tools/order-search-tool';
import { salesReportTool } from '@/ai/tools/sales-report-tool';
import { userSearchTool } from '@/ai/tools/user-search-tool';
import { attendanceReportTool } from '@/ai/tools/attendance-report-tool'; // Import new tool

export type AssistantInput = z.infer<typeof AssistantInputSchema>;
const AssistantInputSchema = z.object({
  query: z.string().describe("The user's query for the assistant."),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
const AssistantOutputSchema = z.string().describe("The assistant's response.");


/**
 * The main assistant flow that responds to user queries.
 * @param {AssistantInput} input The user's query.
 * @returns {Promise<AssistantOutput>} The assistant's response.
 */
export async function assistant(input: AssistantInput): Promise<AssistantOutput> {
  const systemPrompt = `You are a helpful AI assistant for an application called Color Hut.
      You have access to several tools to get information about orders, sales reports, attendance, and users.
      - If the user asks about a specific order, use the orderSearchTool.
      - If the user asks for sales data, order counts, or revenue over a period of time (e.g., "today's sales", "last week's orders", "this year's revenue"), use the salesReportTool.
      - If the user asks for an attendance report for a specific period, use the attendanceReportTool.
      - If the user asks for information about a user, use the userSearchTool.
      - You can also perform simple calculations and answer general knowledge questions.

      When presenting details, format it nicely using Markdown. Be concise and helpful.
      Summarize the key details. If multiple items are found, list them briefly.
      If no information is found, inform the user.
      Do not make up information. If a tool does not provide an answer, say you cannot find the information.`;
      
  const llmResponse = await ai.generate({
    prompt: `${systemPrompt}\n\nUser query: ${input.query}`,
    tools: [orderSearchTool, salesReportTool, userSearchTool, attendanceReportTool], // Add new tool
  });

  const toolRequests = llmResponse.toolRequests;
  if (toolRequests && toolRequests.length > 0) {
    const toolRequest = toolRequests[0]; // Handle the first tool request
    const toolResult = await toolRequest.run();
    
    const secondResponse = await ai.generate({
        prompt: input.query,
        tools: [orderSearchTool, salesReportTool, userSearchTool, attendanceReportTool], // Add new tool
        history: [
            llmResponse.request,
            llmResponse.response,
            toolResult
        ]
    });
    return secondResponse.text ?? "I was unable to process the information from the tool.";
  }

  return llmResponse.text ?? "I'm sorry, I couldn't generate a response.";
}

ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    return await assistant(input);
  }
);
