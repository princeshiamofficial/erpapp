

import type { Employee, Payslip, SalaryIncrement } from '@/types';
import { subYears } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const EMPLOYEES_COLLECTION = 'employees';

const defaultEmployeesData: Array<Omit<Employee, 'id' | 'employeeId' | 'userId'>> = [
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
      employeeId,
      userId: null,
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
    await ensureCollectionExistsV3(EMPLOYEES_COLLECTION);
    const response = await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents?limit=9999&orderBy=employeeId&direction=asc`);
    if (response && Array.isArray(response.documents)) {
        if (response.documents.length === 0) {
            return [];
        }
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Employee));
    }
    return [];
  } catch (error) {
    console.error("Error fetching employees via API v3:", error);
    return [];
  }
};

export const getEmployeeById = async (employeeId: string): Promise<Employee | null> => {
    if (!employeeId) return null;
    try {
        const response = await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`);
        if (response && response.data) {
            return { id: response.id, ...response.data } as Employee;
        }
        return null;
    } catch (error) {
        // If a document is not found, the API throws an error. We should handle this gracefully.
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
          return null;
        }
        console.error(`Error fetching employee by ID ${employeeId} via API v3:`, error);
        return null;
    }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'employeeId'>): Promise<Employee | null> => {
    try {
        await ensureCollectionExistsV3(EMPLOYEES_COLLECTION);

        const allEmployees = await getEmployees();
        let maxIdNumber = 0;
        allEmployees.forEach(emp => {
            if (emp.employeeId && emp.employeeId.startsWith('EMP-')) {
                const numPart = parseInt(emp.employeeId.split('-')[1], 10);
                if (!isNaN(numPart) && numPart > maxIdNumber) {
                    maxIdNumber = numPart;
                }
            }
        });
        
        const newIdNumber = maxIdNumber + 1;
        const employeeId = `EMP-${String(newIdNumber).padStart(3, '0')}`;
        const newEmployeeData = { ...employeeData, employeeId, payslips: {}, salaryHistory: [] };

        const newDoc = await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents`, {
            method: 'POST',
            body: JSON.stringify({ data: newEmployeeData }),
        });

        // The API should return the full document with its new ID.
        return {
            id: newDoc.id,
            ...newDoc.data
        } as Employee;
    } catch (error) {
        console.error("Error adding employee via API v3:", error);
        return null;
    }
};

export const updateEmployee = async (employeeId: string, updates: Partial<Omit<Employee, 'id' | 'employeeId'>>): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(EMPLOYEES_COLLECTION);
        const existingEmployee = await getEmployeeById(employeeId);
        if (!existingEmployee) {
            throw new Error("Employee not found for update.");
        }

        const finalUpdates = { ...updates };
        const currentSalary = existingEmployee.salary || 0;
        const newSalary = updates.salary;

        // Check if salary is being updated and it's a genuine increment, not a revert.
        if (newSalary !== undefined && newSalary !== null && newSalary !== currentSalary) {
            const isReverting = updates.isReverting || false;
            
            if (!isReverting) {
                const newIncrement: SalaryIncrement = {
                    date: new Date().toISOString(),
                    previousSalary: currentSalary,
                    newSalary: newSalary,
                    incrementAmount: newSalary - currentSalary,
                };
                // Prepend to the existing history array from the updates if it exists, otherwise from the original employee object.
                const updatedHistory = [newIncrement, ...(finalUpdates.salaryHistory || existingEmployee.salaryHistory || [])];
                finalUpdates.salaryHistory = updatedHistory;
            }
        }
        
        delete (finalUpdates as any).isReverting; // Clean up the flag

        const finalData = { ...existingEmployee, ...finalUpdates };
        delete (finalData as any).id;


        await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating employee ${employeeId} via API v3:`, error);
        return false;
    }
};

export const updateModelStock = async (modelId: string, quantityChange: number): Promise<boolean> => {
    try {
        const doc = await fetchFromApiV3(`collections/serviceModels/documents/${modelId}`);
        if (!doc || !doc.data) {
            throw new Error("Model not found for stock update.");
        }
        const currentStock = doc.data.stockCount || 0;
        const newStock = currentStock + quantityChange;
        
        const finalData = { ...doc.data, stockCount: newStock };
        
        await fetchFromApiV3(`collections/serviceModels/documents/${modelId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating stock for model ${modelId} via API v3:`, error);
        return false;
    }
};

export const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(EMPLOYEES_COLLECTION);
        await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting employee ${employeeId} via API v3:`, error);
        return false;
    }
};

// New function to update a payslip record within an employee's document
export const updatePayslip = async (employeeId: string, payslipId: string, payslipData: Omit<Payslip, 'id' | 'updatedAt'>): Promise<boolean> => {
  try {
    const existingEmployee = await getEmployeeById(employeeId);
    if (!existingEmployee) {
        throw new Error("Employee not found");
    }

    const updatedPayslip: Payslip = {
      ...payslipData,
      id: payslipId,
      updatedAt: new Date().toISOString(),
    };

    const updatedPayslips = {
      ...(existingEmployee.payslips || {}),
      [payslipId]: updatedPayslip,
    };
    
    const finalData = { ...existingEmployee, payslips: updatedPayslips };
    delete (finalData as any).id;

    await fetchFromApiV3(`collections/${EMPLOYEES_COLLECTION}/documents/${employeeId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating payslip for employee ${employeeId} via API v3:`, error);
    return false;
  }
};

export const deleteSalaryIncrement = async (employeeId: string, incrementDate: string): Promise<boolean> => {
    try {
        const employee = await getEmployeeById(employeeId);
        if (!employee || !employee.salaryHistory) {
            throw new Error("Employee or salary history not found.");
        }

        const newHistory = employee.salaryHistory.filter(h => h.date !== incrementDate);

        // Only update the salary history, not the current salary.
        const updates = {
            salaryHistory: newHistory,
        };

        const success = await updateEmployee(employeeId, updates);
        return success;

    } catch (error) {
        console.error(`Error deleting salary increment for employee ${employeeId}:`, error);
        if (error instanceof Error) throw error;
        return false;
    }
};
