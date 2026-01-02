
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
    deleteDoc,
    increment, 
    collection, 
    query, 
    where, 
    getDocs,
    runTransaction
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { FirebaseConfig, UserProfile } from '../types';
import { embeddedConfig } from '../lib/firebaseConfig';

let app: FirebaseApp | undefined;
let db: any;
let auth: any;
let functions: any;
let adminEmail: string = '';

const MAX_CREDITS_LIMIT = 1200;

export const initializeFirebase = (config?: FirebaseConfig) => {
    let finalConfig: FirebaseConfig | null = config || null;

    if (!finalConfig) {
        if (embeddedConfig) {
            finalConfig = embeddedConfig;
            adminEmail = embeddedConfig.adminEmail || 'osa.ivan@gmail.com';
        } 
        else {
            const stored = localStorage.getItem('firebaseConfig');
            if (stored) finalConfig = JSON.parse(stored);
        }
    }

    if (!finalConfig) return false;

    if (!getApps().length) {
        app = initializeApp(finalConfig as any);
    } else {
        app = getApp();
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app, 'asia-east1'); 

    setPersistence(auth, browserLocalPersistence).catch(console.warn);

    return true;
};

export const getAuthInstance = () => auth;
export const getFunctionsInstance = () => functions;

export const login = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const adminCreateUser = async (email: string, pass: string, displayName: string = '', remark: string = '') => {
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
        // 同步在 Firestore 建立文件，包含新備註欄位
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            displayName: displayName,
            remark: remark,
            credits: 0 
        });
        await signOut(secondaryAuth);
        return userCredential;
    } finally {
        await deleteApp(secondaryApp);
    }
};

export const logout = async () => { if (auth) await signOut(auth); };

export const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    await sendPasswordResetEmail(auth, email);
}

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            uid,
            email: data.email || 'Guest',
            displayName: data.displayName || '',
            remark: data.remark || '',
            credits: data.credits || 0,
            isAdmin: data.email === adminEmail
        };
    } else {
        const email = auth.currentUser?.email || '';
        await setDoc(doc(db, "users", uid), { email, credits: 0 });
        return { uid, email, credits: 0, isAdmin: email === adminEmail };
    }
};

/**
 * 徹底刪除用戶功能：透過 Cloud Function 同步刪除 Auth 與 Firestore
 */
export const deleteUserCompletely = async (targetUid: string) => {
    if (!functions) throw new Error("Firebase Functions not initialized");
    const deleteFn = httpsCallable(functions, 'adminDeleteUser');
    const result = await deleteFn({ targetUid });
    return result.data;
};

export const updateCreditsByUid = async (uid: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    
    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(docRef);
            if (!userSnap.exists()) throw new Error("User does not exist");
            const currentCredits = userSnap.data().credits || 0;
            let newTotal = Math.max(0, Math.min(currentCredits + amount, MAX_CREDITS_LIMIT));
            transaction.update(docRef, { credits: newTotal });
        });
    } catch (e) {
        console.error("Update credits failed", e);
        throw e;
    }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!db) throw new Error("Firebase not initialized");
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName || '',
            remark: data.remark || '',
            credits: data.credits || 0,
            isAdmin: data.email === adminEmail
        });
    });
    return users;
};
