
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, EmergencyType, PatientCase, Location, HospitalPreference } from './types';
import LoginView from './components/LoginView';
import PatientPortal from './components/PatientPortal';
import PolicePortal from './components/PolicePortal';
import HospitalPortal from './components/HospitalPortal';
import { SyncService } from './services/SyncService';
import { NotificationService } from './services/NotificationService';
import { firebaseReady } from './services/firebaseConfig';
import Logo from './components/Logo';
import { 
  Moon, Sun, 
  RefreshCcw, Siren, LogOut, Cloud, CloudOff, Zap, ExternalLink
} from 'lucide-react';

/**
 * Deduplicate cases by ID, keeping the latest version (by timestamp).
 */
const deduplicateCases = (cases: PatientCase[]): PatientCase[] => {
  const map = new Map<string, PatientCase>();
  for (const c of cases) {
    const existing = map.get(c.id);
    if (!existing || c.timestamp >= existing.timestamp) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
};

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}

const SESSION_KEY = 'the_saviour_session_v1';
const DARK_MODE_KEY = 'the_saviour_dark_mode';

/**
 * Main Application Component for THE SAVIOUR emergency platform.
 * Handles state management, routing, and universal grid synchronization.
 */
const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [userName, setUserName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [extraInfo, setExtraInfo] = useState(''); 
  const [secondaryExtra, setSecondaryExtra] = useState(''); 
  const [hospitalType, setHospitalType] = useState<string>(''); 
  const [activeCases, setActiveCases] = useState<PatientCase[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [firebaseFailed, setFirebaseFailed] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'error'>('online');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const lastSyncTimestampRef = useRef<number>(0);
  const activeCasesRef = useRef<PatientCase[]>(activeCases);
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    activeCasesRef.current = activeCases;
  }, [activeCases]);

  // Session Persistence: Auto-loads saved credentials on boot
  useEffect(() => {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const { role: r, name, extra, secondary, type, license } = JSON.parse(savedSession);
        setRole(r);
        setUserName(name);
        setExtraInfo(extra || '');
        setSecondaryExtra(secondary || '');
        setHospitalType(type || '');
        setLicenseNumber(license || '');
      } catch (e) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    const savedDarkMode = localStorage.getItem(DARK_MODE_KEY);
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Check Firebase Cloud Connection
    setIsFirebaseConnected(firebaseReady);
    setIsInitialized(true);
  }, []);

  const handleLinkGcp = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setIsFirebaseConnected(true);
    }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem(DARK_MODE_KEY, isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("GPS tracking inhibited", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const performSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const { cases, timestamp } = await SyncService.pullFromGlobal();
      if (timestamp > lastSyncTimestampRef.current || activeCasesRef.current.length === 0) {
        if (cases) {
          NotificationService.detectChangesAndNotify(activeCasesRef.current, deduplicateCases(cases), role, userName);
          setActiveCases(deduplicateCases(cases));
          lastSyncTimestampRef.current = timestamp;
          setSyncStatus('online');
        }
      } else {
        setSyncStatus('online');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [role, userName]);

  useEffect(() => {
    if (!isInitialized) return;

    // Always subscribe so we receive BroadcastChannel updates in offline mode
    const unsubscribe = SyncService.subscribeRealtime(
      (cases) => {
        NotificationService.detectChangesAndNotify(activeCasesRef.current, deduplicateCases(cases), role, userName);
        setActiveCases(deduplicateCases(cases));
        lastSyncTimestampRef.current = Date.now();
        setSyncStatus('online');
      },
      () => {
        setSyncStatus('error');
        setFirebaseFailed(true);
      }
    );

    // Initial pull
    performSync();

    let interval: ReturnType<typeof setInterval> | null = null;
    
    // Fallback: polling every 7 seconds if Firebase is off or failing
    if (!SyncService.isFirebaseAvailable() || firebaseFailed) {
      interval = setInterval(performSync, 7000); 
    }

    return () => { 
      if (unsubscribe) unsubscribe(); 
      if (interval) clearInterval(interval);
    };
  }, [isInitialized, performSync, firebaseFailed]);

  const handleLogin = (r: UserRole, name: string, extra?: string, secondary?: string, type?: string, license?: string) => {
    setRole(r);
    setUserName(name);
    setExtraInfo(extra || '');
    setSecondaryExtra(secondary || '');
    setHospitalType(type || '');
    setLicenseNumber(license || '');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: r, name, extra, secondary, type, license }));
    // Request notification permission after login
    NotificationService.requestPermission();
  };

  const handleLogout = () => {
    setRole(UserRole.NONE);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  const handleCreateCase = async (type: EmergencyType, preference: HospitalPreference) => {
    // Rate Limiting: Check for active case
    const existingActive = activeCasesRef.current.find(
      c => c.patientName === userName && (c.status === 'pending' || c.status === 'dispatched' || c.status === 'accepted')
    );
    if (existingActive) {
      throw new Error('RATE_LIMIT_ACTIVE');
    }

    // Rate Limiting: Check cooldown after completion
    const recentCompleted = activeCasesRef.current.find(
      c => c.patientName === userName &&
        (c.status === 'completed' || c.status === 'canceled') &&
        c.completedAt &&
        (Date.now() - c.completedAt) < RATE_LIMIT_COOLDOWN_MS
    );
    if (recentCompleted) {
      throw new Error('RATE_LIMIT_COOLDOWN');
    }

    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const uniqueId = `SAV-${timestampPart}-${randomPart}`;

    const newCase: PatientCase = {
      id: uniqueId,
      patientName: userName,
      phoneNumber: extraInfo,
      emergencyType: type,
      location: userLocation || { lat: 0, lng: 0 },
      status: 'pending',
      timestamp: Date.now(),
      hospitalPreference: preference
    };
    try {
      const updated = await SyncService.atomicUpdate(newCase);
      setActiveCases(deduplicateCases(updated));
    } catch (e) {
      setActiveCases(prev => deduplicateCases([newCase, ...prev]));
    }
    return newCase;
  };

  const handleCancelCase = async (id: string) => {
    const c = activeCasesRef.current.find(x => x.id === id);
    if (c) {
      const updatedCase: PatientCase = { ...c, status: 'canceled', timestamp: Date.now() };
      try {
        const updated = await SyncService.atomicUpdate(updatedCase);
        setActiveCases(deduplicateCases(updated));
      } catch (e) {
        setActiveCases(prev => deduplicateCases(prev.map(x => x.id === id ? updatedCase : x)));
      }
    }
  };

  const handleUpdateCase = async (id: string, status: PatientCase['status'], hName?: string, dName?: string, dNum?: string) => {
    const c = activeCasesRef.current.find(x => x.id === id);
    if (c) {
      const updatedCase: PatientCase = { 
        ...c, 
        status, 
        hospitalName: hName || c.hospitalName,
        ambulanceDriver: dName || c.ambulanceDriver,
        ambulanceDriverNumber: dNum || c.ambulanceDriverNumber,
        timestamp: Date.now(),
        completedAt: (status === 'completed' || status === 'canceled') ? Date.now() : c.completedAt,
      };
      try {
        const updated = await SyncService.atomicUpdate(updatedCase);
        setActiveCases(deduplicateCases(updated));
      } catch (e) {
        setActiveCases(prev => deduplicateCases(prev.map(x => x.id === id ? updatedCase : x)));
      }
    }
  };

  const handleAssignOfficer = async (id: string, oName: string) => {
    const c = activeCasesRef.current.find(x => x.id === id);
    if (c) {
      const updatedCase: PatientCase = { 
        ...c, 
        officerName: oName, 
        status: 'accepted',
        timestamp: Date.now() 
      };
      try {
        const updated = await SyncService.atomicUpdate(updatedCase);
        setActiveCases(deduplicateCases(updated));
      } catch (e) {
        setActiveCases(prev => deduplicateCases(prev.map(x => x.id === id ? updatedCase : x)));
      }
    }
  };

  const handleUpdateDriverLocation = async (caseId: string, driverLoc: Location) => {
    const c = activeCasesRef.current.find(x => x.id === caseId);
    if (c && c.status === 'dispatched') {
      const updatedCase: PatientCase = { ...c, driverLocation: driverLoc, timestamp: Date.now() };
      try {
        const updated = await SyncService.atomicUpdate(updatedCase);
        setActiveCases(deduplicateCases(updated));
      } catch (e) {
        setActiveCases(prev => deduplicateCases(prev.map(x => x.id === caseId ? updatedCase : x)));
      }
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <Siren className="w-16 h-16 text-red-600 animate-bounce" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Initializing Tactical Grid...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo 
            className="drop-shadow-md" 
            style={{ width: '1.25cm', height: '1.25cm' }}
          />
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">The Saviour</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
              <button 
                onClick={() => performSync()}
                className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center gap-1"
              >
                {syncStatus === 'error' ? 'Grid Interrupted - Resyncing...' : syncStatus}
                {syncStatus === 'error' && <RefreshCcw className="w-2 h-2 animate-spin" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFirebaseConnected ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-600/20' : 'bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-600/20'}`}>
            {isFirebaseConnected ? <Zap className="w-3.5 h-3.5 animate-pulse" /> : <CloudOff className="w-3.5 h-3.5" />}
            {isFirebaseConnected ? 'Firestore Live' : 'Local Mode'}
          </div>
          
          {role !== UserRole.NONE && (
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all font-black text-[10px] uppercase tracking-widest"
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white transition-all hover:scale-105 active:scale-95">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <main className="pt-28 px-6 max-w-7xl mx-auto min-h-screen">
        {role === UserRole.NONE ? (
          <LoginView onLogin={handleLogin} isGcpLinked={isFirebaseConnected} onLinkGcp={handleLinkGcp} />
        ) : role === UserRole.PATIENT ? (
          <PatientPortal 
            userName={userName} location={userLocation} activeCases={activeCases}
            onCreateCase={handleCreateCase} onCancelCase={handleCancelCase}
            onRefreshLocation={() => {}} onBack={() => setRole(UserRole.NONE)} onHome={() => setRole(UserRole.NONE)}
          />
        ) : role === UserRole.POLICE ? (
          <PolicePortal 
            userName={userName} activeCases={activeCases} location={userLocation}
            onAssignOfficer={handleAssignOfficer} onBack={() => setRole(UserRole.NONE)} onHome={() => setRole(UserRole.NONE)}
          />
        ) : role === UserRole.HOSPITAL ? (
          <HospitalPortal 
            hospitalName={userName} hospitalType={hospitalType} driverName={extraInfo} 
            driverPhone={secondaryExtra} activeCases={activeCases} onUpdateCase={handleUpdateCase}
            hospitalLocation={userLocation} onBack={() => setRole(UserRole.NONE)} onHome={() => setRole(UserRole.NONE)}
            onUpdateDriverLocation={handleUpdateDriverLocation}
          />
        ) : null}
      </main>

      <footer className="py-12 border-t border-slate-200 dark:border-white/5 text-center mt-20 opacity-30 flex flex-col items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-500 italic">Universal Emergency Grid &copy; 2025</p>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[8px] font-bold text-blue-500 uppercase tracking-widest hover:underline">
          <ExternalLink className="w-2 h-2" /> Google Cloud Billing Documentation
        </a>
      </footer>
    </div>
  );
};

export default App;
