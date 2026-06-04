// Sponsored Tip via Circle Programmable Wallets
// The platform wallet sends USDC to the creator on Arc Testnet
// on behalf of a tipper who doesn't have USDC on Arc.
// Requires: CIRCLE_API_KEY, CIRCLE_PLATFORM_WALLET_ID env vars.

import sql from "@/app/api/utils/sql";
import { rateLimit, getClientIP } from "@/app/api/utils/auth-helpers";

const CIRCLE_API = "https://api.circle.com/v1/w3s";

async function circleTransfer(toAddress, amountUsdc) {
  const idempotencyKey = crypto.randomUUID();

  const res = await fetch(`${CIRCLE_API}/developer/transactions/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotencyKey,
      walletId: process.env.CIRCLE_PLATFORM_WALLET_ID,
      destinationAddress: toAddress,
      // USDC is the native currency on Arc — amount in USDC
      amounts: [amountUsdc.toString()],
      fee: {
        type: "custom",
        config: {
          maxFee: "0.05",
          priorityFee: "0.001",
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Circle transfer failed");
  }
  return data;
}

export async function action({ request }) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(ip, "sponsored-tip", 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many requests. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { creatorUsername, amountUsdc, message, tipperEmail } = body;

    if (
      !creatorUsername ||
      !amountUsdc ||
      isNaN(amountUsdc) ||
      Number(amountUsdc) <= 0
    ) {
      return Response.json(
        { error: "Missing or invalid fields." },
        { status: 400 },
      );
    }

    if (Number(amountUsdc) > 100) {
      return Response.json(
        { error: "Sponsored tips are limited to 100 USDC." },
        { status: 400 },
      );
    }

    // Check env vars
    if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_PLATFORM_WALLET_ID) {
      return Response.json(
        {
          error: "Sponsored tips are not configured yet. Contact the platform.",
        },
        { status: 503 },
      );
    }

    // Look up creator wallet address
    const rows = await sql(
      "SELECT username, wallet_address FROM users WHERE username = $1",
      [creatorUsername.toLowerCase()],
    );
    if (rows.length === 0) {
      return Response.json({ error: "Creator not found." }, { status: 404 });
    }

    const creator = rows[0];
    if (!creator.wallet_address) {
      return Response.json(
        { error: "Creator has no wallet set up yet." },
        { status: 400 },
      );
    }

    // Execute transfer via Circle
    const transfer = await circleTransfer(
      creator.wallet_address,
      Number(amountUsdc),
    );

    const txHash = transfer?.data?.id || transfer?.id || `circle_${Date.now()}`;

    // Record in database
    await sql(
      `INSERT INTO tips (creator_username, creator_address, tipper_address, amount, amount_usdc, message, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        creatorUsername.toLowerCase(),
        creator.wallet_address,
        tipperEmail || "sponsored",
        amountUsdc.toString(),
        Number(amountUsdc),
        message || null,
        txHash,
      ],
    );

    return Response.json({
      success: true,
      txId: txHash,
      creatorUsername,
      amountUsdc: Number(amountUsdc),
      message: "Tip sent to creator on Arc Testnet via Circle.",
    });
  } catch (err) {
    console.error("Sponsored tip error:", err);
    return Response.json(
      { error: err.message || "Could not process tip." },
      { status: 500 },
    );
  }
}
