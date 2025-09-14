import { describe, expect, it } from "vitest";
import { FpsAverager } from "../../../src/render/stats";

describe("render/FpsAverager", () => {
  it("computes average fps over window", () => {
    const fps = new FpsAverager(5);
    // push timestamps every ~16.7ms (~60fps)
    const start = 1000;
    for (let i = 0; i < 6; i++) fps.push(start + i * 16.7);
    expect(fps.fps).toBeGreaterThan(55);
    expect(fps.fps).toBeLessThan(65);
  });
});

