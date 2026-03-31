
'use server';
/**
 * @fileOverview The main AI assistant flow for the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { orderSearchTool } from '@/ai/tools/order-search-tool';
import { salesReportTool } from '@/ai/tools/sales-report-tool';
import { userSearchTool } from '@/ai/tools/user-search-tool';
import { attendanceReportTool } from '@/ai/tools/attendance-report-tool';
import { salarySheetTool } from '@/ai/tools/salary-sheet-tool';
import { modelSearchTool } from '@/ai/tools/model-search-tool';

import { generateOpenRouterResponse, Message } from '@/ai/openrouter-client';

export type AssistantInput = z.infer<typeof AssistantInputSchema>;
const AssistantInputSchema = z.object({
  query: z.string().describe("The user's query for the assistant."),
  history: z.array(z.any()).optional().describe("Previous conversation history."),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
const AssistantOutputSchema = z.object({
  content: z.string().describe("The assistant's response content."),
  reasoning_details: z.string().optional().describe("The assistant's reasoning process."),
  history: z.array(z.any()).describe("Updated conversation history including tool calls."),
});


/**
 * The main assistant flow that responds to user queries using OpenRouter.
 * @param {AssistantInput} input The user's query.
 * @returns {Promise<AssistantOutput>} The assistant's response.
 */
export async function assistant(input: AssistantInput): Promise<AssistantOutput> {
  const systemPrompt = `You are a helpful AI assistant for an application called Color Hut.
      You have access to several tools to get information about orders, sales reports, attendance, users, and product models.
      - If the user asks about a specific order, use the orderSearchTool.
      - If the user asks for sales data, order counts, or revenue over a period of time (e.g., "today's sales", "last week's orders", "this year's revenue"), use the salesReportTool.
      - If the user asks for an attendance report for a specific period (e.g., "today's attendance", "last month", "last 90 days"), use the attendanceReportTool.
      - If the user asks for a salary sheet for a specific month (e.g., "this month's salary sheet", "last month's salary sheet"), use the salarySheetTool.
      - If the user asks for information about a user, use the userSearchTool.
      - If the user asks for information about a product model, such as price or stock, use the modelSearchTool.
      - You can also perform simple calculations and answer general knowledge questions.

      When presenting details, format it nicely using Markdown. Be concise and helpful.
      Summarize the key details. If multiple items are found, list them briefly.
      If no information is found, inform the user.
      Do not make up information. If a tool does not provide an answer, say you cannot find the information.

      Language & Tone:
      - Reply in the same language as the user (supports English, Bengali, and especially Banglish).
      - Be extremely fast and concise. Avoid unnecessary preamble. 
      - If the user uses Banglish (Bengali in Roman script), reply in Banglish to maintain the conversational flow.
      - Focus on speed and direct answers.`;

  const initialMessages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...(input.history || []) as Message[],
    { role: 'user', content: input.query }
  ];

  try {
    const result = await generateOpenRouterResponse(initialMessages);
    return {
        content: result.content,
        reasoning_details: result.reasoning_details,
        history: result.messages
    };
  } catch (error: any) {
    console.error("OpenRouter flow error:", error);
    return {
        content: `I'm sorry, I encountered an error: ${error.message || 'Unknown error.'}`,
        history: [...initialMessages, { role: 'assistant', content: `Error occurred: ${error.message}` }]
    };
  }
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
