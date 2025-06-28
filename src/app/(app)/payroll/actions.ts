
"use server";

import { revalidatePath } from "next/cache";
import type { Employee } from "@/types";
import {
  addEmployee as addEmployeeService,
  updateEmployee as updateEmployeeService,
  deleteEmployee as deleteEmployeeService,
} from "@/lib/employee-service";

export async function addEmployeeAction(
  employeeData: Omit<Employee, 'id' | 'employeeId'>
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
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
