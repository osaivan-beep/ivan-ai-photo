


import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
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
import type { FirebaseConfig, UserProfile } from '../types';

let app: FirebaseApp | undefined;
let db: any;
let auth: any;
let adminEmail: string = '';

export const isFirebaseConfigured = () => {
    const storedConfig = localStorage.getItem('firebaseConfig');
    return !!storedConfig;
};

export const initializeFirebase = (config?: FirebaseConfig) => {
    if (!config) {
        const stored = localStorage.getItem('firebaseConfig');
        if (stored) {
            config = JSON.parse(stored);
        } else {
            return false;
        }
    }

    // Validate config
    if (!config || !config.apiKey || !config.authDomain || !config.projectId) {
        throw new Error("Invalid Firebase Configuration: Missing required fields (apiKey, authDomain, projectId).");
    }

    localStorage.setItem('firebaseConfig', JSON.stringify(config));

    if (config.adminEmail) {
        adminEmail = config.adminEmail;
    }

    if (!getApps().length) {
        app = initializeApp(config as any);
    } else {
        app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    return true;
};

export const getAuthInstance = () => auth;

export const login = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const register = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    // Initialize user profile with 20 credits
    await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        credits: 20
    });
    return userCredential;
};

export const logout = async () => {
    await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            uid,
            email: data.email,
            credits: data.credits || 0,
            isAdmin: data.email === adminEmail
        };
    } else {
        // Create if doesn't exist (fallback)
        await setDoc(doc(db, "users", uid), { email: auth.currentUser?.email, credits: 20 });
        return { uid, email: auth.currentUser?.email || '', credits: 20, isAdmin: auth.currentUser?.email === adminEmail };
    }
};

export const deductCredits = async (uid: string, amount: number) => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
        credits: increment(-amount)
    });
};

export const addCreditsByEmail = async (targetEmail: string, amount: number) => {
    // Find user by email
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