import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const quality = parseInt(formData.get('quality') as string) || 80;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Files not found' },
        { status: 400 }
      );
    }

    // Check file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: `Unsupported file formats: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, JPG and PNG are supported` },
        { status: 400 }
      );
    }

    // Process all files
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
          
          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const fileName = `${originalName}.webp`;
          
          return {
            originalName: file.name,
            fileName,
            originalSize: file.size,
            convertedSize: webpBuffer.length,
            compressionRatio: ((file.size - webpBuffer.length) / file.size) * 100,
            webpBuffer: webpBuffer.toString('base64')
          };
        } catch (error) {
          return {
            originalName: file.name,
            error: error instanceof Error ? error.message : 'Conversion error'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
      totalFiles: files.length,
      successfulConversions: results.filter(r => !r.error).length,
      failedConversions: results.filter(r => r.error).length
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: `Error converting images: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
