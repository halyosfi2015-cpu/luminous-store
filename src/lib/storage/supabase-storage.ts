import { createAdminClient } from "@/src/lib/supabase";

/**
 * Supabase Storage Utilities for Visual Content Studio
 * Handles signed upload URLs, asset management, and bucket operations
 */

export type StorageBucket = "brand-assets" | "generated-assets" | "content-assets";

export interface SignedUploadUrl {
  signedUrl: string;
  token: string;
  path: string;
  expiresAt: number; // unix timestamp
}

export interface StorageAsset {
  id: string;
  bucket: StorageBucket;
  path: string;
  fullPath: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
  publicUrl?: string;
  signedUrl?: string;
}

export interface UploadResult {
  success: boolean;
  asset?: StorageAsset;
  error?: string;
}

export interface ListAssetsOptions {
  bucket: StorageBucket;
  folder?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "size" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export interface ListAssetsResult {
  assets: StorageAsset[];
  total: number;
  hasMore: boolean;
}

// Bucket configuration
export const STORAGE_BUCKETS: Record<StorageBucket, { public: boolean; folders: string[] }> = {
  "brand-assets": {
    public: false,
    folders: ["logos", "fonts", "patterns", "color-swatches", "icons", "backgrounds", "illustrations"],
  },
  "generated-assets": {
    public: false,
    folders: ["generated", "variants", "temp"],
  },
  "content-assets": {
    public: false,
    folders: ["uploads", "reference", "temp"],
  },
};

/**
 * Create a signed upload URL for direct client-to-storage uploads
 * Uses Supabase's createSignedUploadUrl (requires Supabase v2+)
 */
export async function createSignedUploadUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600, // 1 hour default
  options?: { upsert?: boolean; contentType?: string }
): Promise<SignedUploadUrl | { error: string }> {
try {
    const supabase = createAdminClient();
    
    const uploadOptions: { upsert: boolean } = {
      upsert: options?.upsert ?? false,
    };
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, uploadOptions);

    if (error) {
      return { error: error.message };
    }

    // Calculate expiry timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      expiresAt,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error creating signed upload URL" };
  }
}

/**
 * Create signed download URL for private assets
 */
export async function createSignedDownloadUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600,
  options?: { transform?: { width?: number; height?: number; resize?: "cover" | "contain" | "fill" } }
): Promise<{ signedUrl: string; expiresAt: number } | { error: string }> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, options);

    if (error) {
      return { error: error.message };
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    return { signedUrl: data.signedUrl, expiresAt };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error creating signed download URL" };
  }
}

/**
 * Upload file directly from server (for server-side uploads)
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: Buffer | Uint8Array | Blob | File,
  options?: { contentType?: string; upsert?: boolean; cacheControl?: string }
): Promise<UploadResult> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        upsert: options?.upsert ?? false,
        cacheControl: options?.cacheControl ?? "3600",
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const asset = await getAssetInfo(bucket, data.path);
    return { success: true, asset: asset! };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown upload error" };
  }
}

/**
 * Get asset metadata
 */
export async function getAssetInfo(bucket: StorageBucket, path: string): Promise<StorageAsset | null> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split("/").slice(0, -1).join("/"), {
        search: path.split("/").pop(),
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    const file = data[0];
    const fullPath = `${path.split("/").slice(0, -1).join("/")}/${file.name}`.replace(/^\//, "");

    return {
      id: `${bucket}:${fullPath}`,
      bucket,
      path: fullPath,
      fullPath,
      name: file.name,
      size: file.metadata?.size ?? 0,
      mimeType: file.metadata?.mimetype ?? "application/octet-stream",
      width: file.metadata?.width,
      height: file.metadata?.height,
      createdAt: file.created_at ?? "",
      updatedAt: file.updated_at ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * List assets in a bucket/folder
 */
export async function listAssets(options: ListAssetsOptions): Promise<ListAssetsResult> {
  try {
    const supabase = createAdminClient();
    const { bucket, folder = "", limit = 100, offset = 0, sortBy = "updated_at", sortOrder = "desc" } = options;

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: limit + 1,
        offset,
        sortBy: { column: sortBy, order: sortOrder },
      });

    if (error) {
      return { assets: [], total: 0, hasMore: false };
    }

    const assets: StorageAsset[] = (data || []).map((file) => ({
      id: `${bucket}:${folder}/${file.name}`.replace(/^\//, "").replace(/\/$/, ""),
      bucket,
      path: `${folder}/${file.name}`.replace(/^\//, "").replace(/\/$/, ""),
      fullPath: `${folder}/${file.name}`.replace(/^\//, "").replace(/\/$/, ""),
      name: file.name,
      size: file.metadata?.size ?? 0,
      mimeType: file.metadata?.mimetype ?? "application/octet-stream",
      width: file.metadata?.width,
      height: file.metadata?.height,
      createdAt: file.created_at ?? "",
      updatedAt: file.updated_at ?? "",
    }));

    const hasMore = assets.length > limit;
    const resultAssets = hasMore ? assets.slice(0, limit) : assets;

    return {
      assets: resultAssets,
      total: resultAssets.length + offset,
      hasMore,
    };
  } catch {
    return { assets: [], total: 0, hasMore: false };
  }
}

/**
 * Delete an asset
 */
export async function deleteAsset(bucket: StorageBucket, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown delete error" };
  }
}

/**
 * Move/rename an asset
 */
export async function moveAsset(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown move error" };
  }
}

/**
 * Copy an asset
 */
export async function copyAsset(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown copy error" };
  }
}

/**
 * Generate a unique storage path for an asset
 */
export function generateAssetPath(
  bucket: StorageBucket,
  category: string,
  fileName: string,
  userId?: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split(".").pop() || "bin";
  const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
  
  const prefix = bucket === "brand-assets" 
    ? category 
    : bucket === "generated-assets"
      ? `generated/${year}/${month}`
      : `uploads/${userId || "anonymous"}/${year}/${month}/${day}`;
  
  return `${prefix}/${baseName}-${timestamp}-${random}.${ext}`.replace(/\/+/g, "/");
}

/**
 * Validate file type and size
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileUpload(
  file: File | { name: string; size: number; type: string },
  bucket: StorageBucket,
  options?: { maxSizeMB?: number; allowedTypes?: string[] }
): ValidationResult {
  const maxSize = (options?.maxSizeMB ?? 50) * 1024 * 1024;
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${options?.maxSizeMB ?? 50}MB limit` };
  }

  const allowedTypes = options?.allowedTypes ?? getDefaultAllowedTypes(bucket);
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed for ${bucket}` };
  }

  return { valid: true };
}

function getDefaultAllowedTypes(bucket: StorageBucket): string[] {
  switch (bucket) {
    case "brand-assets":
      return [
        "image/svg+xml",
        "image/png",
        "image/webp",
        "image/jpeg",
        "font/woff",
        "font/woff2",
        "application/font-woff",
        "application/font-woff2",
      ];
    case "generated-assets":
      return ["image/png", "image/webp", "image/jpeg", "image/gif"];
    case "content-assets":
      return ["image/png", "image/webp", "image/jpeg", "image/gif", "application/pdf"];
    default:
      return ["image/png", "image/webp", "image/jpeg"];
  }
}

/**
 * Get public URL for public buckets (if applicable)
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Check if bucket exists and create if needed (server-side only)
 */
export async function ensureBucketExists(bucket: StorageBucket): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return { success: false, error: listError.message };
    }

    const exists = buckets?.some((b) => b.name === bucket);
    
    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: STORAGE_BUCKETS[bucket]?.public ?? false,
        allowedMimeTypes: getDefaultAllowedTypes(bucket),
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (createError) {
        return { success: false, error: createError.message };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error ensuring bucket" };
  }
}