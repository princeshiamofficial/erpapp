

import type { Employee, Payslip, SalaryIncrement, LeaveRecord } from '@/types';
import { subYears } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { v4 as uuidv4 } from 'uuid';

const EMPLOYEES_COLLECTION = 'employees';
const SALARY_SHEET_COLLECTION_PREFIX = 'salarySheet-';

const getSalarySheetCollectionName = (month: string) => `${SALARY_SHEET_COLLECTION_PREFIX}${month}`;

const defaultEmployeesData: Array<Omit<Employee, 'id' | 'employeeId' | 'userId'>> = [
  { name: 'John Doe', email: 'john.doe@example.com', mobileNo: '01712345678', dob: subYears(new Date(), 30).toISOString(), designation: 'Software Engineer', joiningDate: subYears(new Date(), 2).toISOString(), status: 'Active', salary: 80000, yearlyLeave: 12, leaveTaken: 0, leaveHistory: [], nationalId: '1234567890123', accountNo: '112233445566' },
  { name: 'Jane Smith', email: 'jane.smith@example.com', mobileNo: '01812345678', dob: subYears(new Date(), 25).toISOString(), designation: 'Project Manager', joiningDate: subYears(new Date(), 1).toISOString(), status: 'Active', salary: 95000, yearlyLeave: 12, leaveTaken: 0, leaveHistory: [], nationalId: '9876543210987', accountNo: '665544332211' },
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
        const newEmployeeData = { 
            ...employeeData, 
            employeeId, 
            nationalId: employeeData.nationalId || `2025${String(Math.floor(1000 + Math.random() * 9000))}`, // Auto-generate if not provided
            salaryHistory: [],
            yearlyLeave: employeeData.yearlyLeave || 12,
            leaveTaken: employeeData.leaveTaken || 0,
            leaveHistory: employeeData.leaveHistory || [],
        };

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

export const updateEmployee = async (employeeId: string, updates: Partial<Omit<Employee, 'id' | 'employeeId'>> & { isReverting?: boolean }, incrementDate?: string): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(EMPLOYEES_COLLECTION);
        const existingEmployee = await getEmployeeById(employeeId);
        if (!existingEmployee) {
            throw new Error("Employee not found for update.");
        }

        const finalUpdates = { ...updates };
        const currentSalary = existingEmployee.salary || 0;
        const newSalary = updates.salary;

        if (newSalary !== undefined && newSalary !== null && newSalary !== currentSalary) {
            const isReverting = finalUpdates.isReverting || false;
            
            if (!isReverting) {
                const newIncrement: SalaryIncrement = {
                    date: incrementDate || new Date().toISOString(),
                    previousSalary: currentSalary,
                    newSalary: newSalary,
                    incrementAmount: newSalary - currentSalary,
                };
                const updatedHistory = [newIncrement, ...(finalUpdates.salaryHistory || existingEmployee.salaryHistory || [])];
                finalUpdates.salaryHistory = updatedHistory;
            }
        }
        
        delete finalUpdates.isReverting;

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

export const getPayslipForMonth = async (month: string): Promise<Payslip[]> => {
    const collectionName = getSalarySheetCollectionName(month);
    try {
        await ensureCollectionExistsV3(collectionName);
        const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999`);
        if (response && Array.isArray(response.documents)) {
            return response.documents.map((doc: { id: string, data: any }) => ({
                id: doc.id,
                ...doc.data
            } as Payslip));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching payslips for ${month} via API v3:`, error);
        return [];
    }
};

// New function to update a payslip record in its own collection
export const updatePayslipInDb = async (payslipId: string, payslipData: Omit<Payslip, 'id' | 'updatedAt' | 'employeeId'>): Promise<boolean> => {
    const month = payslipId.substring(0, 7); // Extract YYYY-MM from payslipId
    const employeeId = payslipId.substring(8); // Extract employeeId from payslipId
    const collectionName = getSalarySheetCollectionName(month);
    try {
        const existingPayslip = await fetchFromApiV3(`collections/${collectionName}/documents/${payslipId}`).catch(() => null);

        const dataToSave = {
            ...(existingPayslip?.data || {}),
            ...payslipData,
            employeeId: employeeId,
            updatedAt: new Date().toISOString(),
        };
        
        const payload = { id: payslipId, data: dataToSave };

        if (existingPayslip) {
             await fetchFromApiV3(`collections/${collectionName}/documents/${payslipId}`, {
                method: 'PUT',
                body: JSON.stringify({ data: dataToSave })
            });
        } else {
             await fetchFromApiV3(`collections/${collectionName}/documents`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        return true;
    } catch (error) {
        console.error(`Error updating payslip ${payslipId} in ${collectionName} via API v3:`, error);
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
        
        const updates = { salaryHistory: newHistory };

        const success = await updateEmployee(employeeId, updates, undefined);
        return success;

    } catch (error) {
        console.error(`Error deleting salary increment for employee ${employeeId}:`, error);
        if (error instanceof Error) throw error;
        return false;
    }
};

export const addLeaveRecord = async (employeeId: string, leaveData: Omit<LeaveRecord, 'id'>, newTotalLeaveTaken?: number): Promise<boolean> => {
    try {
        const employee = await getEmployeeById(employeeId);
        if (!employee) {
            throw new Error("Employee not found.");
        }

        const newLeaveRecord: LeaveRecord = {
            ...leaveData,
            id: uuidv4(),
        };

        const updatedHistory = [...(employee.leaveHistory || []), newLeaveRecord];
        const newLeaveTaken = newTotalLeaveTaken !== undefined ? newTotalLeaveTaken : (employee.leaveTaken || 0) + leaveData.days;

        const updates = {
            leaveHistory: updatedHistory,
            leaveTaken: newLeaveTaken,
        };

        return await updateEmployee(employeeId, updates);
    } catch (error) {
        console.error(`Error adding leave record for employee ${employeeId}:`, error);
        return false;
    }
};

export const deleteLeaveRecord = async (employeeId: string, leaveRecordId: string): Promise<boolean> => {
  try {
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    const leaveHistory = employee.leaveHistory || [];
    const updatedHistory = leaveHistory.filter(record => record.id !== leaveRecordId);

    if (leaveHistory.length === updatedHistory.length) {
      console.warn(`Leave record with ID ${leaveRecordId} not found for employee ${employeeId}. No changes made.`);
      return false; 
    }

    const newLeaveTaken = updatedHistory.reduce((total, record) => total + record.days, 0);

    const updates = {
      leaveHistory: updatedHistory,
      leaveTaken: newLeaveTaken,
    };

    return await updateEmployee(employeeId, updates);
  } catch (error) {
    console.error(`Error deleting leave record ${leaveRecordId} for employee ${employeeId}:`, error);
    return false;
  }
};
