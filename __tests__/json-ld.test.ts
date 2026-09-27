import { jsonLdScript } from "@/lib/json-ld";

describe("jsonLdScript", () => {
  it("produces valid JSON that round-trips", () => {
    const data = { "@type": "Program", name: "Nursing", years: 3 };
    expect(JSON.parse(jsonLdScript(data))).toEqual(data);
  });

  it("neutralises a </script> break-out attempt in CMS text", () => {
    const malicious = {
      name: "Nursing</script><img src=x onerror=alert(1)>",
    };
    const out = jsonLdScript(malicious);

    // The literal closing tag must not survive — that's the whole point.
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    // ...but the value is preserved once parsed.
    expect(JSON.parse(out).name).toBe(malicious.name);
  });

  it("escapes angle brackets and ampersands", () => {
    const out = jsonLdScript({ v: "<>&" });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out).v).toBe("<>&");
  });

  it("escapes U+2028 / U+2029 line separators", () => {
    const value = ["a", "b"].join(String.fromCharCode(0x2028));
    const out = jsonLdScript({ v: value });

    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(out).v).toBe(value);
  });
});
