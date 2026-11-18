import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import {
  FALLBACK_URLS,
  detectCurrentSemester,
  fetchSemesterUrls,
} from '../utils/semesterDetector';
import { buildPortalAutoFillScript } from '../utils/portalInjector';
import {
  getSemesterOverride,
  setSemesterOverride,
  setActiveUsn,
} from '../utils/storage';

export default function PortalScreen({
  profiles,
  activeProfile,
  onSelectProfile,
  onOpenSetup,
}) {
  const webViewRef = useRef(null);
  const [semester, setSemester] = useState(() => detectCurrentSemester());
  const [urls, setUrls] = useState(FALLBACK_URLS);
  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState('');
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [override, liveUrls] = await Promise.all([
        getSemesterOverride(),
        fetchSemesterUrls(),
      ]);
      if (!mounted) return;
      if (override === 'odd' || override === 'even') {
        setSemester(override);
      }
      setUrls(liveUrls);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentUrl = urls[semester]?.url || FALLBACK_URLS[semester].url;

  const toggleSemester = async () => {
    const next = semester === 'odd' ? 'even' : 'odd';
    setSemester(next);
    await setSemesterOverride(next);
  };

  const resetAutoSemester = async () => {
    const autoSem = detectCurrentSemester();
    setSemester(autoSem);
    await setSemesterOverride(null);
  };

  const triggerAutoFill = () => {
    if (!webViewRef.current || !activeProfile) return;
    const script = buildPortalAutoFillScript(activeProfile);
    webViewRef.current.injectJavaScript(`
      window.__msritAutoFillDoneForUrl = null;
      ${script}
    `);
  };

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'STEP1_FILLED') {
        setStatusBanner('USN & DOB filled — enter the 5-char Captcha and tap LOGIN');
      } else if (msg.type === 'STEP2_SUBMITTED') {
        setStatusBanner("Verifying father's phone digits...");
        setTimeout(() => setStatusBanner(''), 3000);
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.semPill}
          onPress={toggleSemester}
          onLongPress={resetAutoSemester}
        >
          <Ionicons name="swap-horizontal" size={14} color="#1e3a8a" />
          <Text style={styles.semText}>
            {semester === 'odd' ? 'ODD SEM' : 'EVEN SEM'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profilePill}
          onPress={() => setProfileModalVisible(true)}
        >
          <Ionicons name="person-circle-outline" size={16} color="#0f172a" />
          <Text style={styles.profileText} numberOfLines={1}>
            {activeProfile?.usn || 'Select USN'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={triggerAutoFill}>
            <Ionicons name="flash-outline" size={19} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => webViewRef.current?.reload()}
          >
            <Ionicons name="refresh" size={19} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenSetup}>
            <Ionicons name="settings-outline" size={19} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {statusBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{statusBanner}</Text>
          <TouchableOpacity onPress={() => setStatusBanner('')}>
            <Ionicons name="close" size={16} color="#1e3a8a" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.webWrap}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          javaScriptEnabled={true}
          injectedJavaScript={buildPortalAutoFillScript(activeProfile)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            triggerAutoFill();
          }}
          onMessage={handleMessage}
          startInLoadingState={true}
        />
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="small" color="#1e3a8a" />
          </View>
        )}
      </View>

      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Switch Student Profile</Text>
            <FlatList
              data={profiles}
              keyExtractor={(item) => item.usn}
              renderItem={({ item }) => {
                const selected = item.usn === activeProfile?.usn;
                return (
                  <TouchableOpacity
                    style={[styles.profileRow, selected && styles.profileRowActive]}
                    onPress={async () => {
                      await setActiveUsn(item.usn);
                      onSelectProfile(item.usn);
                      setProfileModalVisible(false);
                      webViewRef.current?.reload();
                    }}
                  >
                    <View>
                      <Text style={styles.rowUsn}>{item.usn}</Text>
                      <Text style={styles.rowName}>{item.name}</Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#1e3a8a" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.addProfileBtn}
              onPress={() => {
                setProfileModalVisible(false);
                onOpenSetup();
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#1e3a8a" />
              <Text style={styles.addProfileText}>Add / Import Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  semPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  semText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  profilePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  bannerText: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '500',
    flex: 1,
  },
  webWrap: { flex: 1 },
  loaderOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 999,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  profileRowActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  rowUsn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowName: {
    fontSize: 12,
    color: '#64748b',
  },
  addProfileBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
  },
});
