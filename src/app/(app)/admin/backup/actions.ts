
"use server";

import { getOrders } from '@/lib/order-service';
import { getUsers } from '@/lib/user-service';
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service';
import { getModels } from '@/lib/service-options-service';
import { getLeads } from '@/lib/lead-service';
import { getEmployees } from '@/lib/employee-service';
import type { User } from '@/types';

// A helper to strip sensitive data before exporting
const stripSensitiveUserData = (users: User[]) => {
  return users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
};

export async function exportOrdersAction() {
  return getOrders();
}

export async function exportUsersAction() {
  const users = await getUsers();
  return stripSensitiveUserData(users);
}

export async function exportProjectsAction() {
  return getProjects();
}

export async function exportStatusesAction() {
  return getStatuses();
}

export async function exportServiceModelsAction() {
  return getModels();
}

export async function exportLeadsAction() {
    return getLeads();
}

export async function exportEmployeesAction() {
    return getEmployees();
}
