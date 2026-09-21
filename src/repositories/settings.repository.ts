import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class SettingsRepository {
  async findMany() {
    return prisma.appSetting.findMany({ where: { NOT: { key: { startsWith: "private:" } } }, orderBy: { key: "asc" } });
  }

  async upsert(key: string, value: Prisma.InputJsonValue) {
    if (key.startsWith("private:")) throw new Error("FORBIDDEN");
    return prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
