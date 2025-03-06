import { supabase } from './supabase';

/**
 * Ensures the specified storage bucket exists, creating it if needed
 * @param bucketName Name of the bucket to check/create
 * @returns Object indicating success and any error
 */
export async function ensureBucketExists(bucketName: string) {
  try {
    console.log(`Checking if bucket '${bucketName}' exists...`);
    
    // First check if the bucket already exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    console.log(`Bucket '${bucketName}' exists:`, bucketExists);
    
    if (bucketExists) {
      return { success: true };
    }
    
    // Bucket doesn't exist, try to create it
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
    });
    
    if (error) {
      console.error(`Error creating bucket '${bucketName}':`, error);
      return { success: false, error };
    }
    
    console.log(`Bucket '${bucketName}' created successfully:`, data);
    
    // Set public bucket policy
    try {
      // Try to set access policy
      await supabase.storage.from(bucketName).setAccessPolicy({
        access: 'public',
        path: '*',
        expression: 'true'
      });
      console.log(`Public access policy set for bucket '${bucketName}'`);
    } catch (policyError) {
      console.error(`Error setting access policy for '${bucketName}':`, policyError);
      // We'll continue even if this fails
    }
    
    return { success: true };
    
  } catch (err) {
    console.error(`Unexpected error ensuring bucket '${bucketName}' exists:`, err);
    return { success: false, error: err };
  }
}
