import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, helperData } = body;

    const wallet = await prisma.helperData.upsert({
      where: { address },
      update: { helperData },
      create: { address, helperData },
    });

    return NextResponse.json(wallet, { status: 200 });
  } catch (error) {
    console.error("Error saving wallet:", error);
    return NextResponse.json(
      { error: "Failed to save wallet data" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address not specified" },
        { status: 400 }
      );
    }

    const wallet = await prisma.helperData.findUnique({
      where: { address },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json(wallet, { status: 200 });
  } catch (error) {
    console.error("Error retrieving wallet data:", error);
    return NextResponse.json(
      { error: "Failed to get wallet data" },
      { status: 500 }
    );
  }
}
