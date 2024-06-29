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

    // This needs to be the Squads vault address
    const { squad, transactionIndex } = validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/approve-tx?squad=${squad}&txIndex=${transactionIndex}`,
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "Approve Squads Transaction",
      icon: new URL("/bun_blink.webp", requestUrl.origin).toString(),
      description: "Cast your vote on a Squads Transaction.",
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
    const { squad, transactionIndex } = validatedQueryParams(requestUrl);

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

    const proposal = multisig.getProposalPda({
      multisigPda: new PublicKey(squad),
      transactionIndex: BigInt(transactionIndex),
    });

    const transaction = new Transaction();
    transaction.feePayer = account;

    if (!proposal) {
      transaction.add(
        await multisig.instructions.proposalCreate({
          multisigPda: squad,
          creator: account,
          transactionIndex: BigInt(transactionIndex),
          isDraft: false,
        })
      );
    }

    transaction.add(
      await multisig.instructions.proposalApprove({
        multisigPda: squad,
        transactionIndex: BigInt(transactionIndex),
        member: account,
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

function validatedQueryParams(requestUrl: URL) {
  let squad: PublicKey = new PublicKey("HFwi9HgNtFcMwNJPHa1czrPhuxeZFZ7G9tPQ1LqAd7sy");
  let transactionIndex = 1;

  try {
    if (requestUrl.searchParams.get("squad")) {
      squad = new PublicKey(requestUrl.searchParams.get("squad")!);
    }
  } catch (err) {
    throw err;
  }

  try {
    if (requestUrl.searchParams.get("txIndex")) {
      transactionIndex = parseInt(requestUrl.searchParams.get("txIndex")!);
    }
  } catch (err) {
    throw "Invalid input query parameter: to";
  }

  return {
    squad,
    transactionIndex,
  };
}
