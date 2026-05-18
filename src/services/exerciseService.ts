import { Exercise } from '../types';

const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const BASE_IMAGE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export async function fetchExercises(): Promise<Exercise[]> {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Normalize data: prepend base URL to relative paths and ensure array fields are arrays
    return data.map((ex: any) => {
      // Standardize ID
      const id = ex.id || (ex.name ? ex.name.toLowerCase().replace(/\s+/g, '-') : Math.random().toString(36).substr(2, 9));
      
      // Standardize images
      const images = Array.isArray(ex.images) 
        ? ex.images.map((img: string) => {
            if (img.startsWith('http')) return img;
            // The yuhonas repo has images structured as "Exercise_Name/0.jpg"
            // We need to ensure we don't double the prefix if it's already there
            return `${BASE_IMAGE_URL}${img}`;
          })
        : [];

      return {
        id: id,
        name: ex.name || 'Unknown Exercise',
        force: ex.force || null,
        level: ex.level || 'beginner',
        mechanic: ex.mechanic || null,
        equipment: ex.equipment || 'No equipment',
        primaryMuscles: Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : (ex.primary_muscles ? (Array.isArray(ex.primary_muscles) ? ex.primary_muscles : [ex.primary_muscles]) : []),
        secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : (ex.secondary_muscles ? (Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [ex.secondary_muscles]) : []),
        instructions: Array.isArray(ex.instructions) 
          ? ex.instructions 
          : (typeof ex.instructions === 'string' ? ex.instructions.split('\n').filter(Boolean) : []),
        category: ex.category || 'strength',
        images: images,
        gifUrl: ex.gifUrl ? (ex.gifUrl.startsWith('http') ? ex.gifUrl : `${BASE_IMAGE_URL}${ex.gifUrl}`) : (images.length > 0 ? images[0] : null)
      };
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}
