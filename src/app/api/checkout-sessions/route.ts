import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { user } from "@/data/mocked-user";

// Define the expected request body interface
interface RequestBody {
  priceId: string; // Changed to priceId for clarity
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    //get payment data : quantity + price
    const formData = await req.formData();
    const priceId = formData.get("priceId") as string;
    const quantity = parseInt(formData.get("quantity") as string);

    // check for payment data
    if (!priceId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Missing or invalid priceId or quantity" },
        { status: 400 }
      );
    }
    // Validate the price exists and is active
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) {
      return NextResponse.json(
        { error: "Price is not active" },
        { status: 400 }
      );
    }

    // Get the origin for success/cancel URLs
    const headersList = await headers();
    const origin = headersList.get("origin");

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId, // Use the validated priceId
          quantity: Math.floor(quantity), // Ensure quantity is an integer
        },
      ],
      mode: "payment",

      //url to success page : sent to stripe
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,

      //url to cancel page sent to stripe
      cancel_url: `${origin}/?canceled=true`,

      //metadata to be retrieved after payment with stripe (for example to get update the user)
      metadata: {
        userId: user.id,
        creditsBought: quantity * price.unit_amount!,
        type: "credit_purchase",
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session URL" },
        { status: 500 }
      );
    }

    //redirection to success or cancel page
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
