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
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "Approve Squads Transaction",
      icon: new URL("/squad_blink.jpeg", requestUrl.origin).toString(),
      description: "Cast your vote on a Squads Transaction.",
      label: "SquadsTransaction", // this value will be ignored since `links.actions` exists
      links: {
        actions: [
          {
            label: "Approve",
            href: `${requestUrl.origin}/api/actions/approve-tx?squad=${squad}&tx=${transactionIndex}&action=${"Approve"}`,
          },
          {
            label: "Reject",
            href: `${requestUrl.origin}/api/actions/approve-tx?squad=${squad}&tx=${transactionIndex}&action=${"Reject"}`,
          },
          {
            label: "Approve & Execute",
            href: `${requestUrl.origin}/api/actions/approve-tx?squad=${squad}&tx=${transactionIndex}&action=${"ApproveExecute"}`,
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
    let { squad, transactionIndex } = await validatedQueryParams(requestUrl);

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
      process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta")
    );

    const transaction = new Transaction();
    transaction.feePayer = account;

    transaction.add(
      await multisig.instructions.proposalApprove({
        multisigPda: squad,
        transactionIndex: BigInt(transactionIndex),
        member: account,
        programId: multisig.PROGRAM_ID
      })
    );

    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Vote on transaction ${transactionIndex} for ${squad.toBase58()}`,
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
  const connection = new Connection(process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"));
  let squad: PublicKey = new PublicKey("HFwi9HgNtFcMwNJPHa1czrPhuxeZFZ7G9tPQ1LqAd7sy");
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
    squad
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
  };
}
