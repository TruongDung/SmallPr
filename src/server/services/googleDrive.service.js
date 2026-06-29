const { google } = require('googleapis');
const path = require('path');
const { Readable } = require('stream');

const logger = require('../logger');

const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../..', 'google-service-account.json');
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

let driveClient = null;

const getDriveClient = () => {
  if (driveClient) return driveClient;

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Google Drive client');
    return null;
  }
};

/**
 * Upload a file to Google Drive.
 * @param {Object} params
 * @param {string} params.fileName - The file name to use in Drive
 * @param {string} params.mimeType - MIME type of the file
 * @param {Buffer|string} params.data - File contents (Buffer or base64 string)
 * @returns {{ fileId, webViewLink, webContentLink } | null}
 */
const uploadFile = async ({ fileName, mimeType, data }) => {
  const drive = getDriveClient();
  if (!drive) {
    logger.warn('Google Drive upload skipped: client not initialized');
    return null;
  }

  if (!FOLDER_ID) {
    logger.warn('Google Drive upload skipped: GOOGLE_DRIVE_FOLDER_ID not set');
    return null;
  }

  try {
    // Convert base64 to Buffer if needed
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    // Make the file readable by anyone with the link
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    // Re-fetch to get the updated links after permission change
    const file = await drive.files.get({
      fileId,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    logger.info({ fileId, fileName }, 'File uploaded to Google Drive');

    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
    };
  } catch (error) {
    logger.error({ err: error, fileName }, 'Failed to upload file to Google Drive');
    return null;
  }
};

/**
 * Delete a file from Google Drive.
 * @param {string} fileId - The Drive file ID to delete
 */
const deleteFile = async (fileId) => {
  if (!fileId) return;
  const drive = getDriveClient();
  if (!drive) return;

  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
    logger.info({ fileId }, 'File deleted from Google Drive');
  } catch (error) {
    // Don't throw — file might already be deleted
    logger.warn({ err: error, fileId }, 'Failed to delete file from Google Drive');
  }
};

/**
 * Check if Google Drive storage is configured and available.
 */
const isEnabled = () => Boolean(FOLDER_ID && getDriveClient());

module.exports = {
  uploadFile,
  deleteFile,
  isEnabled,
};
