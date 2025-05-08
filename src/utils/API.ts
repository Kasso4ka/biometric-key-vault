interface WalletDataResponse {
  id: number;
  address: string;
  helperData: string;
}

export async function saveWalletData(
  address: string,
  helperData: string
): Promise<boolean> {
  try {
    const response = await fetch("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address, helperData }),
    });

    if (!response.ok) {
      console.error("Error saving data:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error while requesting API:", error);
    return false;
  }
}

export async function getWalletData(
  address: string
): Promise<WalletDataResponse | null> {
  try {
    const response = await fetch(`/api?address=${encodeURIComponent(address)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error("Error while getting data:", await response.text());
      return null;
    }

    const data = (await response.json()) as WalletDataResponse;
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error while requesting API:", error);
    return null;
  }
}
