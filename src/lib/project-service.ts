
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import type { Project, ProjectStatusType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, addMonths } from 'date-fns';

const PROJECTS_COLLECTION = 'projects';

const defaultProjectsData: Array<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> = [
  { projectIdDisplay: 'PJ-001', name: 'Alpha Initiative', status: 'CR Clearance', endDate: formatISO(addMonths(new Date(), 2)), assigneeName: 'Austin Azaria', assigneeInitials: 'AU', categoryTag: 'Corporate Client' },
  { projectIdDisplay: 'PJ-002', name: 'Beta Development', status: 'CR Cancel', endDate: formatISO(addMonths(new Date(), 3)), assigneeName: 'Clerk Kent', assigneeInitials: 'CK', categoryTag: 'Walk-In Customer' },
  { projectIdDisplay: 'PJ-003', name: 'Gamma Graphics', status: 'On Design', endDate: formatISO(addMonths(new Date(), 1)), assigneeName: 'Diana Prince', assigneeInitials: 'DP', categoryTag: 'Internal Project' },
  { projectIdDisplay: 'PJ-004', name: 'Delta Distribution', status: 'Logistics', endDate: formatISO(addMonths(new Date(), 5)), assigneeName: 'Barry Allen', assigneeInitials: 'BA', categoryTag: 'Partner Integration' },
  { projectIdDisplay: 'PJ-005', name: 'Epsilon Exploration', status: 'Courier', endDate: formatISO(addMonths(new Date(), 4)), assigneeName: 'Hal Jordan', assigneeInitials: 'HJ', categoryTag: 'R&D' },
  { projectIdDisplay: 'PJ-006', name: 'Zeta Zero-Day', status: 'On Hold', endDate: formatISO(addMonths(new Date(), 6)), assigneeName: 'Arthur Curry', assigneeInitials: 'AC', categoryTag: 'Security Audit' },
];

export const seedDefaultProjects = async (): Promise<Project[]> => {
  const projectsRef = collection(db, PROJECTS_COLLECTION);
  const batch = writeBatch(db);
  const createdProjects: Project[] = [];
  const now = formatISO(new Date());

  defaultProjectsData.forEach(projectData => {
    const id = uuidv4();
    const newProject: Project = {
      id,
      ...projectData,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(projectsRef, id);
    batch.set(docRef, newProject);
    createdProjects.push(newProject);
  });

  try {
    await batch.commit();
    console.log('Default projects seeded in Firestore.');
    return createdProjects;
  } catch (error) {
    console.error("Error seeding default projects:", error);
    return [];
  }
};

export const getProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, PROJECTS_COLLECTION);
  const q = query(projectsCol, orderBy("createdAt", "desc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No projects found in Firestore, seeding defaults.");
      return await seedDefaultProjects();
    }
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Project));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
};

export const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> => {
  try {
    const id = uuidv4();
    const now = formatISO(new Date());
    const newProject: Project = {
      id,
      ...projectData,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, PROJECTS_COLLECTION, id), newProject);
    return newProject;
  } catch (error) {
    console.error("Error adding project:", error);
    return null;
  }
};

export const updateProjectStatus = async (projectId: string, newStatus: ProjectStatusType): Promise<boolean> => {
  try {
    const projectDoc = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectDoc, { 
      status: newStatus,
      updatedAt: formatISO(new Date()),
    });
    return true;
  } catch (error) {
    console.error("Error updating project status:", error);
    return false;
  }
};
