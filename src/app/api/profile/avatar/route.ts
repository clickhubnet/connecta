import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireCurrentUser } from "@/lib/auth-context";
import { authErrorResponse } from "@/lib/api-errors";
import { successResponse, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) return NextResponse.json(errorResponse("Escolha uma imagem de até 5 MB."), { status: 413 });
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return NextResponse.json(errorResponse("Escolha uma imagem de até 5 MB."), { status: 422 });
    let image: Buffer;
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(input, { limitInputPixels: 25000000 }).metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Formato inválido");
      image = await sharp(input, { limitInputPixels: 25000000 }).rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    } catch {
      return NextResponse.json(errorResponse("Imagem inválida. Utilize JPG, PNG ou WebP."), { status: 422 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: `data:image/webp;base64,${image.toString("base64")}` } });
    return NextResponse.json(successResponse("Foto de perfil atualizada.", null));
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json(errorResponse("Não foi possível salvar a foto."), { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser();
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
    return NextResponse.json(successResponse("Foto removida.", null));
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json(errorResponse("Não foi possível remover a foto."), { status: 500 });
  }
}
