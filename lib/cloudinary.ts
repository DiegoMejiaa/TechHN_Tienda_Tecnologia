import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(base64: string, folder = 'productos') {
  const result = await cloudinary.uploader.upload(base64, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string): Promise<boolean> {
  const result = await cloudinary.uploader.destroy(publicId);
  return result.result === 'ok';
}

export default cloudinary;
