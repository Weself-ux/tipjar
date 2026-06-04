import { getBalance, weiToUsdc } from "@/app/api/utils/arc";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return Response.json(
        { error: "Valid wallet address is required." },
        { status: 400 },
      );
    }

    const weiBalance = await getBalance(address);
    const usdcBalance = weiToUsdc(weiBalance);

    return Response.json({
      address,
      balanceWei: weiBalance,
      balanceUsdc: usdcBalance,
    });
  } catch (err) {
    console.error("Balance fetch error:", err);
    return Response.json(
      { error: "Could not fetch balance." },
      { status: 500 },
    );
  }
}
