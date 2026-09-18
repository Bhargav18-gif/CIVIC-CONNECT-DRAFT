import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    console.log("SUCCESS:", result.user);

    return result.user;
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error(error);

    const friendlyMessage =
      error.code === "auth/unauthorized-domain"
        ? "Google login is not authorized for this domain. Add your domain to Firebase Authentication authorized domains."
        : error.message || "Google login failed. Please try again.";

    alert(friendlyMessage);

    return null;
  }
}