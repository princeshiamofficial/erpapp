
'use server';
/**
 * @fileOverview The main AI assistant flow for the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { orderSearchTool } from '@/ai/tools/order-search-tool';

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
      If the user asks about an order, use the orderSearchTool to find information.
      When presenting order details, format it nicely. Be concise and helpful.
      Summarize the key details of an order if found. If multiple orders are found, list them briefly.
      If no orders are found, inform the user.
      Do not make up information. If the tool does not provide an answer, say you cannot find the information.`;
      
  const llmResponse = await ai.generate({
    prompt: `${systemPrompt}\n\nUser query: ${input.query}`,
    model: 'gemini-1.5-flash',
    tools: [orderSearchTool],
  });

  const toolResponse = llmResponse.toolRequest();
  if (toolResponse) {
    const toolResult = await toolResponse.run();
    const secondResponse = await ai.generate({
        prompt: input.query,
        tools: [orderSearchTool],
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
