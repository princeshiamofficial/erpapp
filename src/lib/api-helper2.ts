
const API_URL = "https://colorhutbd.xyz/firestore/api/index.php";
const API_KEY = "44dc62ef42385a594d319d2c4261914655453b46640d23d9f13ac9a21f7357de";

export async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error("API URL or API Key is not configured.");
    }

    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        ...options.headers,
    };

    const response = await fetch(`${API_URL}/${endpoint}`, { ...options, headers });

    if (!response.ok) {
        const errorText = await response.text();
        let errorData = { message: `API request failed with status ${response.status}. Response: ${errorText}` };
        try {
            const parsedJson = JSON.parse(errorText);
            errorData.message = parsedJson.message || errorData.message;
        } catch (e) {
            // Not a JSON response, the raw text is the best we have.
        }
        console.error("API Error Response:", errorData.message);
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
        console.error("API Error: Response is not valid JSON.", responseText);
        throw new Error("API returned an unexpected response format.");
    }
}

export const ensureCollectionExists = async (collectionName: string) => {
    try {
        await fetchFromApi(`collections/${collectionName}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            console.log(`Collection '${collectionName}' not found. Attempting to create it...`);
            try {
                await fetchFromApi('collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: collectionName }),
                });
                console.log(`Collection '${collectionName}' created successfully.`);
            } catch (creationError) {
                console.error(`Failed to create collection '${collectionName}':`, creationError);
                throw new Error(`Could not create required collection '${collectionName}'.`);
            }
        } else {
            throw error;
        }
    }
};
