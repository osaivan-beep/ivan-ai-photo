
import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously,
    type User as FirebaseUser 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    increment, 
    collection, 
    query, 
    where, 
    getDocs,
    runTransaction
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import type { FirebaseConfig, UserProfile } from '../types';
import { embeddedConfig } from '../lib/firebaseConfig';

let app: FirebaseApp | undefined;
let db: any;
let auth: any;
let functions: any;
let adminEmail: string = '';

// 系統全域點數上限
const MAX_CREDITS_LIMIT = 1200;

export const isFirebaseConfigured = () => {
    if (embeddedConfig) return true;
    const storedConfig = localStorage.getItem('firebaseConfig');
    return !!storedConfig;
};

export const initializeFirebase = (config?: FirebaseConfig) => {
    let finalConfig: FirebaseConfig | null = config || null;

    if (!finalConfig) {
        if (embeddedConfig) {
            finalConfig = embeddedConfig;
            if (embeddedConfig.adminEmail) {
                adminEmail = embeddedConfig.adminEmail;
            } else {
                adminEmail = 'osa.ivan@gmail.com'; 
            }
        } 
        else {
            const stored = localStorage.getItem('firebaseConfig');
            if (stored) {
                finalConfig = JSON.parse(stored);
            }
        }
    }

    if (!finalConfig) return false;

    if (!finalConfig.apiKey || !finalConfig.authDomain || !finalConfig.projectId) {
        throw new Error("Invalid Firebase Configuration.");
    }

    if (!embeddedConfig) {
        localStorage.setItem('firebaseConfig', JSON.stringify(finalConfig));
    }

    if (finalConfig.adminEmail) {
        adminEmail = finalConfig.adminEmail;
    } else if (!adminEmail) {
        adminEmail = 'osa.ivan@gmail.com';
    }

    if (!getApps().length) {
        app = initializeApp(finalConfig as any);
    } else {
        app = getApp();
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app, 'asia-east1'); 

    setPersistence(auth, browserLocalPersistence).catch(error => {
        console.warn("Auth persistence failed:", error);
    });

    return true;
};

export const getAuthInstance = () => auth;
export const getFunctionsInstance = () => functions;

export const login = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    await setPersistence(auth, browserLocalPersistence);
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const loginAsGuest = async () => {
    if (!auth) throw new Error("Firebase not initialized");
    await setPersistence(auth, browserLocalPersistence);
    return await signInAnonymously(auth);
};

export const register = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        credits: 20
    });
    return userCredential;
};

export const adminCreateUser = async (email: string, pass: string, displayName: string = '') => {
    if (!db || !auth) throw new Error("Firebase not initialized");
    
    let config: FirebaseConfig | null = embeddedConfig;
    if (!config) {
        const stored = localStorage.getItem('firebaseConfig');
        if (stored) config = JSON.parse(stored);
    }
    
    if (!config) throw new Error("Firebase config not found");

    const secondaryApp = initializeApp(config as any, "AdminApp-" + Date.now());
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            displayName: displayName,
            credits: 20
        });
        await signOut(secondaryAuth);
        return userCredential;
    } finally {
        await deleteApp(secondaryApp);
    }
};

export const logout = async () => {
    if (!auth) return;
    await signOut(auth);
};

export const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    await sendPasswordResetEmail(auth, email);
}

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                uid,
                email: data.email || 'Guest',
                displayName: data.displayName || data.name || '',
                credits: data.credits || 0,
                isAdmin: data.email === adminEmail
            };
        } else {
            const isGuest = auth.currentUser?.isAnonymous;
            const initialCredits = isGuest ? 5 : 20; 
            const email = auth.currentUser?.email || (isGuest ? 'Guest User' : '');
            await setDoc(doc(db, "users", uid), { email, credits: initialCredits, isAnonymous: isGuest });
            return { uid, email, displayName: '', credits: initialCredits, isAdmin: email === adminEmail };
        }
    } catch (e: any) {
        console.error("Error fetching user profile:", e);
        return { uid, email: 'Unknown', credits: 0, isAdmin: false };
    }
};

export const deductCredits = async (uid: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
        credits: increment(-amount)
    });
};

/**
 * 更新點數邏輯：加入 1200 點強制截斷上限
 */
export const updateCreditsByUid = async (uid: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    
    // 使用交易 (Transaction) 確保讀寫一致性
    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(docRef);
            if (!userSnap.exists()) throw new Error("User does not exist");
            
            const currentCredits = userSnap.data().credits || 0;
            let newTotal = currentCredits + amount;
            
            // 強制限制在 0 ~ 1200 之間
            newTotal = Math.max(0, Math.min(newTotal, MAX_CREDITS_LIMIT));
            
            transaction.update(docRef, { credits: newTotal });
        });
    } catch (e) {
        console.error("Update credits transaction failed", e);
        throw e;
    }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!db) throw new Error("Firebase not initialized");
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName || data.name || '',
            credits: data.credits || 0,
            isAdmin: data.email === adminEmail
        });
    });
    return users;
};
