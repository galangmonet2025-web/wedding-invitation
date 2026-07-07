/**
 * Shared client-side image helpers for the upload pipeline.
 *
 * Why this exists: iPhones (and some Android cameras) shoot HEIC/HEIF by
 * default. Most Android browsers can't decode HEIC, so any step that draws the
 * image to a <canvas> or <img> (compression, cropping) fails on those devices —
 * the classic "upload works on my phone, fails on the customer's phone".
 */

/** Detect HEIC/HEIF by MIME OR extension (mobile pickers often report empty/odd MIME). */
export const isHeic = (file: File): boolean => {
    const type = (file.type || '').toLowerCase();
    if (type.includes('heic') || type.includes('heif')) return true;
    return /\.(heic|heif)$/i.test(file.name || '');
};

/**
 * Convert a HEIC/HEIF file to a JPEG File. The (heavy) heic2any decoder is
 * lazy-imported only when a HEIC file is actually encountered, so it never
 * bloats the main bundle for the common JPEG/PNG case.
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const newName = (file.name || 'photo').replace(/\.(heic|heif)$/i, '') + '.jpg';
    return new File([blob as BlobPart], newName, { type: 'image/jpeg' });
};

/** If the file is HEIC, return a JPEG copy; otherwise return it unchanged. */
export const ensureBrowserDecodable = async (file: File): Promise<File> => {
    return isHeic(file) ? convertHeicToJpeg(file) : file;
};
