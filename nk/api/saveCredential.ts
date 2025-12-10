// frontend/src/api/saveCredential.ts

export async function saveCredentialToCloud(
  userId: string,
  credentialId: string,
  username: string,
  password: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://5y6lvgdx08.execute-api.us-east-1.amazonaws.com/prod/credentials",
      {
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
      }
    );

    if (!response.ok) {
      console.error("AWS save failed:", await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Network error saving credential:", err);
    return false;
  }
}
