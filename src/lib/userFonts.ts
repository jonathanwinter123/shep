import type { ImportedFont } from "./types";
import { importFont, listImportedFonts, readImportedFont } from "./tauri";

let importedFontsCache: ImportedFont[] | null = null;
const loadedFamilies = new Set<string>();

export async function getImportedFonts(forceRefresh = false): Promise<ImportedFont[]> {
  if (!forceRefresh && importedFontsCache) {
    return importedFontsCache;
  }

  const fonts = await listImportedFonts();
  importedFontsCache = fonts;
  return fonts;
}

export async function importUserFont(sourcePath: string): Promise<ImportedFont> {
  const imported = await importFont(sourcePath);
  importedFontsCache = importedFontsCache ? [...importedFontsCache, imported] : [imported];
  return imported;
}

export async function ensureUserFontLoaded(fontFamily: string): Promise<boolean> {
  const importedFont = (await getImportedFonts()).find((font) => font.family === fontFamily);
  if (!importedFont) {
    return false;
  }

  if (loadedFamilies.has(fontFamily)) {
    return true;
  }

  const bytes = new Uint8Array(await readImportedFont(importedFont.id));
  const font = new FontFace(importedFont.family, bytes);
  await font.load();
  document.fonts.add(font);
  loadedFamilies.add(importedFont.family);
  await document.fonts.ready;
  return true;
}
