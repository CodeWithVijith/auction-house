import { repository } from '../persistence/repository';
export async function uploadImage(file: File) {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 1024 * 1024
  )
    throw Error('Choose a PNG, JPEG or WebP image up to 1 MB.');
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw Error('This image could not be decoded. Choose a valid image.');
  }
  if (!image.width || !image.height) {
    image.close();
    throw Error('Image is empty.');
  }
  image.close();
  return repository.saveAsset(file);
}
