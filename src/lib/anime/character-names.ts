import { ANIME_CHARACTERS } from "@/lib/vidmor/config";

export const CHARACTER_NAMES_STORAGE_KEY = "anime-character-names";

export function buildDefaultCharacterNames() {
  return Object.fromEntries(ANIME_CHARACTERS.map((character) => [character.id, character.name]));
}

export function loadStoredCharacterNames(): Record<string, string> {
  if (typeof window === "undefined") {
    return buildDefaultCharacterNames();
  }

  try {
    const raw = window.localStorage.getItem(CHARACTER_NAMES_STORAGE_KEY);
    if (!raw) {
      return buildDefaultCharacterNames();
    }

    return { ...buildDefaultCharacterNames(), ...(JSON.parse(raw) as Record<string, string>) };
  } catch {
    return buildDefaultCharacterNames();
  }
}

export function saveStoredCharacterNames(names: Record<string, string>) {
  window.localStorage.setItem(CHARACTER_NAMES_STORAGE_KEY, JSON.stringify(names));
}

export function resolveCharacterName(characterId: string, customNames?: Record<string, string>) {
  const custom = customNames?.[characterId]?.trim();
  if (custom) {
    return custom;
  }

  return ANIME_CHARACTERS.find((character) => character.id === characterId)?.name ?? characterId;
}
