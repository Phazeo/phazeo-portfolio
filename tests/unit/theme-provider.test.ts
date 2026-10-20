import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type Theme,
  createThemeSession,
  type ThemeSessionEnv,
} from "../../src/app/providers/theme-session.ts";

function makeEnv(initial: {
  stored: Theme | null;
  dom: Theme;
}): {
  env: ThemeSessionEnv;
  storageWrites: Theme[];
  applied: Theme[];
  fireSystem: (isDark: boolean) => void;
} {
  let stored = initial.stored;
  const storageWrites: Theme[] = [];
  const applied: Theme[] = [];
  let systemHandler: ((isDark: boolean) => void) | null = null;

  const env: ThemeSessionEnv = {
    getStored: () => stored,
    setStored: (theme) => {
      stored = theme;
      storageWrites.push(theme);
    },
    getDomTheme: () => initial.dom,
    apply: (theme) => {
      applied.push(theme);
    },
    subscribeSystem: (onChange) => {
      systemHandler = onChange;
      return () => {
        systemHandler = null;
      };
    },
  };

  return {
    env,
    storageWrites,
    applied,
    fireSystem: (isDark) => {
      systemHandler?.(isDark);
    },
  };
}

describe("ThemeProvider session", () => {
  it("does not write storage on mount", () => {
    const { env, storageWrites } = makeEnv({ stored: null, dom: "dark" });
    const session = createThemeSession(env);
    session.mount();
    assert.equal(storageWrites.length, 0);
    assert.equal(session.getTheme(), "dark");
  });

  it("writes storage on toggle", () => {
    const { env, storageWrites } = makeEnv({ stored: null, dom: "light" });
    const session = createThemeSession(env);
    session.mount();
    session.toggle();
    assert.deepEqual(storageWrites, ["dark"]);
    assert.equal(session.getTheme(), "dark");
    assert.equal(session.hasExplicitChoice(), true);
  });

  it("follows a system change when nothing is stored", () => {
    const { env, fireSystem, applied } = makeEnv({ stored: null, dom: "light" });
    const session = createThemeSession(env);
    session.mount();
    fireSystem(true);
    assert.equal(session.getTheme(), "dark");
    assert.ok(applied.includes("dark"));
  });

  it("ignores a system change when a choice is stored", () => {
    const { env, fireSystem } = makeEnv({ stored: "light", dom: "light" });
    const session = createThemeSession(env);
    session.mount();
    fireSystem(true);
    assert.equal(session.getTheme(), "light");
    assert.equal(session.hasExplicitChoice(), true);
  });

  it("ignores later system changes after a toggle establishes a choice", () => {
    const { env, fireSystem, storageWrites } = makeEnv({ stored: null, dom: "light" });
    const session = createThemeSession(env);
    session.mount();
    session.toggle();
    fireSystem(false);
    assert.equal(session.getTheme(), "dark");
    assert.deepEqual(storageWrites, ["dark"]);
  });
});
