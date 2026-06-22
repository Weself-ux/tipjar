// Arc Testnet Configuration — Frontend
// CRITICAL: USDC is the gas token on Arc, NOT ETH

export const ARC_TESTNET = {
  chainId: "0x4CEF52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

export const ARC_EXPLORER = "https://testnet.arcscan.app";

// Connect MetaMask and switch to Arc Testnet
export async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainId }],
    });
  } catch (switchError) {
    // Chain not added yet, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ARC_TESTNET],
      });
    } else {
      throw switchError;
    }
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0];
}

// Send USDC (native gas token) on Arc Testnet
export async function sendUsdc(toAddress, amountUsdc) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found.");
  }

  // Convert USDC amount to wei (18 decimals)
  const parts = amountUsdc.toString().split(".");
  const whole = parts[0] || "0";
  const decimal = (parts[1] || "").padEnd(18, "0").slice(0, 18);
  const weiStr = whole + decimal;
  // Remove leading zeros but keep at least one digit
  const trimmed = weiStr.replace(/^0+/, "") || "0";
  const weiHex = "0x" + BigInt(trimmed).toString(16);

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet connected.");
  }

  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: accounts[0],
        to: toAddress,
        value: weiHex,
      },
    ],
  });

  return txHash;
}

// Send USDC directly using a stored private key (for Tip Jar-generated wallets)
// No MetaMask needed — signs and broadcasts using ethers.js against Arc Testnet RPC.
export async function sendUsdcFromPrivateKey(privateKey, toAddress, amountUsdc) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET.rpcUrls[0]);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountUsdc.toString()),
  });
  return tx.hash;
}

// Format address for display
export function formatAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Format wei to USDC display
export function weiToUsdc(weiValue) {
  if (!weiValue) return "0.00";
  const wei = BigInt(weiValue);
  const whole = wei / BigInt(10 ** 18);
  const fraction = wei % BigInt(10 ** 18);
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fractionStr}`;
}
