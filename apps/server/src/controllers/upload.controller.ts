import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";
import type { CreatePresignedRoute } from "@/routes/upload/upload.routes";

import { getPresignedUploadUrl } from "@/services/upload.service";

export const createPresigned: AppRouteHandler<CreatePresignedRoute> = async (
  c,
) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      { status: "error", message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  const body = c.req.valid("json");

  const result = await getPresignedUploadUrl(body, user.id);

  if (!result.success) {
    const status =
      result.errorType === "INTERNAL_ERROR"
        ? HttpStatusCodes.INTERNAL_SERVER_ERROR
        : HttpStatusCodes.BAD_REQUEST;

    return c.json({ status: "error", message: result.error }, status);
  }

  const response: {
    signature: string;
    token: string;
    expire: number;
    publicKey: string;
    key: string;
    imageUrl?: string;
  } = {
    signature: result.data.signature,
    token: result.data.token,
    expire: result.data.expire,
    publicKey: result.data.publicKey,
    key: result.data.key,
  };

  if (result.data.imageUrl) {
    response.imageUrl = result.data.imageUrl;
  }

  return c.json(response, HttpStatusCodes.OK);
};
