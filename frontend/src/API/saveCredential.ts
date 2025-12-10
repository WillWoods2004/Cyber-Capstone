// frontend/src/api/saveCredential.ts

const API_BASE =
  "https://5y6lvgdx08.execute-api.us-east-1.amazonaws.com/prod";

export async function saveCredentialToCloud(
  userId: string,
  credentialId: string,
  username: string,
  password: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        credentialId,
        username,
        password,
      }),
    });

    if (!response.ok) {
      console.error("AWS save failed:", await response.text());
      return false;
    }

    const data = await response.json().catch(() => ({} as any));

    if (!data.success) {
      console.error("Cloud save returned success=false", data);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Network error saving credential:", err);
    return false;
  }
}
