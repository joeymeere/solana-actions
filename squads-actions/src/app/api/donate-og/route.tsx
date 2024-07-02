//@ts-nocheck
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import * as multisig from "@sqds/multisig";
import { Connection, PublicKey } from "@solana/web3.js";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // ?squad=<msAddress>
  const hasSquad = searchParams.has("squad");
  const squad = hasSquad
    ? searchParams.get("squad")
    : "3MyUSvyqpkJ8dYcYyoAbakbcf7G6y1fCrs3Yosnk9VhS";

  const hasMint = searchParams.has("mint");
  const mint = hasMint ? searchParams.get("mint") : "USDC";

  const vault = multisig.getVaultPda({
    multisigPda: new PublicKey(squad!),
    index: 0,
  });

  const multisigInfo = await fetch(
    `https://v4-api.squads.so/multisig/${vault[0].toString()}`,
  ).then((res) => res.json());

  const meta = multisigInfo.metadata;

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
                  backgroundColor: "#A9A9A9",
                  backgroundSize: "100% 100%",
                  borderRadius: "25px",
                }}
                tw="flex flex-col items-center p-4 w-48 h-32 shadow-lg"
              >
                <p style={{}} tw="font-bold text-white text-3xl">
                  {proposalInfo.approved.length}
                </p>
                <p style={{}} tw="text-base text-zinc-100">
                  Approved
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#A9A9A9",
                  backgroundSize: "100% 100%",
                  borderRadius: "25px",
                }}
                tw="ml-4 flex flex-col items-center p-4 w-48 h-32 shadow-lg"
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
                  tw="text-base text-zinc-100"
                >
                  Threshold
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#A9A9A9",
                  backgroundSize: "100% 100%",
                  borderRadius: "25px",
                }}
                tw="ml-4 flex flex-col items-center p-4 w-48 h-32 shadow-lg"
              >
                <p style={{}} tw="font-bold text-white text-3xl">
                  {mint}
                </p>
                <p style={{}} tw="text-base text-zinc-100">
                  Mint
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
