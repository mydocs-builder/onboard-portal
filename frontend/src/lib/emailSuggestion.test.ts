import { describe, expect, it } from "vitest";
import { editDistance, suggestEmail } from "./emailSuggestion";

describe("suggestEmail", () => {
  it("corrects the typos named in the requirement", () => {
    expect(suggestEmail("amina@gmial.com")).toBe("amina@gmail.com");
    expect(suggestEmail("amina@gmail.con")).toBe("amina@gmail.com");
    expect(suggestEmail("amina@hotmial.com")).toBe("amina@hotmail.com");
    expect(suggestEmail("amina@yahooo.com")).toBe("amina@yahoo.com");
    expect(suggestEmail("amina@outlok.com")).toBe("amina@outlook.com");
  });

  it("corrects further common slips", () => {
    expect(suggestEmail("amina@gmai.com")).toBe("amina@gmail.com");
    expect(suggestEmail("amina@gmail.co")).toBe("amina@gmail.com");
    expect(suggestEmail("amina@gmail.cmo")).toBe("amina@gmail.com");
    expect(suggestEmail("amina@outlook.dr")).toBe("amina@outlook.de");
    expect(suggestEmail("amina@web.dee")).toBe("amina@web.de");
    expect(suggestEmail("amina@icloud.vom")).toBe("amina@icloud.com");
  });

  it("keeps the part before the @ exactly as typed and ignores case in the domain", () => {
    expect(suggestEmail("  Amina.Rahman+jobs@GMIAL.com ")).toBe("Amina.Rahman+jobs@gmail.com");
  });

  it("stays silent for correctly spelled providers", () => {
    for (const email of ["a@gmail.com", "a@googlemail.com", "a@hotmail.de", "a@yahoo.co.uk", "a@gmx.net", "a@web.de", "a@proton.me", "a@mail.com", "a@email.com", "a@t-online.de"]) {
      expect(suggestEmail(email)).toBeNull();
    }
  });

  it("stays silent for other domains, including company and university addresses", () => {
    for (const email of ["a@onboard-germany.de", "a@example.com", "a@uni-koeln.de", "a@company.io", "a@gmx.fr", "a@wab.de", "a@lime.com", "a@outlook.jp"]) {
      expect(suggestEmail(email)).toBeNull();
    }
  });

  it("stays silent for incomplete input", () => {
    for (const email of ["", "amina", "amina@", "@gmail.com", "amina@gmail", "amina@gmail."]) {
      expect(suggestEmail(email)).toBeNull();
    }
  });
});

describe("editDistance", () => {
  it("counts a swap of neighbouring letters as one step", () => {
    expect(editDistance("gmial", "gmail")).toBe(1);
    expect(editDistance("hotmial", "hotmail")).toBe(1);
  });

  it("counts insert, delete and replace", () => {
    expect(editDistance("yahooo", "yahoo")).toBe(1);
    expect(editDistance("outlok", "outlook")).toBe(1);
    expect(editDistance("con", "com")).toBe(1);
    expect(editDistance("gmail", "gmail")).toBe(0);
    expect(editDistance("web", "gmx")).toBe(3);
  });
});
