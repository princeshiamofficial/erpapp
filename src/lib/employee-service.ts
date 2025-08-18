
import { fetchFromApi, ensureCollectionExists } from './api-helper';
import type { Employee } from '@/types';
import { subYears } from 'date-fns';

const EMPLOYEES_COLLECTION = 'employees';

const defaultEmployeesData: Array<Omit<Employee, 'id' | 'employeeId'>> = [
  { name: 'John Doe', email: 'john.doe@example.com', mobileNo: '01712345678', dob: subYears(new Date(), 30).toISOString(), designation: 'Software Engineer', joiningDate: subYears(new Date(), 2).toISOString(), status: 'Active', salary: 80000 },
  { name: 'Jane Smith', email: 'jane.smith@example.com', mobileNo: '01812345678', dob: subYears(new Date(), 25).toISOString(), designation: 'Project Manager', joiningDate: subYears(new Date(), 1).toISOString(), status: 'Active', salary: 95000 },
];

export const seedDefaultEmployees = async (): Promise<Employee[]> => {
  const createdEmployees: Employee[] = [];
  let counter = 1;

  for (const empData of defaultEmployeesData) {
    const employeeId = `EMP-${String(counter++).padStart(3, '0')}`;
    const newEmployeeData = {
      ...empData,
      employeeId
    };
    try {
      const newEmployee = await addEmployee(newEmployeeData);
      if (newEmployee) {
        createdEmployees.push(newEmployee);
      }
    } catch (error) {
      console.error(`Error seeding employee ${empData.name}:`, error);
    }
  }

  return createdEmployees;
};

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    await ensureCollectionExists(EMPLOYEES_COLLECTION);
    const response = await fetchFromApi(`collections/${EMPLOYEES_COLLECTION}/documents?limit=500&orderBy=employeeId&direction=asc`);
    if (response && Array.isArray(response.documents)) {
        if (response.documents.length === 0) {
            // Seeding logic can be complex with API, might be better to handle on server or one-time script
            // For now, we return empty if nothing is there.
            // return await seedDefaultEmployees();
            return [];
        }
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Employee));
    }
    return [];
  } catch (error) {
    console.error("Error fetching employees via API:", error);
    return [];
  }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'employeeId'>): Promise<Employee | null> => {
    try {
        await ensureCollectionExists(EMPLOYEES_COLLECTION);

        const allEmployees = await getEmployees();
        let newIdNumber = 1;
        if (allEmployees.length > 0) {
            const lastEmployeeId = allEmployees.sort((a,b) => {
                const numA = parseInt(a.employeeId.split('-')[1] || '0');
                const numB = parseInt(b.employeeId.split('-')[1] || '0');
                return numB - numA;
            })[0].employeeId;
            const lastNumber = parseInt(lastEmployeeId.split('-')[1], 10);
            if (!isNaN(lastNumber)) {
                newIdNumber = lastNumber + 1;
            }
        }
        
        const employeeId = `EMP-${String(newIdNumber).padStart(3, '0')}`;
        const newEmployeeData = { ...employeeData, employeeId };

        const newDoc = await fetchFromApi(`collections/${EMPLOYEES_COLLECTION}/documents`, {
            method: 'POST',
            body: JSON.stringify({ data: newEmployeeData }),
        });

        // The API should return the full document with its new ID.
        return {
            id: newDoc.id,
            ...newDoc.data
        } as Employee;
    } catch (error) {
        console.error("Error adding employee via API:", error);
        return null;
    }
};

export const updateEmployee = async (employeeId: string, updates: Partial<Omit<Employee, 'id' | 'employeeId'>>): Promise<boolean> => {
    try {
        await ensureCollectionExists(EMPLOYEES_COLLECTION);
        const existingEmployee = await fetchFromApi(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`);
        const finalData = { ...existingEmployee.data, ...updates };

        await fetchFromApi(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating employee ${employeeId} via API:`, error);
        return false;
    }
};

export const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
        await ensureCollectionExists(EMPLOYEES_COLLECTION);
        await fetchFromApi(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting employee ${employeeId} via API:`, error);
        return false;
    }
};
