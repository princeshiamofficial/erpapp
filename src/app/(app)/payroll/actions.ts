
"use server";

import { revalidatePath } from "next/cache";
import type { Employee, Payslip, SalaryIncrement, LeaveRecord } from "@/types";
import {
  addEmployee as addEmployeeService,
  updateEmployee as updateEmployeeService,
  deleteEmployee as deleteEmployeeService,
  getEmployeeById,
  deleteSalaryIncrement as deleteSalaryIncrementService,
  addLeaveRecord as addLeaveRecordService, // Import new service
  deleteLeaveRecord as deleteLeaveRecordService,
  getPayslipForMonth,
  updatePayslipInDb,
} from "@/lib/employee-service";

export async function addEmployeeAction(
  employeeData: Omit<Employee, 'id' | 'employeeId'>
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(employeeData.mobileNo)) {
      return { success: false, error: "Invalid mobile number. It must be an 11-digit number starting with 0." };
    }
    const newEmployee = await addEmployeeService(employeeData);
    if (newEmployee) {
      revalidatePath("/(app)/payroll");
      return { success: true, employee: newEmployee };
    }
    return { success: false, error: "Failed to add employee to database." };
  } catch (error) {
    console.error("Error in addEmployeeAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateEmployeeAction(
  employeeId: string,
  updates: Partial<Omit<Employee, 'id' | 'employeeId'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (updates.mobileNo) {
      const phoneRegex = /^0\d{10}$/;
      if (!phoneRegex.test(updates.mobileNo)) {
        return { success: false, error: "Invalid mobile number. It must be an 11-digit number starting with 0." };
      }
    }
    const success = await updateEmployeeService(employeeId, updates);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to update employee in database." };
  } catch (error) {
    console.error("Error in updateEmployeeAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteEmployeeService(employeeId);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to delete employee from database." };
  } catch (error) {
    console.error("Error in deleteEmployeeAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePayslipAction(
  payslipId: string, // e.g., '2024-07'
  payslipData: Omit<Payslip, 'id' | 'updatedAt' | 'employeeId'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updatePayslipInDb(payslipId, payslipData);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to update payslip in database." };
  } catch (error) {
    console.error("Error in updatePayslipAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function getSalarySheetForMonth(month: string): Promise<Payslip[]> {
    try {
        const payslips = await getPayslipForMonth(month);
        return payslips;
    } catch (error) {
        console.error("Error getting salary sheet for month:", error);
        return [];
    }
}


export async function incrementEmployeeSalaryAction(
  employeeId: string,
  incrementAmount: number,
  incrementDate: string
): Promise<{ success: boolean; error?: string }> {
  if (incrementAmount <= 0) {
    return { success: false, error: "Increment amount must be positive." };
  }
  try {
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return { success: false, error: "Employee not found." };
    }
    const currentSalary = employee.salary || 0;
    const newSalary = currentSalary + incrementAmount;

    const success = await updateEmployeeService(employeeId, { salary: newSalary }, incrementDate);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to update employee's salary." };
  } catch (error) {
    console.error("Error in incrementEmployeeSalaryAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

export async function deleteSalaryIncrementAction(
  employeeId: string,
  incrementDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteSalaryIncrementService(employeeId, incrementDate);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to delete salary increment history." };
  } catch (error) {
    console.error("Error in deleteSalaryIncrementAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}


// New action for adding leave
export async function addLeaveRecordAction(
  employeeId: string,
  leaveData: Omit<LeaveRecord, 'id'>,
  newTotalLeaveTaken?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await addLeaveRecordService(employeeId, leaveData, newTotalLeaveTaken);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to record leave in database." };
  } catch (error) {
    console.error("Error in addLeaveRecordAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// New action for deleting a leave record
export async function deleteLeaveRecordAction(employeeId: string, leaveRecordId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteLeaveRecordService(employeeId, leaveRecordId);
    if (success) {
      revalidatePath("/(app)/payroll");
      return { success: true };
    }
    return { success: false, error: "Failed to delete leave record from database." };
  } catch (error) {
    console.error("Error in deleteLeaveRecordAction:", error);
    return { success: false