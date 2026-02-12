
import { fetchFromApiV3 } from './src/lib/api-helper2';

async function inspectEmployees() {
    try {
        console.log("Inspecting 'employees'...");
        const employees = await fetchFromApiV3('/collections/employees/documents?limit=1');
        if (employees.documents && employees.documents.length) {
            console.log(JSON.stringify(employees.documents[0].data, null, 2));
        } else {
            console.log("No employees found.");
        }
    } catch (e) {
        console.error(e);
    }
}

inspectEmployees();
