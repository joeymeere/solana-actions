import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import {
  Authorized,
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
//@ts-ignore
import * as multisig from "@sqds/multisig";
import * as spl from "@solana/spl-token";
import { getMintAddress } from "./utils";

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { squad, mint } = await validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/donate?squad=${squad.toString()}&mint=${mint}`,
      requestUrl.origin,
    ).toString();

    const imageUrl = new URL(
      `/api/donate-og?squad=${squad}&mint=${mint}`,
      requestUrl.origin,
    ).toString();

    const [vault, bump] = multisig.getVaultPda({
      multisigPda: new PublicKey(squad!),
      index: 0,
    });

    const multisigInfo = await fetch(
      `https://v4-api.squads.so/multisig/${vault.toString()}`,
    ).then((res) => res.json());

    const meta = multisigInfo.metadata;

    const payload: ActionGetResponse = {
      title: `Donate ${mint} to ${meta.name}`,
      icon: imageUrl,
      description: `Make a donation in ${mint} to ${meta.name} on Squads.`,
      label: "Donate",
      links: {
        actions: [
          {
            label: `Send ${mint}`,
            href: `${baseHref}&amount={amount}`,
            parameters: [
              {
                name: "amount",
                label: `Enter the amount of ${mint} to send`,
                required: true,
              },
            ],
          },
        ],
      },
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { squad, mint, amount } = await validatedQueryParams(requestUrl);

    const mintAddress = getMintAddress(mint);
    const mintAddressKey = new PublicKey(mintAddress!);

    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const [vault, bump] = multisig.getVaultPda({
      multisigPda: new PublicKey(squad!),
      index: 0,
    });

    const multisigInfo = await fetch(
      `https://v4-api.squads.so/multisig/${vault.toString()}`,
    ).then((res) => res.json());

    const meta = multisigInfo.metadata;

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"),
    );

    const transaction = new Transaction();

    if (mintAddress == null) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: account,
          toPubkey: vault,
          lamports: amount * LAMPORTS_PER_SOL,
        }),
      );
    } else {
      const sourceTokenAccount = await spl.getAssociatedTokenAddressSync(
        mintAddressKey,
        account,
      );

      const vaultTokenAccount = await spl.getAssociatedTokenAddressSync(
        mintAddressKey,
        vault,
        true
      );

      const tokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);

      if (!tokenAccountInfo || !tokenAccountInfo.data) transaction.add(
        await spl.createAssociatedTokenAccountInstruction(
          account,
          vaultTokenAccount,
          vault,
          mintAddressKey
        )
      );

      transaction.add(
        await spl.createTransferInstruction(
          sourceTokenAccount,
          vaultTokenAccount,
          account,
          amount
        )
      );
    }

    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Sent ${amount} ${mint} to ${meta.name}!`,
      },
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

async function validatedQueryParams(requestUrl: URL) {
  let squad: PublicKey = new PublicKey(
    "HFwi9HgNtFcMwNJPHa1czrPhuxeZFZ7G9tPQ1LqAd7sy",
  );
  let mint = "USDC";
  let amount = 1;

  try {
    if (requestUrl.searchParams.get("squad")) {
      squad = new PublicKey(requestUrl.searchParams.get("squad")!);
    }
  } catch (err) {
    throw err;
  }

  try {
    if (requestUrl.searchParams.get("mint")) {
      mint = requestUrl.searchParams.get("mint")!;
    }
  } catch (err) {
    throw err;
  }

  try {
    if (requestUrl.searchParams.get("amount")) {
      amount = parseFloat(requestUrl.searchParams.get("amount")!);
    }

    if (amount <= 0) throw "amount is too small";
  } catch (err) {
    throw "Invalid input query parameter: amount";
  }

  return {
    squad,
    mint,
    amount
  };
}
