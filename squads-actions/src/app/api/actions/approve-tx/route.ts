import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
//@ts-ignore
import * as multisig from "@sqds/multisig";

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    // This needs to be the Squads multisig address
    const { squad, transactionIndex } = await validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/approve-tx?squad=${squad}&tx=${transactionIndex}`,
      requestUrl.origin,
    ).toString();

    const imageUrl = new URL(
      `/api/og?squad=${squad}&tx=${transactionIndex}`,
      requestUrl.origin,
    ).toString();

    const vault = multisig.getVaultPda({
      multisigPda: new PublicKey(squad!),
      index: 0,
    });
  
    const multisigInfo = await fetch(
      `https://v4-api.squads.so/multisig/${vault[0].toString()}`,
    ).then((res) => res.json());
  
    const meta = multisigInfo.metadata;

    const payload: ActionGetResponse = {
      title: `Approve ${meta.name} Squads Transaction`,
      icon: imageUrl,
      description: `Cast your vote on transaction #${transactionIndex} for ${meta.name}.`,
      label: "SquadsTransaction", // this value will be ignored since `links.actions` exists
      links: {
        actions: [
          {
            label: "Approve",
            href: `${baseHref}&action=${"Approve"}`,
          },
          {
            label: "Reject",
            href: `${baseHref}&action=${"Reject"}`,
          },
          {
            label: "Approve & Execute",
            href: `${baseHref}&action=${"ApproveExecute"}`,
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

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    let { squad, transactionIndex, action } = await validatedQueryParams(
      requestUrl,
    );

    const body: ActionPostRequest = await req.json();

    // validate the client provided input
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"),
    );

    const vault = multisig.getVaultPda({
      multisigPda: new PublicKey(squad!),
      index: 0,
    });
  
    const multisigInfo = await fetch(
      `https://v4-api.squads.so/multisig/${vault[0].toString()}`,
    ).then((res) => res.json());

    const meta = multisigInfo.metadata;

    const transaction = new Transaction();
    transaction.feePayer = account;

    if (action == "Approve") {
      transaction.add(
        await multisig.instructions.proposalApprove({
          multisigPda: squad,
          transactionIndex: BigInt(transactionIndex),
          member: account,
          programId: multisig.PROGRAM_ID,
        }),
      );
    } else if (action === "Reject") {
      transaction.add(
        await multisig.instructions.proposalReject({
          multisigPda: squad,
          transactionIndex: BigInt(transactionIndex),
          member: account,
          programId: multisig.PROGRAM_ID,
        }),
      );
    } else if (action == "ApproveExecute") {
      transaction.add(
        await multisig.instructions.proposalApprove({
          multisigPda: squad,
          transactionIndex: BigInt(transactionIndex),
          member: account,
          programId: multisig.PROGRAM_ID,
        }),
        (
          await multisig.instructions.vaultTransactionExecute({
            connection,
            multisigPda: squad,
            transactionIndex: BigInt(transactionIndex),
            member: account,
            programId: multisig.PROGRAM_ID
          })
        ).instruction,
      );
    } else {
      return new Response("No supported action was selected", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `${
          action === "Approve"
            ? "Approved"
            : action === "Reject"
            ? "Rejected"
            : "Approved and executed"
        } transaction #${transactionIndex} for ${meta.name}`,
      },
      // note: no additional signers are needed
      // signers: [],
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
  const connection = new Connection(
    process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"),
  );
  let squad: PublicKey = new PublicKey(
    "HFwi9HgNtFcMwNJPHa1czrPhuxeZFZ7G9tPQ1LqAd7sy",
  );
  let action: string | null = requestUrl.searchParams.get("action");
  let transactionIndex = 1;

  try {
    if (requestUrl.searchParams.get("squad")) {
      squad = new PublicKey(requestUrl.searchParams.get("squad")!);
    }
  } catch (err) {
    throw err;
  }

  const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    squad,
  );

  transactionIndex = Number(multisigInfo.transactionIndex);

  try {
    if (requestUrl.searchParams.get("tx")) {
      transactionIndex = Number(requestUrl.searchParams.get("tx")!);
    }
  } catch (err) {
    throw err;
  }

  return {
    squad,
    transactionIndex,
    action,
  };
}
