
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account key file
const KEY_FILE_PATH = path.join(__dirname, 'google-credentials.json');

// Scopes required for Google Drive access
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveService() {
    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.warn('WARNING: google-credentials.json not found in server directory. Google Drive uploads will fail.');
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
}

export async function uploadToDrive(filePath, fileName, mimeType) {
    const drive = await getDriveService();
    if (!drive) return null;

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : [],
    };

    const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make the file publicly viewable if needed
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
}
