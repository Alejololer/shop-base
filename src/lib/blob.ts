import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'node:fs/promises';

/** Upload an image and return its public URL. Skips empty file inputs. */
export async function uploadImage(file: File | undefined | null, folder: string): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (import.meta.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(name, file, { access: 'public' });
    return url;
  }
  // ponytail: local fallback so the admin works without a Blob store in dev. Files land in public/uploads.
  await mkdir(`public/uploads/${folder}`, { recursive: true });
  await writeFile(`public/uploads/${name}`, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export const uploadImages = async (files: File[] | undefined, folder: string) =>
  (await Promise.all((files ?? []).map((f) => uploadImage(f, folder)))).filter((u): u is string => !!u);
