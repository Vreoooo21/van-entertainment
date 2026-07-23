import { supabase } from "./supabase.js";

export const STORAGE_BUCKET = "artist-images";

export function validateImage(file) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maximumSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Gunakan gambar JPG, PNG, atau WebP.");
    }

    if (file.size > maximumSize) {
        throw new Error("Ukuran gambar maksimal 5 MB.");
    }
}

export async function uploadImage(file, folder) {
    validateImage(file);

    const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, "-");

    const uniqueName = `${crypto.randomUUID()}-${safeName}`;
    const path = `${folder}/${uniqueName}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

    return {
        path,
        publicUrl: data.publicUrl
    };
}

export async function removeImages(paths = []) {
    const cleanPaths = [...new Set(paths.filter(Boolean))];
    if (cleanPaths.length === 0) return;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(cleanPaths);

    if (error) {
        console.warn("Failed to remove old images:", error.message);
    }
}
