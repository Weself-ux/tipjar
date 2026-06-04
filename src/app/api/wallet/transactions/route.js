import { getTransactions, weiToUsdc } from "@/app/api/utils/arc";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return Response.json(
        { error: "Valid wallet address is required." },
        { status: 400 },
      );
    }

    const transactions = await getTransactions(address, page, limit);

    // Format transactions with USDC amounts (not ETH — USDC is gas on Arc)
    const formatted = transactions.map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueWei: tx.value,
      valueUsdc: weiToUsdc(tx.value),
      timestamp: tx.timeStamp,
      isIncoming: tx.to?.toLowerCase() === address.toLowerCase(),
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
    }));

    return Response.json({ transactions: formatted });
  } catch (err) {
    console.error("Transactions fetch error:", err);
    return Response.json(
      { error: "Could not fetch transactions.", transactions: [] },
      { status: 500 },
    );
  }
}
