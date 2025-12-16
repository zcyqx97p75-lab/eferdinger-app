import { API_URL } from "../services";

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  role: "EG_ADMIN" | "ORGANISATOR" | "PACKSTELLE" | "PACKBETRIEB";
}): Promise<any> {
  const res = await fetch(`${API_URL}/admin/users/simple-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Fehler beim Anlegen des Users");
  }

  return res.json();
}

