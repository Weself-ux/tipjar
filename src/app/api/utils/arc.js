// Arc Testnet Configuration
// CRITICAL: USDC is the gas token on Arc, NOT ETH
// Never mix native USDC gas with ERC-20 USDC logic

export const ARC_CONFIG = {
  chainId: 5042002,
  chainIdHex: "0x4CEF52",
  chainName: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
};

// Fetch wallet balance from Arc RPC (native USDC, not ETH)
export async function getBalance(address) {
  const response = await fetch(ARC_CONFIG.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Arc RPC error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  // Convert hex wei to decimal string
  const weiHex = data.result;
  const weiBigInt = BigInt(weiHex);
  return weiBigInt.toString();
}

// Convert wei string to human-readable USDC (18 decimals)
export function weiToUsdc(weiString) {
  const wei = BigInt(weiString);
  const whole = wei / BigInt(10 ** 18);
  const fraction = wei % BigInt(10 ** 18);
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${fractionStr}`;
}

// Convert USDC amount to wei hex for transactions
export function usdcToWeiHex(usdcAmount) {
  const parts = usdcAmount.split(".");
  const whole = parts[0] || "0";
  const decimal = (parts[1] || "").padEnd(18, "0").slice(0, 18);
  const weiStr = whole + decimal;
  const wei = BigInt(weiStr);
  return "0x" + wei.toString(16);
}

// Fetch transaction history from Arc Explorer (Blockscout API)
export async function getTransactions(address, page = 1, limit = 20) {
  const url = `${ARC_CONFIG.explorerUrl}/api?module=account&action=txlist&address=${address}&sort=desc&page=${page}&offset=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Explorer API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === "1" && Array.isArray(data.result)) {
    return data.result;
  }
  return [];
}

// Verify a contract/address exists on Arc before trusting it
export async function verifyAddressExists(address) {
  try {
    const response = await fetch(ARC_CONFIG.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await response.json();
    // '0x' means EOA (regular wallet), anything else means contract
    return { exists: true, isContract: data.result !== "0x" };
  } catch {
    return { exists: false, isContract: false };
  }
}
