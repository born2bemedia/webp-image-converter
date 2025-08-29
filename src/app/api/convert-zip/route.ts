import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import JSZip from 'jszip';

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

    // Create ZIP archive
    const zip = new JSZip();

    // Process all files
    const conversionPromises = files.map(async (file) => {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
        
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const fileName = `${originalName}.webp`;
        
        // Add file to ZIP
        zip.file(fileName, webpBuffer);
        
        return {
          originalName: file.name,
          fileName,
          originalSize: file.size,
          convertedSize: webpBuffer.length,
          success: true
        };
      } catch (error) {
        return {
          originalName: file.name,
          error: error instanceof Error ? error.message : 'Conversion error',
          success: false
        };
      }
    });

    const results = await Promise.all(conversionPromises);
    const successfulConversions = results.filter(r => r.success);
    const failedConversions = results.filter(r => !r.success);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Create ZIP filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFileName = `webp-conversion-${timestamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });

  } catch (error) {
    console.error('Error creating ZIP:', error);
    return NextResponse.json(
      { error: `Error creating ZIP archive: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
