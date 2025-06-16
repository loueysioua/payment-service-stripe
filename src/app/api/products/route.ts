import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { products } from "@/data/mocked-product";

export async function GET() {
  try {
    const stripeProducts = products.map(async (product) => {
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        images: [product.image],
        id: product.id,
      });
      console.log(
        "-------------------------------CREATED PRODUCT-----------------------------N",
        stripeProduct
      );
      const price = await stripe.prices.create({
        unit_amount: product.price * 100,
        currency: "eur",
        product: stripeProduct.id,
        recurring: {
          interval: "month",
        },
      });
      product.priceId = price.id;
      console.log(
        "-------------------------------CREATED PRICE-----------------------------N",
        price
      );
      return product;
    });
    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json(err);
  }
}
