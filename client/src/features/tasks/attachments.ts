import type { AttachmentPayload } from '../../api/types';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// Reads a File into a base64 data-URL payload matching the backend contract.
export const readAttachmentFile = (file: File): Promise<AttachmentPayload> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        data: String(reader.result),
        name: file.name,
        type: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(new Error('Unable to read attachment'));
    reader.readAsDataURL(file);
  });
