
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
    getDocs 
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import type { FirebaseConfig, UserProfile } from '../types';
import { embeddedConfig } from '../lib/firebaseConfig';

let app: FirebaseApp | undefined;
let db: any;
let auth: any;
let functions: any;
let adminEmail: string = '';

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

    if (!finalConfig) {
         return false;
    }

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
    // Explicitly use us-central1 to ensure client targets the correct region
    functions = getFunctions(app, 'us-central1'); 

    // Explicitly set persistence to Local to avoid session loss in some cloud environments
    setPersistence(auth, browserLocalPersistence).catch(error => {
        console.warn("Auth persistence failed:", error);
    });

    // Uncomment to use local emulator
    // connectFunctionsEmulator(functions, "127.0.0.1", 5001);

    return true;
};

export const getAuthInstance = () => auth;
export const getFunctionsInstance = () => functions;

export const login = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    // Ensure persistence is set before login attempt
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

export const adminCreateUser = async (email: string, pass: string) => {
    if (!db) throw new Error("Firebase not initialized");
    
    let config: FirebaseConfig | null = embeddedConfig;
    if (!config) {
        const stored = localStorage.getItem('firebaseConfig');
        if (stored) config = JSON.parse(stored);
    }
    
    if (!config) throw new Error("Firebase config not found");

    const secondaryApp = initializeApp(config as any, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
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
                credits: data.credits || 0,
                isAdmin: data.email === adminEmail
            };
        } else {
            // For guest or new users, create profile
            const isGuest = auth.currentUser?.isAnonymous;
            const initialCredits = isGuest ? 5 : 20; // Guests get fewer credits
            const email = auth.currentUser?.email || (isGuest ? 'Guest User' : '');
            
            await setDoc(doc(db, "users", uid), { 
                email: email, 
                credits: initialCredits,
                isAnonymous: isGuest 
            });
            
            return { 
                uid, 
                email: email, 
                credits: initialCredits, 
                isAdmin: email === adminEmail 
            };
        }
    } catch (e: any) {
        console.error("Error fetching user profile:", e);
        // Fallback for permission errors (e.g. if rules block reading)
        return {
            uid,
            email: 'Unknown',
            credits: 0,
            isAdmin: false
        };
    }
};

export const deductCredits = async (uid: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
        credits: increment(-amount)
    });
};

export const addCreditsByEmail = async (targetEmail: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", targetEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("User not found");
    }

    const userDoc = querySnapshot.docs[0];
    await updateDoc(userDoc.ref, {
        credits: increment(amount)
    });
};

export const updateCreditsByUid = async (uid: string, amount: number) => {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
        credits: increment(amount)
    });
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
            credits: data.credits || 0,
            isAdmin: data.email === adminEmail
        });
    });
    
    return users;
};
