
'use server';
/**
 * @fileOverview A Genkit tool for searching and retrieving product model information.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getModels } from '@/lib/service-options-service';

export const modelSearchTool = ai.defineTool(
  {
    name: 'modelSearchTool',
    description: 'Search for product models by name to get details like pricing and stock count.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The name of the model to search for.'),
    }),
    outputSchema: z.object({
      models: z.array(z.object({
        name: z.string(),
        buyingPrice: z.number().optional(),
        sellingPrice: z.number().optional(),
        isReadyMade: z.boolean().optional(),
        stockCount: z.number().optional(),
      })),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    try {
      const allModels = await getModels();
      const searchTerm = input.searchTerm.toLowerCase();
      
      const foundModels = allModels.filter(model => 
        model.name.toLowerCase().includes(searchTerm)
      );

      if (foundModels.length === 0) {
        return { models: [], error: `No models found matching "${input.searchTerm}".` };
      }

      const summarizedModels = foundModels.slice(0, 10).map(model => ({
        name: model.name,
        buyingPrice: model.buyingPrice,
        sellingPrice: model.sellingPrice,
        isReadyMade: model.isReadyMade,
        stockCount: model.stockCount,
      }));

      return { models: summarizedModels };

    } catch (error) {
      console.error("Error in modelSearchTool:", error);
      return { models: [], error: "An error occurred while searching for models." };
    }
  }
);
