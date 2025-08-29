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
        { error: 'Файли не знайдені' },
        { status: 400 }
      );
    }

    // Перевіряємо типи файлів
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: `Непідтримувані формати файлів: ${invalidFiles.map(f => f.name).join(', ')}. Підтримуються тільки JPEG, JPG та PNG` },
        { status: 400 }
      );
    }

    // Створюємо ZIP архів
    const zip = new JSZip();

    // Обробляємо всі файли
    const conversionPromises = files.map(async (file) => {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
        
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const fileName = `${originalName}.webp`;
        
        // Додаємо файл до ZIP
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
          error: error instanceof Error ? error.message : 'Помилка конвертації',
          success: false
        };
      }
    });

    const results = await Promise.all(conversionPromises);
    const successfulConversions = results.filter(r => r.success);
    const failedConversions = results.filter(r => !r.success);

    // Генеруємо ZIP файл
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Створюємо ім'я ZIP файлу
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFileName = `webp-conversion-${timestamp}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });

  } catch (error) {
    console.error('Помилка створення ZIP:', error);
    return NextResponse.json(
      { error: `Помилка при створенні ZIP архіву: ${error instanceof Error ? error.message : 'Невідома помилка'}` },
      { status: 500 }
    );
  }
}
