import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const products = await stripe.products.list();
    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json(err);
  }
}
