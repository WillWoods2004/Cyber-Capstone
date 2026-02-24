// frontend/src/api/saveCredential.ts

const API_BASE =
  "https://5y6lvgdx08.execute-api.us-east-1.amazonaws.com/prod";

/**
 * Save a credential to the SecurityPassCredentials table in DynamoDB.
 *
 * @param userId        The logged-in SecurityPass username (partition key).
 * @param credentialId  A unique id per credential (e.g., site + timestamp).
 * @param username      The username/email for that site.
 * @param password      The password for that site.
 */
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

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };

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
