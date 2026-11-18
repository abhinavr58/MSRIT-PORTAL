import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SetupScreen from './src/screens/SetupScreen';
import PortalScreen from './src/screens/PortalScreen';
import { getActiveUsn, getProfiles } from './src/utils/storage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [activeUsn, setActiveUsn] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    (async () => {
      const [loadedProfiles, savedUsn] = await Promise.all([
        getProfiles(),
        getActiveUsn(),
      ]);
      setProfiles(loadedProfiles);
      setActiveUsn(savedUsn || loadedProfiles[0]?.usn || '');
      setShowSetup(loadedProfiles.length === 0);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const activeProfile =
    profiles.find((p) => p.usn === activeUsn) || profiles[0] || null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        {showSetup || !activeProfile ? (
          <SetupScreen
            profiles={profiles}
            onDone={(updatedProfiles) => {
              setProfiles(updatedProfiles);
              setActiveUsn(updatedProfiles[0]?.usn || '');
              setShowSetup(false);
            }}
            onCancel={profiles.length > 0 ? () => setShowSetup(false) : null}
          />
        ) : (
          <PortalScreen
            profiles={profiles}
            activeProfile={activeProfile}
            onSelectProfile={(usn) => setActiveUsn(usn)}
            onOpenSetup={() => setShowSetup(true)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
