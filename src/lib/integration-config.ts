import { prisma } from "@/lib/prisma";

const settingKeys = [
  "openAiApiKey",
  "openAiModel",
] as const;

type SettingKey = (typeof settingKeys)[number];

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function getSettingsMap() {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: [...settingKeys] } },
  });

  return new Map(settings.map((setting) => [setting.key as SettingKey, stringValue(setting.value)]));
}

export async function getOpenAiRuntimeConfig() {
  const settings = await getSettingsMap();
  return {
    apiKey: settings.get("openAiApiKey") || process.env.OPENAI_API_KEY || "",
    model: settings.get("openAiModel") || process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}
