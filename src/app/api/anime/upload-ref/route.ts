import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/workspace/require-auth";
import { isVidmorConfigured } from "@/lib/vidmor/config";
import { uploadImageBlob } from "@/lib/vidmor/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const auth = await requireAuth(request, "workspace:read");
  if (auth.response) {
    return auth.response;
  }

  try {
    if (!isVidmorConfigured()) {
      return NextResponse.json({ error: "未配置 Vidmor" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG / PNG / WEBP" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "图片不能超过 10MB" }, { status: 400 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const url = await uploadImageBlob(file, `character-ref.${extension}`);

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 },
    );
  }
}
