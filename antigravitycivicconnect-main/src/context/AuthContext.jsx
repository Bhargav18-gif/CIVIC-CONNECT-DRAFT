import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../firebase.js";
import { doc, setDoc } from "firebase/firestore";

export function isDepartmentRole(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "department" || r === "department_head" || r === "department_supervisor" || r === "department_user";
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        
        let role = "citizen";
        let userDocData = {};
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            userDocData = userDoc.data();
            if (userDocData.role) {
              role = userDocData.role;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch user role:", e);
        }

        const currentUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || userDocData.name || firebaseUser.email?.split("@")[0],
          email: firebaseUser.email,
          photo: firebaseUser.photoURL,
          role: role,
          departmentId: userDocData.departmentId || null,
          departmentName: userDocData.departmentName || null,
          allowedDepartmentIds: userDocData.allowedDepartmentIds || (userDocData.departmentId ? [userDocData.departmentId] : []),
          departmentStatus: userDocData.departmentStatus || "active",
          active: userDocData.active !== false,
        };

        localStorage.setItem("cc_token", token);
        localStorage.setItem("cc_user", JSON.stringify(currentUser));
        setUser(currentUser);
      } else {
        localStorage.removeItem("cc_token");
        localStorage.removeItem("cc_user");
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email, password) => {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const normalizedEmail = email.trim().toLowerCase();
      const DEMO_EMAILS = ["admin@civicconnect.com", "roads@civicconnect.com", "engineer@civicconnect.com"];
      
      if (DEMO_EMAILS.includes(normalizedEmail)) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          
          let initialRole = "citizen";
          let extraData = {};
          if (normalizedEmail === "admin@civicconnect.com") initialRole = "admin";
          if (normalizedEmail === "roads@civicconnect.com") {
            initialRole = "department_supervisor";
            extraData = {
              departmentId: "Roads",
              departmentName: "Roads & Bridges Department",
              allowedDepartmentIds: ["Roads", "Drainage"],
              departmentStatus: "active",
            };
          }
          if (normalizedEmail === "engineer@civicconnect.com") initialRole = "engineer";
          
          try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "users", userCredential.user.uid), {
              id: userCredential.user.uid,
              name: normalizedEmail.split('@')[0],
              email: normalizedEmail,
              role: initialRole,
              ...extraData,
              joinedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.warn("Failed to create demo user doc:", e);
          }
        } catch (createErr) {
          if (createErr.code === 'auth/operation-not-allowed') {
            throw new Error("Email/Password authentication is disabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
          }
          if (createErr.code === 'auth/email-already-in-use') {
             throw new Error("Incorrect password for this demo account. Please use the exact password shown.");
          }
          throw createErr;
        }
      } else {
        throw err;
      }
    }

    const firebaseUser = userCredential.user;
    const token = await firebaseUser.getIdToken();
    let role = "citizen";
    let userDocData = {};
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        userDocData = userDoc.data();
        if (userDocData.role) {
          role = userDocData.role;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch user role:", e);
    }

    // Ensure demo account has its department info if missing
    if (firebaseUser.email?.toLowerCase() === "roads@civicconnect.com" && !userDocData.departmentId) {
      userDocData.departmentId = "Roads";
      userDocData.departmentName = "Roads & Bridges Department";
      userDocData.allowedDepartmentIds = ["Roads", "Drainage"];
      userDocData.role = userDocData.role || "department_supervisor";
      role = userDocData.role;
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "users", firebaseUser.uid), {
          departmentId: "Roads",
          departmentName: "Roads & Bridges Department",
          allowedDepartmentIds: ["Roads", "Drainage"],
          role: "department_supervisor",
        }, { merge: true });
      } catch (e) {
        console.warn("Failed to set demo department doc:", e);
      }
    }

    const currentUser = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || userDocData.name || email.split('@')[0],
      email: firebaseUser.email,
      photo: firebaseUser.photoURL,
      role: role,
      departmentId: userDocData.departmentId || null,
      departmentName: userDocData.departmentName || null,
      allowedDepartmentIds: userDocData.allowedDepartmentIds || (userDocData.departmentId ? [userDocData.departmentId] : []),
      departmentStatus: userDocData.departmentStatus || "active",
      active: userDocData.active !== false,
    };

    localStorage.setItem("cc_token", token);
    localStorage.setItem("cc_user", JSON.stringify(currentUser));
    setUser(currentUser);

    try {
      await setDoc(doc(db, "users", firebaseUser.uid), {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email,
        photo: firebaseUser.photoURL || null,
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to sync user to Firestore:", e);
    }

    return currentUser;
  }, []);

  const register = useCallback(async (payload) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      payload.email,
      payload.password
    );
    const firebaseUser = userCredential.user;

    if (payload.name) {
      await updateProfile(firebaseUser, { displayName: payload.name });
    }

    await sendEmailVerification(firebaseUser);
    const token = await firebaseUser.getIdToken();
    const currentUser = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName,
      email: firebaseUser.email,
      photo: firebaseUser.photoURL,
      role: "citizen",
    };

    localStorage.setItem("cc_token", token);
    localStorage.setItem("cc_user", JSON.stringify(currentUser));
    setUser(currentUser);

    try {
      await setDoc(doc(db, "users", firebaseUser.uid), {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || payload.name || payload.email.split('@')[0],
        email: firebaseUser.email,
        photo: firebaseUser.photoURL || null,
        role: "citizen",
        joinedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to sync user to Firestore:", e);
    }

    return currentUser;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const updatedUser = {
          id: auth.currentUser.uid,
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || data.name || auth.currentUser.email?.split("@")[0],
          email: auth.currentUser.email,
          photo: auth.currentUser.photoURL || data.photo,
          role: data.role || "citizen",
          departmentId: data.departmentId || null,
          departmentName: data.departmentName || null,
          allowedDepartmentIds: data.allowedDepartmentIds || (data.departmentId ? [data.departmentId] : []),
          departmentStatus: data.departmentStatus || "active",
          active: data.active !== false,
        };
        localStorage.setItem("cc_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }
    } catch (e) {
      console.warn("Failed to refresh user profile:", e);
    }
    return null;
  }, []);

  const updateUserDepartment = useCallback(async (newDeptId, newDeptName) => {
    if (!auth.currentUser) return;
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const now = new Date().toISOString();
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        departmentId: newDeptId,
        departmentName: newDeptName || newDeptId,
        departmentAssignedAt: now,
        updatedAt: now,
      }, { merge: true });

      const updatedUser = {
        ...(user || {}),
        id: auth.currentUser.uid,
        uid: auth.currentUser.uid,
        departmentId: newDeptId,
        departmentName: newDeptName || newDeptId,
      };
      localStorage.setItem("cc_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (e) {
      console.warn("Failed to update user department:", e);
      throw e;
    }
  }, [user]);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    localStorage.removeItem("cc_active_dept");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
    loginAsDemoSupervisor,
    loginAsDemoEngineer,
        register,
        forgotPassword,
        logout,
        refreshUserProfile,
        updateUserDepartment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
