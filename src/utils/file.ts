// src/utils/file.ts
// -----------------------------------------------------------------------------
// WHY: Native mobile apps can't just "download" like a browser. We need to:
//  1. Download to a temp path (RNFS).
//  2. Open the system share sheet so user can save/email/etc (react-native-share).
// This helper centralizes that logic so screens just call `downloadAndShareFile`.
//

import RNFS from 'react-native-fs';
import Share from 'react-native-share';

/**
 * Downloads a file from `url`, saves it to tmp dir, then opens system share sheet.
 * @param url Direct URL to backend PDF or ZIP.
 * @param filename Optional custom name (otherwise derived from URL).
 */
export async function downloadAndShareFile(url: string, filename?: string) {
  try {
    // Derive filename if not provided
    let name = filename;
    if (!name) {
      const parts = url.split('/');
      name = parts[parts.length - 1] || 'file';
      if (!name.includes('.')) {
        // fallback extension based on URL
        if (url.includes('/pdf')) name += '.pdf';
        else if (url.includes('/export')) name += '.zip';
      }
    }

    // Temp path
      const destPath = `${RNFS.CachesDirectoryPath}/${name}`;
      
    //   Log temp path
      console.log('[downloadAndShareFile] Temp path ->', destPath);

    // Download
    const res = await RNFS.downloadFile({ fromUrl: url, toFile: destPath }).promise;
    if (res.statusCode !== 200) {
      throw new Error(`Download failed with status ${res.statusCode}`);
    }

    // Share sheet
    await Share.open({
      title: 'Save or share file',
      url: `file://${destPath}`,
      failOnCancel: false,
      saveToFiles: true, // iOS "Save to Files" option
    });

    return destPath;
  } catch (err) {
    console.error('[downloadAndShareFile] error', err);
    throw err;
  }
}
