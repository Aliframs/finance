import { google } from "googleapis";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Initializes the Google Drive API client using a Service Account JSON.
 */
function getDriveService() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Drive credentials not configured.");
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Uploads a PDF buffer to Google Drive.
 * 
 * @param fileName The name of the file to save
 * @param buffer The PDF buffer
 * @param folderId Optional Google Drive Folder ID to upload into
 * @returns The webViewLink of the uploaded file
 */
export async function uploadToGoogleDrive(
  fileName: string,
  buffer: Buffer,
  folderId?: string
): Promise<string> {
  const drive = getDriveService();

  const fileMetadata: any = {
    name: fileName,
  };
  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: "application/pdf",
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink",
  });

  if (!response.data.webViewLink) {
    throw new Error("Failed to get webViewLink from Google Drive");
  }

  // Make the file publicly readable (or accessible to anyone with the link)
  if (response.data.id) {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  }

  return response.data.webViewLink;
}
