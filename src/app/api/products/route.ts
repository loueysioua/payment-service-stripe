// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";
import { products as mockProducts } from "@/data/mocked-product";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/errors/error-handler";

export async function GET() {
  try {
    const productService = ProductService.getInstance();

    //TODO: fetch from database instead
    const enhancedProducts = await Promise.all(
      mockProducts.map(async (product) => {
        if (!product.priceId) {
          // Create product if it doesn't exist
          return await productService.createProduct(product);
        }
        return product;
      })
    );

    return ApiResponseBuilder.success(enhancedProducts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const productData = await request.json();
    const productService = ProductService.getInstance();

    const newProduct = await productService.createProduct(productData);

    return ApiResponseBuilder.success(
      newProduct,
      "Product created successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
