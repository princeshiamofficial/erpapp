// NOTE: This is a new helper file for the v3 API. It is not yet used by the application.
// To use this, you would import functions from this file instead of 'api-helper.ts'.

const API_V3_URL = process.env.API_V3_URL;

export async function fetchFromApiV3(endpoint: string, options: RequestInit = {}) {
    if (!API_V3_URL) {
        throw new Error("API v3 URL is not configured in environment variables (API_V3_URL).");
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(`${API_V3_URL}/${endpoint}`, { ...options, headers });

    if (!response.ok) {
        const errorText = await response.text();
        let errorData = { message: `API v3 request failed with status ${response.status}. Response: ${errorText}` };
        try {
            const parsedJson = JSON.parse(errorText);
            errorData.message = parsedJson.message || errorData.message;
        } catch (e) {
            // Not a JSON response, the raw text is the best we have.
        }
        console.error("API v3 Error Response:", errorData.message);
        throw new Error(errorData.message);
    }
    
    // Handle cases where the response might be empty (e.g., DELETE requests)
    const responseText = await response.text();
    if (!responseText) {
        return { success: true };
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("API v3 Error: Response is not valid JSON.", responseText);
        throw new Error("API v3 returned an unexpected response format.");
    }
}

/**
 * Ensures a collection exists in the v3 API. If not, it creates it.
 * @param collectionName The name of the collection to ensure exists.
 */
export const ensureCollectionExistsV3 = async (collectionName: string) => {
    try {
        await fetchFromApiV3(`collections/${collectionName}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            console.log(`V3 Collection '${collectionName}' not found. Attempting to create it...`);
            try {
                await fetchFromApiV3('collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: collectionName }),
                });
                console.log(`V3 Collection '${collectionName}' created successfully.`);
            } catch (creationError) {
                console.error(`Failed to create v3 collection '${collectionName}':`, creationError);
                throw new Error(`Could not create required v3 collection '${collectionName}'.`);
            }
        } else {
            // Re-throw other errors (e.g., network issues)
            throw error;
        }
    }
};
