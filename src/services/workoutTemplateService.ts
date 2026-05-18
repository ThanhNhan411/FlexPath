import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { WorkoutTemplate, TemplateExercise } from '../types';

const COLLECTION_NAME = 'workout_templates';

export async function fetchUserTemplates(): Promise<WorkoutTemplate[]> {
  if (!auth.currentUser) return [];
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkoutTemplate[];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

export async function saveTemplate(template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, id?: string): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  
  const data = {
    ...template,
    userId: auth.currentUser.uid,
    updatedAt: new Date().toISOString()
  };
  
  if (id) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    return id;
  } else {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
