import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private readonly uploadDir: string;
  private drive: drive_v3.Drive | null = null;
  private rootFolderId: string | null = null;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    this.initGoogleDrive();
  }

  private initGoogleDrive() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    if (clientId && clientSecret && refreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          'urn:ietf:wg:oauth:2.0:oob',
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        this.logger.log('✅ Google Drive API Client berhasil diinisialisasi.');
      } catch (err: any) {
        this.logger.error(`⚠️ Gagal menginisialisasi Google Drive API: ${err.message}`);
      }
    } else {
      this.logger.log('ℹ️ Google Drive API tidak diaktifkan (kredensial belum lengkap). Menggunakan penyimpanan lokal.');
    }
  }

  /**
   * Mendapatkan atau membuat folder root "Reviewii" di Google Drive
   */
  private async getOrCreateRootFolder(): Promise<string | null> {
    if (!this.drive) return null;
    if (this.rootFolderId) return this.rootFolderId;

    const rootName = this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_NAME') || 'Reviewii';

    try {
      const res = await this.drive.files.list({
        q: `name='${rootName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        this.rootFolderId = res.data.files[0].id!;
        return this.rootFolderId;
      }

      const folder = await this.drive.files.create({
        requestBody: {
          name: rootName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      this.rootFolderId = folder.data.id!;
      this.logger.log(`📁 Root folder Google Drive "${rootName}" dibuat (ID: ${this.rootFolderId})`);
      return this.rootFolderId;
    } catch (err: any) {
      this.logger.error(`Error getOrCreateRootFolder: ${err.message}`);
      return null;
    }
  }

  /**
   * Membuat folder sub-project di Google Drive
   */
  async createProjectFolder(clientName: string, projectTitle: string): Promise<string> {
    const parentFolderId = await this.getOrCreateRootFolder();

    if (this.drive && parentFolderId) {
      try {
        const folderName = `${clientName} - ${projectTitle}`;
        const folder = await this.drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
          },
          fields: 'id',
        });
        const gdriveId = folder.data.id!;
        this.logger.log(`📁 Folder project Google Drive "${folderName}" dibuat (ID: ${gdriveId})`);
        return gdriveId;
      } catch (err: any) {
        this.logger.error(`Gagal membuat folder di Google Drive: ${err.message}`);
      }
    }

    const folderPath = path.join(this.uploadDir, clientName, projectTitle);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderPath;
  }

  /**
   * Menyimpan file ke lokal disk & Google Drive
   */
  async saveFile(
    fileBuffer: Buffer,
    fileName: string,
    subfolder: string = '',
    folderId?: string,
  ): Promise<{ fileId: string; filePath: string }> {
    const dir = path.join(this.uploadDir, subfolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fullPath = path.join(dir, `${timestamp}_${cleanFileName}`);
    await fs.promises.writeFile(fullPath, fileBuffer);

    const relativeUrl = `/uploads/${path.relative(this.uploadDir, fullPath).replace(/\\/g, '/')}`;
    let gdriveFileId = path.basename(fullPath);

    if (this.drive) {
      try {
        const parentId = folderId || (await this.getOrCreateRootFolder());
        const media = {
          body: Readable.from(fileBuffer),
        };
        const gfile = await this.drive.files.create({
          requestBody: {
            name: `${timestamp}_${cleanFileName}`,
            parents: parentId ? [parentId] : undefined,
          },
          media: media,
          fields: 'id, webViewLink, webContentLink',
        });
        if (gfile.data.id) {
          gdriveFileId = gfile.data.id;
          this.logger.log(`☁️ File di-upload ke Google Drive (ID: ${gdriveFileId})`);
        }
      } catch (err: any) {
        this.logger.error(`⚠️ Upload ke Google Drive gagal, menggunakan penyimpanan lokal: ${err.message}`);
      }
    }

    return {
      fileId: gdriveFileId,
      filePath: relativeUrl,
    };
  }

  /**
   * Menghapus file atau folder dari Google Drive & local disk
   */
  async deleteFileOrFolder(fileOrFolderId?: string | null): Promise<void> {
    if (!fileOrFolderId) return;

    // 1. Hapus dari Google Drive jika Drive API aktif
    if (this.drive) {
      try {
        if (!fileOrFolderId.includes('/') && !fileOrFolderId.includes('\\')) {
          await this.drive.files.delete({ fileId: fileOrFolderId });
          this.logger.log(`🗑️ Berhasil menghapus file/folder dari Google Drive (ID: ${fileOrFolderId})`);
        } else {
          // Cari file berdasarkan nama file jika berupa path
          const fileName = path.basename(fileOrFolderId);
          const searchRes = await this.drive.files.list({
            q: `name='${fileName}' and trashed=false`,
            fields: 'files(id, name)',
          });
          if (searchRes.data.files && searchRes.data.files.length > 0) {
            for (const f of searchRes.data.files) {
              await this.drive.files.delete({ fileId: f.id! });
              this.logger.log(`🗑️ Berhasil menghapus file "${f.name}" dari Google Drive (ID: ${f.id})`);
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`⚠️ Gagal menghapus dari Google Drive: ${err.message}`);
      }
    }

    // 2. Hapus dari local disk jika berupa file path lokal
    if (fileOrFolderId.startsWith('/uploads/') || fileOrFolderId.includes('uploads')) {
      try {
        const localPath = path.join(process.cwd(), fileOrFolderId.replace(/^\/uploads\//, 'uploads/'));
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
          this.logger.log(`🗑️ Berhasil menghapus file lokal: ${localPath}`);
        }
      } catch (err: any) {
        this.logger.error(`⚠️ Gagal menghapus file lokal: ${err.message}`);
      }
    }
  }
}
