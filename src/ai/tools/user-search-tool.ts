
'use server';
/**
 * @fileOverview A Genkit tool for searching and retrieving user information.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getUsers } from '@/lib/user-service';

export const userSearchTool = ai.defineTool(
  {
    name: 'userSearchTool',
    description: 'Search for users by name, email, or role.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The name, email, or role to search for.'),
    }),
    outputSchema: z.object({
      users: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        phone: z.string().optional().nullable(),
        companyName: z.string().optional().nullable(),
      })),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    try {
      const allUsers = await getUsers();
      const searchTerm = input.searchTerm.toLowerCase();
      
      const foundUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().replace(/_/g, ' ').includes(searchTerm)
      );

      if (foundUsers.length === 0) {
        return { users: [], error: `No users found matching "${input.searchTerm}".` };
      }

      const summarizedUsers = foundUsers.slice(0, 5).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyName: user.companyName,
      }));

      return { users: summarizedUsers };

    } catch (error) {
      console.error("Error in userSearchTool:", error);
      return { users: [], error: "An error occurred while searching for users." };
    }
  }
);
