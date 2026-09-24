import { db } from '../db/database';

export interface ForgeBackupMetadata {
  format: 'forge-backup';
  version: number;
  appVersion: string;
  exportedAt: string;
  databaseVersion: number;
  recordCounts: Record<string, number>;
  totalRecords: number;
}

export interface ForgeBackupPackage extends ForgeBackupMetadata {
  data: Record<string, any[]>;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  isLegacy?: boolean;
  formatVersion: number;
  exportedAt?: string;
  appVersion?: string;
  databaseVersion?: number;
  recordCounts: Record<string, number>;
  totalRecords: number;
  data: Record<string, any[]>;
}

export function generateBackupFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `forge-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}

/**
 * Reads all Dexie tables, validates integrity, and constructs a full Forge backup package.
 */
export async function createForgeBackup(): Promise<{
  backupPackage: ForgeBackupPackage;
  jsonString: string;
  filename: string;
}> {
  const tableDataMap: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;

  // Read all Dexie tables dynamically
  for (const table of db.tables) {
    const records = await table.toArray();
    tableDataMap[table.name] = records;
    recordCounts[table.name] = records.length;
    totalRecords += records.length;
  }

  const backupPackage: ForgeBackupPackage = {
    format: 'forge-backup',
    version: 2,
    appVersion: '2.2.0',
    exportedAt: new Date().toISOString(),
    databaseVersion: db.verno,
    recordCounts,
    totalRecords,
    data: tableDataMap,
  };

  // Serialize and validate JSON
  const jsonString = JSON.stringify(backupPackage, null, 2);
  const parsed = JSON.parse(jsonString);

  if (!parsed || parsed.format !== 'forge-backup' || !parsed.data) {
    throw new Error('Backup integrity verification failed: Serialized JSON is invalid.');
  }

  // Confirm table representations
  for (const table of db.tables) {
    if (!Array.isArray(parsed.data[table.name])) {
      throw new Error(`Backup integrity verification failed: Missing table ${table.name}`);
    }
  }

  const filename = generateBackupFilename();
  
  // Record timestamp in local storage
  try {
    localStorage.setItem('forge_last_backup_timestamp', new Date().toISOString());
  } catch (e) {
    // Ignore storage errors
  }

  return { backupPackage, jsonString, filename };
}

/**
 * Saves a backup string to native filesystem (Capacitor), File System Access API, or Download Link.
 */
export async function saveBackupFile(
  jsonString: string,
  filename: string
): Promise<{ success: boolean; savedVia: string }> {
  // Check for Capacitor native environment
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    if (cap?.Plugins?.Filesystem) {
      try {
        await cap.Plugins.Filesystem.writeFile({
          path: filename,
          data: jsonString,
          directory: 'DOCUMENTS',
          encoding: 'utf8',
        });
        return { success: true, savedVia: 'Capacitor Filesystem' };
      } catch (err) {
        console.warn('Capacitor filesystem write failed, falling back:', err);
      }
    }
    if (cap?.Plugins?.Share) {
      try {
        await cap.Plugins.Share.share({
          title: 'Forge Backup',
          text: jsonString,
          dialogTitle: 'Save Forge Backup',
        });
        return { success: true, savedVia: 'Capacitor Share' };
      } catch (err) {
        console.warn('Capacitor share failed, falling back:', err);
      }
    }
  }

  // Modern Web File System Access API (showSaveFilePicker)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Forge Backup File (*.json)',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      return { success: true, savedVia: 'Save File Picker' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Save cancelled by user.');
      }
      console.warn('showSaveFilePicker failed, falling back to blob download:', err);
    }
  }

  // Fallback: Standard HTML5 Blob download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { success: true, savedVia: 'Browser Download' };
}

/**
 * Validates and parses a raw JSON string into a structured backup result.
 * Supports format v2 (forge-backup) and legacy v1/v4 AppExportData files.
 */
export function parseAndValidateBackup(jsonString: string): BackupValidationResult {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      isValid: false,
      error: 'Malformed JSON file. Unable to parse data.',
      formatVersion: 0,
      recordCounts: {},
      totalRecords: 0,
      data: {},
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      error: 'Invalid backup file content.',
      formatVersion: 0,
      recordCounts: {},
      totalRecords: 0,
      data: {},
    };
  }

  const tableData: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;
  let isLegacy = false;
  const formatVersion = parsed.version || 1;
  const exportedAt = parsed.exportedAt || new Date().toISOString();
  const appVersion = parsed.appVersion || 'Legacy';
  const databaseVersion = parsed.databaseVersion || 10;

  // Format V2 (forge-backup format with "data" property)
  if (parsed.format === 'forge-backup' && parsed.data && typeof parsed.data === 'object') {
    for (const [tableName, records] of Object.entries(parsed.data)) {
      if (Array.isArray(records)) {
        tableData[tableName] = records as any[];
        recordCounts[tableName] = (records as any[]).length;
        totalRecords += (records as any[]).length;
      }
    }
  } else {
    // Legacy format (top-level properties e.g. player, stats, quests, etc.)
    isLegacy = true;

    const knownTables = [
      'player',
      'stats',
      'quests',
      'questLogs',
      'chapters',
      'activeBuilds',
      'skills',
      'chronicle',
      'legacyMilestones',
      'personalRecords',
      'dailyReflections',
      'destinies',
      'principles',
      'healthLogs',
      'healthSettings',
      'memoryCapsules',
      'workoutTemplates',
      'workoutLogs',
      'routines',
      'habits',
      'journalEntries',
      'achievements',
      'recoveryLogs',
    ];

    for (const key of knownTables) {
      const val = parsed[key];
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          tableData[key] = val;
          recordCounts[key] = val.length;
          totalRecords += val.length;
        } else if (typeof val === 'object') {
          tableData[key] = [val];
          recordCounts[key] = 1;
          totalRecords += 1;
        }
      }
    }
  }

  // Basic sanity validation: Must have at least player or stats or quests
  if (!tableData.player || tableData.player.length === 0) {
    if (totalRecords === 0) {
      return {
        isValid: false,
        error: 'INVALID FORGE BACKUP: This file does not appear to contain valid Forge data or player profiles.',
        formatVersion,
        recordCounts: {},
        totalRecords: 0,
        data: {},
      };
    }
  }

  return {
    isValid: true,
    isLegacy,
    formatVersion,
    exportedAt,
    appVersion,
    databaseVersion,
    recordCounts,
    totalRecords,
    data: tableData,
  };
}

/**
 * Performs an atomic database import inside a single Dexie transaction.
 * Clears existing tables and populates with backup data.
 */
export async function executeAtomicRestore(tableData: Record<string, any[]>): Promise<boolean> {
  await db.transaction('rw', db.tables, async () => {
    // Clear all existing tables
    for (const table of db.tables) {
      await table.clear();
    }

    // Populate records from backup for each table
    for (const table of db.tables) {
      const records = tableData[table.name];
      if (records && Array.isArray(records) && records.length > 0) {
        await table.bulkPut(records);
      }
    }
  });

  // Record last backup / restore timestamp
  try {
    localStorage.setItem('forge_last_backup_timestamp', new Date().toISOString());
  } catch (e) {
    // Ignore storage errors
  }

  return true;
}
