import { expect, it } from "vitest";
import { newId } from "./id";

it("不重複", () => { expect(new Set(Array.from({ length: 1000 }, () => newId())).size).toBe(1000); });
