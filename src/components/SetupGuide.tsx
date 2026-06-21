"use client";

import type { AnimState } from "@/game/types";

const ROWS: { file: string; search: string; need: "required" | "nice" }[] = [
  { file: "fighter.fbx", search: "Character itself — Download WITH SKIN (e.g. “Brian”, “Michelle”)", need: "required" },
  { file: "idle.fbx", search: "Fighting Idle", need: "required" },
  { file: "walk.fbx", search: "Walking  (tick “In Place”)", need: "required" },
  { file: "punch.fbx", search: "Cross Punch  /  Jab", need: "required" },
  { file: "kick.fbx", search: "Roundhouse Kick", need: "required" },
  { file: "hit.fbx", search: "Hit Reaction  /  Head Hit", need: "required" },
  { file: "ko.fbx", search: "Falling Back Death  /  Knocked Out", need: "required" },
  { file: "jump.fbx", search: "Jump  (tick “In Place”)", need: "nice" },
  { file: "combo.fbx", search: "Martial Arts Combo  /  Boxing Combination", need: "nice" },
  { file: "block.fbx", search: "Standing Block  /  Body Block", need: "nice" },
  { file: "victory.fbx", search: "Victory  /  Cheering", need: "nice" },
  { file: "walkback.fbx", search: "Walking Backwards  (tick “In Place”)", need: "nice" },
  { file: "fighter2.fbx", search: "A 2nd character WITH SKIN (optional — else P2 reuses P1)", need: "nice" },
];

export function SetupGuide({
  onClose,
  source,
  missing,
}: {
  onClose: () => void;
  source: "mixamo" | "fallback";
  missing: AnimState[];
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0a14] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-wide text-white">Add Realistic Characters</h2>
            <p className="mt-1 text-sm text-white/60">
              Free, ~10 minutes. The game already runs with a placeholder; drop these files in and it upgrades itself.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>

        <div
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            source === "mixamo"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {source === "mixamo"
            ? `Mixamo characters detected${missing.length ? ` — still missing: ${missing.join(", ")} (using fallbacks)` : " ✓ all clips present"}`
            : "Currently using the built-in placeholder (three.js Xbot). Add the files below to go realistic."}
        </div>

        <ol className="mt-5 space-y-2 text-sm text-white/80">
          <li>
            1. Open{" "}
            <a className="text-arena-p1 underline" href="https://www.mixamo.com" target="_blank" rel="noreferrer">
              mixamo.com
            </a>{" "}
            and sign in with a free Adobe account.
          </li>
          <li>
            2. <b>Characters</b> tab → pick a realistic fighter (Brian, Michelle, Sophie…) →{" "}
            <b>Download</b> with <b>Format: FBX Binary</b>, <b>Skin: With Skin</b> → save as <code className="text-arena-gold">fighter.fbx</code>.
          </li>
          <li>
            3. <b>Animations</b> tab → search each clip below, click it, then <b>Download</b> with{" "}
            <b>FBX Binary · Without Skin · 30&nbsp;FPS</b>. Rename to the exact filename.
          </li>
          <li>
            4. Put every file in <code className="text-arena-gold">public/models/</code> then reload — done.
          </li>
        </ol>

        <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-3 py-2 font-semibold">Save as</th>
                <th className="px-3 py-2 font-semibold">Mixamo search</th>
                <th className="px-3 py-2 font-semibold">Need</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.file} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <code className="text-arena-gold">{r.file}</code>
                  </td>
                  <td className="px-3 py-2 text-white/75">{r.search}</td>
                  <td className="px-3 py-2">
                    {r.need === "required" ? (
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">required</span>
                    ) : (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/45">
          Tips: apply every animation to the <b>same</b> character so the skeleton matches. Tick <b>“In Place”</b> for
          walk/jump. Missing a file? The engine automatically falls back (e.g. kick → punch → idle), so add what you can
          and iterate.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 px-6 py-2 font-display tracking-wide text-white hover:scale-105"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
