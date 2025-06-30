import { auth } from "../firebase";

export async function getAuthToken() {
  // Try JWT from localStorage (email/password login)
  let token = localStorage.getItem("token");
  if (token) return token;

  // Try Firebase token (Google login)
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }

  return null;
} 