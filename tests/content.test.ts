import { describe, expect, it } from "vitest";
import { collectStrings, getContent, isPlaceholder, LOCALES } from "@/lib/content";

function keyShape(node: unknown): unknown {
  if (Array.isArray(node)) return node.length ? [keyShape(node[0]), node.length] : [];
  if (node && typeof node === "object")
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, keyShape(v)]));
  return typeof node;
}

describe("content files", () => {
  it("en and km have identical structure", () => {
    expect(keyShape(getContent("km"))).toEqual(keyShape(getContent("en")));
  });

  it("placeholders use the {{TODO: ...}} form only", () => {
    for (const l of LOCALES) {
      for (const s of collectStrings(getContent(l))) {
        if (s.includes("{{")) expect(isPlaceholder(s)).toBe(true);
      }
    }
  });

  it("never claims a certification as earned", () => {
    for (const l of LOCALES) {
      const items = getContent(l).sections.credentials.items;
      for (const i of items) {
        expect(["planned", "in-progress"].includes(i.status) || isPlaceholder(i.status)).toBe(true);
      }
    }
  });

  it("contains no forbidden strings", () => {
    const joined = LOCALES.flatMap((l) => collectStrings(getContent(l))).join("\n");
    expect(joined).not.toMatch(new RegExp("MO" + "EYS", "i"));
    expect(joined).not.toMatch(new RegExp("Ministry of " + "Education", "i"));
  });

  it("offers only English and Khmer as site languages", () => {
    expect(LOCALES).toEqual(["en", "km"]);
  });
});
