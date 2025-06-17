import { products } from "@/data/mocked-product";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/config/stripe";
import { user } from "@/data/mocked-user";
import { InvoiceGenerator } from "@/lib/invoice-generator";

// Define the expected request body interface
interface RequestBody {
  priceId: string; // Changed to priceId for clarity
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    //get payment data : quantity + price
    const formData = await req.formData();
    const paymentMode = formData.get("paymentMode") as
      | "credit-mode"
      | "subscription-mode";
    const productId = formData.get("productId") as string;
    if (!productId || !paymentMode) {
      return NextResponse.json(
        { error: "Missing or invalid information" },
        { status: 400 }
      );
    }

    // Validate the price exists and is active
    const priceList = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
      expand: ["data.product"],
    });

    const price = priceList.data[0];
    let quantity = 0;

    const customerList = await stripe.customers.list({
      email: user.email,
    });

    let customer = customerList.data[0];
    customer &&
      console.log(
        "-----------------------CUSTOMER EXISTS------------------",
        customer
      );
    if (!customer) {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      console.log(
        "-----------------------CUSTOMER CREATED------------------",
        customer
      );
    }

    if (paymentMode === "subscription-mode") {
      const hasActiveSubscription = await checkForActiveSubscription(
        customer.id,
        productId
      );

      if (hasActiveSubscription) {
        return NextResponse.json(
          {
            error: "You already have an active subscription for this product.",
            code: "SUBSCRIPTION_EXISTS",
          },
          { status: 409 } // conflict
        );
      }
    }

    if (paymentMode === "credit-mode") {
      quantity = parseInt(formData.get("quantity") as string);
      // check for payment data
      if (!quantity || quantity < 1) {
        return NextResponse.json(
          { error: "Missing or invalid quantity" },
          { status: 400 }
        );
      }
    }

    // Get the origin for success/cancel URLs
    const headersList = await headers();
    const origin = headersList.get("origin");

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: price.id, // Use the validated priceId
          quantity: paymentMode === "credit-mode" ? Math.floor(quantity) : 1, // Ensure quantity is an integer
        },
      ],
      mode: paymentMode === "credit-mode" ? "payment" : "subscription",

      //url to success page : sent to stripe
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,

      //url to cancel page sent to stripe
      cancel_url: `${origin}/?canceled=true`,

      //metadata to be retrieved after payment with stripe (for example to get update the user)
      metadata: {
        userId: user.id,
        creditsBought:
          paymentMode === "credit-mode"
            ? quantity * price.unit_amount!
            : price.unit_amount,
        type:
          paymentMode === "credit-mode"
            ? "credit_purchase"
            : "subscription_purchase",
        customerId: customer.id,
        quantity: quantity,
        unitPrice: price.unit_amount,
        productId: productId,
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

async function checkForActiveSubscription(
  customerId: string,
  productId: string
): Promise<boolean> {
  try {
    // Get all subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100, // Increase limit to catch all subscriptions
    });

    // Check if any subscription is active for this product
    const activeSubscription = subscriptions.data.find((subscription) => {
      // Check subscription status
      const isActiveStatus = ["active", "trialing", "past_due"].includes(
        subscription.status
      );

      if (!isActiveStatus) return false;

      // Check if subscription contains the product
      return subscription.items.data.some((item) => {
        return item.price.product === productId;
      });
    });

    return !!activeSubscription;
  } catch (error) {
    console.error("Error checking for active subscription:", error);
    // In case of error, be conservative and assume no subscription exists
    // You might want to handle this differently based on your business logic
    return false;
  }
}
