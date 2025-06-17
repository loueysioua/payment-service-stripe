import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/types/api/responses.types";
import { NextResponse } from "next/server";

export class ApiResponseBuilder {
  static success<T>(
    data: T,
    message?: string
  ): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      message,
    });
  }

  static error(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code,
          details,
        },
      },
      { status: statusCode }
    );
  }

  static redirect(url: string): NextResponse {
    return NextResponse.redirect(url, 303);
  }
}
