export const supportedImageTypes = ['image/png','image/jpeg','image/webp'];
export const artworkLimit = 20 * 1024 * 1024;

export const mockArtwork = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75"><g fill="none" stroke="#6236d3" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="35" r="13"/><path d="M50 7v7m0 42v7M22 35h7m42 0h7M30 15l5 5m30 30 5 5m0-40-5 5M35 50l-5 5"/></g><circle cx="50" cy="35" r="8" fill="#ff904d"/></svg>');
export const samplePortrait = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 135"><ellipse cx="60" cy="67" rx="55" ry="64" fill="#f4ae84"/><path d="M6 58Q9 1 65 4q48 2 50 57-15-23-44-29-28 26-65 26" fill="#442744"/><circle cx="41" cy="67" r="5" fill="#442744"/><circle cx="79" cy="67" r="5" fill="#442744"/><path d="M47 92q13 18 27 0" fill="none" stroke="#a03b58" stroke-width="4" stroke-linecap="round"/></svg>');

const readAsDataURL = file => new Promise((resolve,reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Validate and read an uploaded artwork file.
 * Returns {art,pdf,filename,sourceDimensions} or throws Error(message) for the toast.
 */
export async function readArtworkFile(file,item) {
  const pdfAllowed = Boolean(item.shape && !item.imageOnly);
  const pdf = pdfAllowed && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  const formats = pdfAllowed ? 'PNG, JPG, WebP or PDF' : 'PNG, JPG or WebP';
  if ((!pdf && !supportedImageTypes.includes(file.type)) || file.size > artworkLimit) throw Error(`Choose ${formats} up to 20 MB.`);
  try {
    if (pdf) {
      if (await file.slice(0,5).text() !== '%PDF-') throw Error('Invalid PDF');
      return {art:'',pdf:file,filename:file.name,sourceDimensions:undefined};
    }
    const art = await readAsDataURL(file);
    const image = new Image();
    image.src = art;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 64000000) throw Error('Image dimensions exceed limit');
    return {art,pdf:null,filename:file.name,sourceDimensions:{width:image.naturalWidth,height:image.naturalHeight}};
  } catch {
    throw Error('This file could not be opened. Try another file.');
  }
}
