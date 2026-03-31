
'use server';

/**
 * @fileOverview A manual client for OpenRouter with tool support and reasoning preservation.
 */

import { orderSearchTool } from './tools/order-search-tool';
import { salesReportTool } from './tools/sales-report-tool';
import { userSearchTool } from './tools/user-search-tool';
import { attendanceReportTool } from './tools/attendance-report-tool';
import { salarySheetTool } from './tools/salary-sheet-tool';
import { modelSearchTool } from './tools/model-search-tool';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "arcee-ai/trinity-large-preview:free";

export interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  name?: string;
  tool_call_id?: string;
  reasoning_details?: string;
  tool_calls?: any[];
}

/**
 * Maps Genkit tools to OpenAI/OpenRouter compatible tool definitions.
 */
const TOOLS = [
  {
    type: "function",
    function: {
      name: "orderSearchTool",
      description: "Search for orders by ID, company name, or phone number.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: { type: "string", description: "The Order ID, company name, or phone number." }
        },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "salesReportTool",
      description: "Generates a sales and order report for a given date range.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { 
            type: "string", 
            enum: ['today', 'yesterday', 'last7days', 'last30days', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']
          }
        },
        required: ["dateRange"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "userSearchTool",
      description: "Search for users by name, email, or role.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: { type: "string", description: "The name, email, or role." }
        },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "attendanceReportTool",
      description: "Generates an attendance report for all employees over a given date range.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { 
            type: "string", 
            enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']
          }
        },
        required: ["dateRange"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "salarySheetTool",
      description: "Generates a salary sheet for all employees for a given month.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { 
            type: "string", 
            enum: ['today', 'yesterday', 'last7days', 'last30days', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']
          }
        },
        required: ["dateRange"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "modelSearchTool",
      description: "Search for product models by name to get details like pricing and stock count.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: { type: "string", description: "The name of the model." }
        },
        required: ["searchTerm"]
      }
    }
  }
];

/**
 * Executes a tool by name with provided arguments.
 */
async function executeTool(name: string, args: any) {
  switch (name) {
    case 'orderSearchTool': return await orderSearchTool(args);
    case 'salesReportTool': return await salesReportTool(args);
    case 'userSearchTool': return await userSearchTool(args);
    case 'attendanceReportTool': return await attendanceReportTool(args);
    case 'salarySheetTool': return await salarySheetTool(args);
    case 'modelSearchTool': return await modelSearchTool(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

export async function generateOpenRouterResponse(messages: Message[]): Promise<{ content: string; reasoning_details?: string; messages: Message[] }> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing in .env");

  let currentMessages = [...messages];
  let maxRetries = 10; // Tool call limit

  while (maxRetries > 0) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://colorhut.app", // Optional
        "X-Title": "Color Hut ERP", // Optional
      },
      body: JSON.stringify({
        model: MODEL,
        messages: currentMessages,
        tools: TOOLS,
        reasoning: { enabled: true }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenRouter API request failed");
    }

    const { choices } = await response.json();
    const assistantMessage = choices[0].message;

    // Add assistant's response to history
    currentMessages.push(assistantMessage);

    if (assistantMessage.tool_calls) {
      // Process tool calls
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);
        
        currentMessages.push({
          role: 'tool',
          name: toolCall.function.name,
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      maxRetries--;
    } else {
      // Final response obtained
      return {
        content: assistantMessage.content,
        reasoning_details: assistantMessage.reasoning_details,
        messages: currentMessages
      };
    }
  }

  throw new Error("Max tool call retries exceeded");
}
