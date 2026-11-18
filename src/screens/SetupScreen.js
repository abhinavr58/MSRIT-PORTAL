import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  upsertProfile,
  importProfilesFromExcel,
  parseDobParts,
} from '../utils/storage';

export default function SetupScreen({ profiles, onDone, onCancel }) {
  const [usn, setUsn] = useState(profiles[0]?.usn || '');
  const [dob, setDob] = useState(profiles[0]?.dob || '');
  const [fatherLast4, setFatherLast4] = useState(profiles[0]?.fatherLast4 || '');
  const [name, setName] = useState(profiles[0]?.name || '');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!usn.trim()) {
      Alert.alert('Missing USN', 'Please enter your MSRIT USN (e.g. 1MS23CS001).');
      return;
    }
    if (!parseDobParts(dob)) {
      Alert.alert('Invalid DOB', 'Enter Date of Birth as DD-MM-YYYY (e.g. 15-08-2004).');
      return;
    }
    const cleanLast4 = fatherLast4.replace(/\D/g, '');
    if (cleanLast4.length !== 4) {
      Alert.alert(
        'Invalid Digits',
        "Enter the last 4 digits of your father's registered phone number."
      );
      return;
    }

    setBusy(true);
    try {
      const updated = await upsertProfile({
        usn,
        dob,
        fatherLast4: cleanLast4,
        name: name || usn,
      });
      onDone(updated);
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Could not save credentials.');
    } finally {
      setBusy(false);
    }
  };

  const handleExcelImport = async () => {
    setBusy(true);
    try {
      const res = await importProfilesFromExcel();
      if (!res.canceled) {
        Alert.alert(
          'Import Complete',
          `Imported ${res.imported.length} student profile(s) into encrypted on-device storage.`
        );
        onDone(res.allProfiles);
      }
    } catch (e) {
      Alert.alert('Excel Import Error', e.message || 'Could not read the selected file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="school" size={28} color="#1e3a8a" />
        </View>
        <Text style={styles.title}>MSRIT Portal Setup</Text>
        <Text style={styles.subtitle}>
          Save your details once in encrypted device storage. The app keeps your session active and
          auto-fills both login steps whenever re-authentication is needed.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>USN</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1MS23CS001"
          autoCapitalize="characters"
          value={usn}
          onChangeText={setUsn}
        />

        <Text style={styles.label}>Date of Birth (DD-MM-YYYY)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 15-08-2004"
          keyboardType="numbers-and-punctuation"
          value={dob}
          onChangeText={setDob}
        />

        <Text style={styles.label}>Father's Phone (Last 4 Digits)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 4321"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={fatherLast4}
          onChangeText={setFatherLast4}
        />

        <Text style={styles.label}>Label / Name (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. My Account"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.disabledBtn]}
          onPress={handleSave}
          disabled={busy}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Save & Open Portal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Import from Excel / CSV</Text>
        <Text style={styles.cardDesc}>
          Load one or more student profiles from an .xlsx or .csv file with columns:{' '}
          <Text style={styles.mono}>USN, DOB, FatherLast4, Name</Text>.
        </Text>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleExcelImport}
          disabled={busy}
        >
          <Ionicons name="document-text-outline" size={18} color="#1e3a8a" />
          <Text style={styles.secondaryBtnText}>Choose Excel / CSV File</Text>
        </TouchableOpacity>
      </View>

      {profiles.length > 0 && onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Back to Portal</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f8fafc',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },
  mono: {
    fontWeight: '600',
    color: '#1e293b',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
