import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  UploadResult 
} from 'firebase/storage';
import { storage } from './config';

// Upload file to Firebase Storage
export const uploadFile = async (
  file: File, 
  path: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot: UploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (
  files: File[], 
  basePath: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
  try {
    const uploadPromises = files.map((file, index) => {
      const filePath = `${basePath}/${Date.now()}_${index}_${file.name}`;
      return uploadFile(file, filePath);
    });

    const results = await Promise.all(uploadPromises);
    const urls = results
      .filter(result => result.success && result.url)
      .map(result => result.url!);

    return { success: true, urls };
  } catch (error: any) {
    console.error('Multiple upload error:', error);
    return { success: false, error: error.message };
  }
};

// Delete file from Firebase Storage
export const deleteFile = async (
  filePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
};

// Get file URL
export const getFileURL = async (
  filePath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const storageRef = ref(storage, filePath);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error: any) {
    console.error('Get URL error:', error);
    return { success: false, error: error.message };
  }
};