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

  const [proposal, bump] = await PublicKey.findProgramAddressSync(
    [
      Buffer.from("multisig"),
      new PublicKey(squad!).toBuffer(),
      Buffer.from("transaction"),
      new anchor.BN(parseInt(index!)).toArrayLike(Buffer, "le", 8),
      Buffer.from("proposal"),
    ],
    multisig.PROGRAM_ID,
  );

  const proposalInfo = await multisig.accounts.Proposal.fromAccountAddress(
    connection,
    proposal,
  )!;

  const [transaction, txBump] = await PublicKey.findProgramAddressSync(
    [
      Buffer.from("multisig"),
      new PublicKey(squad!).toBuffer(),
      Buffer.from("transaction"),
      new anchor.BN(index!).toArrayLike(Buffer, "le", 8),
    ],
    multisig.PROGRAM_ID,
  );

  const transactionInfo =
    await multisig.accounts.VaultTransaction.fromAccountAddress(
      connection,
      transaction,
    )!;

  const message = transactionInfo.message;
  const creator = transactionInfo.creator.toString();

  const pending = multisigInfo.account.members.filter(
    (x: PublicKey) =>
      !proposalInfo.approved.includes(x) || !proposalInfo.rejected.includes(x),
  );

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
                  {proposalInfo.status.__kind}
                </p>
                <p style={{}} tw="text-base text-zinc-100">
                  Status
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: "#000000",
                backgroundSize: "100% 100%",
                borderRadius: "25px",
              }}
              tw="mt-6 flex justify-between p-4 w-full h-64 shadow-lg"
            >
              <div
                style={{ display: "flex" }}
                tw="flex flex-col h-full justify-between"
              >
                <div 
                style={{ display: "flex" }}
                tw="flex gap-2 items-center mb-0"
                >
                <div
                  style={{ display: "flex", borderRadius: "10px" }}
                  tw="text-blue-500 bg-blue-500/50 p-3 w-fit"
                >
                  <svg
                    viewBox="0 0 18 13"
                    width="18"
                    fill="transparent"
                    stroke-width="1.4"
                    stroke="currentColor"
                  >
                    <path
                      d="M 5.5 3 L 1 6.5 L 5.5 10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                    <path d="M 7 12 L 10.5 1" stroke-linecap="round"></path>
                    <path
                      d="M 4.5 0 L 0 3.5 L 4.5 7"
                      transform="translate(12.5 3) rotate(180 2.25 3.5)"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                </div>
                <p tw="ml-2 text-white text-2xl">Transaction #{index}</p>
                </div>
                <div style={{ display: "flex" }} tw="flex">
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#1E1E20",
                      borderRadius: "25px",
                    }}
                    tw="flex flex-col text-white px-4 pt-0 pb-2 h-36"
                  >
                    <p tw="text-white font-bold mb-0.5">✅ Approved: </p>
                    {proposalInfo.approved.slice(0, 4).map((key, i) => (
                      <p key={i} tw="text-zinc-300 text-sm my-0">
                        •{" "}
                        {key.toString().slice(0, 4) +
                          "..." +
                          key.toString().slice(40, 44)}
                      </p>
                    ))}
                    {proposalInfo.approved.length > 4 ? (
                      <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">
                        No accepts yet
                      </p>
                    ) : null}
                    {proposalInfo.approved.length == 0 ? (
                      <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">
                        + {proposalInfo.approved.length - 4} more
                      </p>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#1E1E20",
                      borderRadius: "25px",
                    }}
                    tw="flex flex-col text-white px-4 pt-0 pb-2 ml-4 h-36"
                  >
                    <p tw="text-white font-bold mb-0.5">❌ Rejected: </p>
                    {proposalInfo.rejected.slice(0, 4).map((key, i) => (
                      <p key={i} tw="text-zinc-300 text-sm my-0">
                        •{" "}
                        {key.toString().slice(0, 4) +
                          "..." +
                          key.toString().slice(40, 44)}
                      </p>
                    ))}
                    {proposalInfo.rejected.length > 4 ? (
                      <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">
                        + {proposalInfo.rejected.length - 4} more
                      </p>
                    ) : null}
                    {proposalInfo.rejected.length == 0 ? (
                      <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">
                        No rejections yet
                      </p>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 0,
                      backgroundColor: "#1E1E20",
                      borderRadius: "25px",
                    }}
                    tw="flex flex-col gap-0 text-white px-4 pt-0 pb-2 ml-4 h-36"
                  >
                    <p tw="text-white font-bold mb-0.5">⏰ Pending: </p>
                    {pending.slice(0, 3).map((member: any, i: number) => (
                      <p key={i} tw="text-zinc-300 text-sm my-0">
                        •{" "}
                        {member.key.toString().slice(0, 4) +
                          "..." +
                          member.key.toString().slice(40, 44)}
                      </p>
                    ))}
                    {pending.length > 3 ? (
                      <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">
                        + {pending.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex" }} tw="flex">
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#1E1E20",
                    backgroundSize: "100% 100%",
                    borderRadius: "25px",
                  }}
                  tw="flex flex-col px-4 py-2 h-full w-42"
                >
                  <div style={{ display: "flex", gap: 0 }} tw="flex flex-col gap-0 text-zinc-200 text-sm w-18">
                    <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1">🧞‍♂️ Creator:</p>
                    <p className="text-zinc-200 text-xs mt-0">
                      {creator.slice(0, 4) + "..." + creator.slice(40, 44)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 0 }} tw="flex-col text-zinc-200 text-sm">
                    <p tw="mt-0.5 mb-0 py-0 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1 w-18">📝 Signers:</p>
                    <p className="text-zinc-200 text-xs mt-0.5">
                      {transactionInfo.message.numSigners}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 0 }} tw="flex flex-col gap-0 text-zinc-200 text-sm">
                    <p tw="mt-0.5 text-zinc-400 text-xs mb-0 bg-[#00000]/25 rounded-[10px] px-1 w-24">💾 Instructions:</p>
                    <p className="text-zinc-200 text-xs mt-0">
                      {transactionInfo.message.instructions.length}
                    </p>
                  </div>
                </div>
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
