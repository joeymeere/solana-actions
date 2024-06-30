//@ts-nocheck
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import * as multisig from "@sqds/multisig";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  // ?squad=<msAddress>
  const hasSquad = searchParams.has("squad");
  const squad = hasSquad
    ? searchParams.get("squad")
    : "3MyUSvyqpkJ8dYcYyoAbakbcf7G6y1fCrs3Yosnk9VhS";

  const hasIndex = searchParams.has("tx");
  const index = hasIndex ? searchParams.get("tx") : "1";

  console.log(squad, index, BigInt(Number(index)));

  const vault = multisig.getVaultPda({
    multisigPda: new PublicKey(squad!),
    index: 0,
  });

  const multisigInfo = await fetch(
    `https://v4-api.squads.so/multisig/${vault[0].toString()}`,
  ).then((res) => res.json());

  const meta = multisigInfo.metadata;

  /*
  const [proposal, bump] = multisig.getProposalPda({
    multisigPda: new PublicKey(vault!),
    transactionIndex: BigInt(Number(index)),
    programId: multisig.PROGRAM_ID
  });
  */

  const [proposal, bump] = await PublicKey.findProgramAddressSync(
    [
        Buffer.from("multisig"),
        new PublicKey(squad!).toBuffer(),
        Buffer.from("transaction"),
        new anchor.BN(parseInt(index!)).toArrayLike(Buffer, "le", 8),
        Buffer.from("proposal")
    ],
    multisig.PROGRAM_ID
  );

  const transactionInfo = await multisig.accounts.Proposal.fromAccountAddress(
    connection,
    proposal,
  )!;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: "25px",
          paddingRight: "25px",
          backgroundColor: "white",
          backgroundImage: "url('https://i.imgur.com/mPsva6r.png')",
        }}
      >
        <div tw="flex flex-col w-3/4">
          <div tw="flex flex-col justify-between">
            <img src={meta.image} tw="w-24 h-24 rounded-full" />
            <h2
              style={{}}
              tw="text-5xl font-bold tracking-tight text-black text-left"
            >
              <span>{meta.name}</span>
            </h2>
            <div tw="mt-4 flex">
              <div
                style={{
                  background: "url('https://i.imgur.com/NbwCUm7.png')",
                  backgroundSize: "100% 100%",
                }}
                tw="flex flex-col items-center p-4 w-48 h-32"
              >
                <p style={{}} tw="font-bold text-white text-3xl">
                  {multisigInfo.account.threshold +
                    "/" +
                    multisigInfo.account.members.length}
                </p>
                <p
                  style={{
                    fontFamily: "Neue-Light",
                  }}
                  tw="text-base text-zinc-300"
                >
                  Threshold
                </p>
              </div>
              <div
                style={{
                  background: "url('https://i.imgur.com/NbwCUm7.png')",
                  backgroundSize: "100% 100%",
                }}
                tw="ml-4 flex flex-col items-center p-4 w-48 h-32"
              >
                <p style={{}} tw="font-bold text-white text-3xl">
                  {multisigInfo.account.transactionIndex}
                </p>
                <p style={{}} tw="text-base text-zinc-300">
                  Transactions
                </p>
              </div>
              <div
                style={{
                  background: "url('https://i.imgur.com/NbwCUm7.png')",
                  backgroundSize: "100% 100%",
                }}
                tw="ml-4 flex flex-col items-center p-4 w-48 h-32"
              >
                <p style={{}} tw="font-bold text-white text-3xl">
                  {transactionInfo.status.__kind}
                </p>
                <p style={{}} tw="text-base text-zinc-300">
                  Status
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 900,
      height: 900,
    },
  );
};
