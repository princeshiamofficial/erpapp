
import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc as deleteFirestoreDoc,
  query,
  orderBy,
  writeBatch,
  where,
  limit,
} from 'firebase/firestore';
import type { Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, subYears } from 'date-fns';

const EMPLOYEES_COLLECTION = 'employees';

const defaultEmployeesData: Array<Omit<Employee, 'id' | 'employeeId'>> = [
  { name: 'John Doe', email: 'john.doe@example.com', mobileNo: '01712345678', dob: subYears(new Date(), 30).toISOString(), designation: 'Software Engineer', joiningDate: subYears(new Date(), 2).toISOString(), status: 'Active', salary: 80000 },
  { name: 'Jane Smith', email: 'jane.smith@example.com', mobileNo: '01812345678', dob: subYears(new Date(), 25).toISOString(), designation: 'Project Manager', joiningDate: subYears(new Date(), 1).toISOString(), status: 'Active', salary: 95000 },
];

export const seedDefaultEmployees = async (): Promise<Employee[]> => {
  const employeesRef = collection(db, EMPLOYEES_COLLECTION);
  const batch = writeBatch(db);
  const createdEmployees: Employee[] = [];
  let counter = 1;
  defaultEmployeesData.forEach(empData => {
    const id = uuidv4();
    const employeeId = `EMP-${String(counter++).padStart(3, '0')}`;
    const newEmployee: Employee = {
      ...empData,
      id,
      employeeId
    };
    const docRef = doc(employeesRef, id);
    batch.set(docRef, newEmployee);
    createdEmployees.push(newEmployee);
  });
  try {
    await batch.commit();
    return createdEmployees;
  } catch (error) {
    console.error("Error seeding default employees:", error);
    return [];
  }
};


export const getEmployees = async (): Promise<Employee[]> => {
  const employeesCol = collection(db, EMPLOYEES_COLLECTION);
  const q = query(employeesCol, orderBy("employeeId", "asc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return await seedDefaultEmployees();
    }
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Employee));
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'employeeId'>): Promise<Employee | null> => {
    const employeesCol = collection(db, EMPLOYEES_COLLECTION);
    try {
        const q = query(employeesCol, orderBy('employeeId', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let newIdNumber = 1;
        if (!querySnapshot.empty) {
            const lastEmployeeId = querySnapshot.docs[0].data().employeeId;
            const lastNumber = parseInt(lastEmployeeId.split('-')[1], 10);
            if (!isNaN(lastNumber)) {
                newIdNumber = lastNumber + 1;
            }
        }
        const employeeId = `EMP-${String(newIdNumber).padStart(3, '0')}`;
        const newDocId = uuidv4();

        const newEmployee: Employee = {
            ...employeeData,
            id: newDocId,
            employeeId,
        };

        const employeeDocRef = doc(db, EMPLOYEES_COLLECTION, newDocId);
        await setDoc(employeeDocRef, newEmployee);
        return newEmployee;
    } catch (error) {
        console.error("Error adding employee:", error);
        return null;
    }
};

export const updateEmployee = async (employeeId: string, updates: Partial<Omit<Employee, 'id' | 'employeeId'>>): Promise<boolean> => {
    try {
        const employeeDocRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
        await updateDoc(employeeDocRef, updates);
        return true;
    } catch (error) {
        console.error(`Error updating employee ${employeeId}:`, error);
        return false;
    }
};

export const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
        const employeeDocRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
        await deleteFirestoreDoc(employeeDocRef);
        return true;
    } catch (error) {
        console.error(`Error deleting employee ${employeeId}:`, error);
        return false;
    }
};
