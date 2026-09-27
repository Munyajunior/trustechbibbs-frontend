import { deepMerge, type MessageTree } from "@/i18n/deep-merge";
import { localizedField, pickLocalized } from "@/lib/i18n-field";

describe("deepMerge (English fallback)", () => {
  const en: MessageTree = {
    common: { apply: "Apply now", close: "Close" },
    home: { hero: { title: "Build", subtitle: "Sub" } },
  };

  it("overlays translated strings", () => {
    const fr: MessageTree = { common: { apply: "Postuler", close: "Fermer" } };
    const merged = deepMerge(en, fr);
    expect((merged.common as MessageTree).apply).toBe("Postuler");
  });

  it("falls back to English for keys missing at depth", () => {
    // `common.close` and all of `home.hero.subtitle` are untranslated.
    const fr: MessageTree = {
      common: { apply: "Postuler" },
      home: { hero: { title: "Construire" } },
    };
    const merged = deepMerge(en, fr);

    expect((merged.common as MessageTree).close).toBe("Close");
    const hero = (merged.home as MessageTree).hero as MessageTree;
    expect(hero.title).toBe("Construire");
    // This is the case a shallow spread would drop.
    expect(hero.subtitle).toBe("Sub");
  });

  it("treats a blank translation as untranslated", () => {
    const merged = deepMerge(en, { common: { apply: "   " } });
    expect((merged.common as MessageTree).apply).toBe("Apply now");
  });

  it("does not mutate the base catalogue", () => {
    deepMerge(en, { common: { apply: "Postuler" } });
    expect((en.common as MessageTree).apply).toBe("Apply now");
  });
});

describe("pickLocalized", () => {
  it("prefers French when present", () => {
    expect(pickLocalized("Nursing", "Soins infirmiers", "fr")).toBe(
      "Soins infirmiers",
    );
  });

  it("falls back to English when French is null or blank", () => {
    expect(pickLocalized("Nursing", null, "fr")).toBe("Nursing");
    expect(pickLocalized("Nursing", "  ", "fr")).toBe("Nursing");
  });

  it("ignores French when the locale is English", () => {
    expect(pickLocalized("Nursing", "Soins infirmiers", "en")).toBe("Nursing");
  });
});

describe("localizedField", () => {
  const program = {
    name_en: "Nursing",
    name_fr: "Soins infirmiers",
    description_en: "English description",
    description_fr: null,
  };

  it("resolves the pair for the active locale", () => {
    expect(localizedField(program, "name", "fr")).toBe("Soins infirmiers");
    expect(localizedField(program, "name", "en")).toBe("Nursing");
  });

  it("falls back to English when the French column is null", () => {
    expect(localizedField(program, "description", "fr")).toBe(
      "English description",
    );
  });
});
