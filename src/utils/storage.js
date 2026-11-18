import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

const PROFILES_KEY = 'msrit_student_profiles_v1';
const ACTIVE_USN_KEY = 'msrit_active_usn_v1';
const SEM_OVERRIDE_KEY = 'msrit_sem_override_v1';

export function parseDobParts(rawDob) {
  if (!rawDob && rawDob !== 0) return null;

  if (typeof rawDob === 'number') {
    const parsed = XLSX.SSF.parse_date_code(rawDob);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return {
        day: String(parsed.d).padStart(2, '0'),
        month: String(parsed.m).padStart(2, '0'),
        year: String(parsed.y),
      };
    }
  }

  const str = String(rawDob).trim();
  let m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    return {
      year: m[1],
      month: m[2].padStart(2, '0'),
      day: m[3].padStart(2, '0'),
    };
  }

  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    return {
      day: m[1].padStart(2, '0'),
      month: m[2].padStart(2, '0'),
      year: m[3],
    };
  }

  return null;
}

export async function getProfiles() {
  try {
    const raw = await SecureStore.getItemAsync(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles) {
  await SecureStore.setItemAsync(PROFILES_KEY, JSON.stringify(profiles));
}

export async function upsertProfile(profile) {
  const cleanUsn = profile.usn.trim().toUpperCase();
  const cleanLast4 = String(profile.fatherLast4).replace(/\D/g, '').slice(-4);
  const nextProfile = {
    usn: cleanUsn,
    dob: profile.dob.trim(),
    fatherLast4: cleanLast4,
    name: (profile.name || cleanUsn).trim(),
  };

  const existing = await getProfiles();
  const filtered = existing.filter((p) => p.usn !== cleanUsn);
  const updated = [nextProfile, ...filtered];
  await saveProfiles(updated);
  await setActiveUsn(cleanUsn);
  return updated;
}

export async function deleteProfile(usn) {
  const existing = await getProfiles();
  const updated = existing.filter((p) => p.usn !== usn);
  await saveProfiles(updated);
  const active = await getActiveUsn();
  if (active === usn) {
    await setActiveUsn(updated[0]?.usn || '');
  }
  return updated;
}

export async function getActiveUsn() {
  try {
    return (await SecureStore.getItemAsync(ACTIVE_USN_KEY)) || '';
  } catch {
    return '';
  }
}

export async function setActiveUsn(usn) {
  await SecureStore.setItemAsync(ACTIVE_USN_KEY, usn || '');
}

export async function getSemesterOverride() {
  try {
    return await SecureStore.getItemAsync(SEM_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export async function setSemesterOverride(sem) {
  if (!sem) {
    await SecureStore.deleteItemAsync(SEM_OVERRIDE_KEY);
  } else {
    await SecureStore.setItemAsync(SEM_OVERRIDE_KEY, sem);
  }
}

export async function importProfilesFromExcel() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { canceled: true, imported: [] };
  }

  const fileUri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const workbook = XLSX.read(base64, { type: 'base64' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

  const imported = [];
  for (const row of rows) {
    const norm = {};
    Object.keys(row).forEach((k) => {
      norm[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
    });

    const usn = String(norm.usn || norm.studentusn || '').trim().toUpperCase();
    const rawDob = norm.dob || norm.dateofbirth || norm.birthdate || '';
    const dobParts = parseDobParts(rawDob);
    const rawFather = String(
      norm.fatherlast4 || norm.fatherphone || norm.fathersphone || norm.last4 || norm.phone || ''
    ).replace(/\D/g, '');
    const fatherLast4 = rawFather.slice(-4);
    const name = String(norm.name || norm.studentname || usn).trim();

    if (usn && dobParts && fatherLast4.length === 4) {
      imported.push({
        usn,
        dob: `${dobParts.day}-${dobParts.month}-${dobParts.year}`,
        fatherLast4,
        name,
      });
    }
  }

  if (imported.length === 0) {
    throw new Error(
      'No valid rows found. Make sure your Excel/CSV has columns: USN, DOB (DD-MM-YYYY), and FatherLast4.'
    );
  }

  const existing = await getProfiles();
  const map = new Map(existing.map((p) => [p.usn, p]));
  for (const item of imported) {
    map.set(item.usn, item);
  }
  const merged = Array.from(map.values());
  await saveProfiles(merged);
  await setActiveUsn(imported[0].usn);

  return { canceled: false, imported, allProfiles: merged };
}
