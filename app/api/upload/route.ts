import { NextRequest } from 'next/server';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { successResponse, errorResponse, createdResponse } from '@/lib/api-response';

// POST /api/upload  — multipart/form-data: { file, folder? }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'productos';

    if (!file) return errorResponse('No se proporcionó ningún archivo', 400);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) return errorResponse('Tipo no permitido. Use: JPEG, PNG, WebP o GIF', 400);

    if (file.size > 5 * 1024 * 1024) return errorResponse('El archivo excede el máximo de 5MB', 400);

    const bytes = await file.arrayBuffer();
    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;

    const result = await uploadImage(base64, folder);
    return createdResponse({ url: result.url, publicId: result.publicId });
  } catch (error) {
    console.error('Error uploading image:', error);
    return errorResponse(`Error al subir la imagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// DELETE /api/upload?publicId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const publicId = new URL(request.url).searchParams.get('publicId');
    if (!publicId) return errorResponse('publicId es requerido', 400);

    const deleted = await deleteImage(publicId);
    if (!deleted) return errorResponse('No se pudo eliminar la imagen');

    return successResponse({ message: 'Imagen eliminada' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return errorResponse('Error al eliminar la imagen');
  }
}
