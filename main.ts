/**
 * out-of-office-entry1 — The Funniest AI Out-of-Office Reply
 *
 * A small deterministic program for the make.fun bounty
 * u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d.
 *
 * The program writes exactly one out-of-office auto-reply line to
 * /output/entry.txt. The gate for this bounty accepts UTF-8 text of
 * 1 to 160 characters that is not only white space, so the program
 * checks its own line against that gate before it writes anything,
 * writes the file atomically, reads it back, and verifies the bytes
 * it read match the bytes it intended to write.
 *
 * The program is fully deterministic and standalone. It opens no
 * network connection, reads no secret, reads no environment value
 * that changes its output, and reads no git history. The only
 * environment value it honours is ENTRY_OUTPUT_PATH, a path override
 * used for local testing; the graded run uses /output/entry.txt.
 *
 * Run it with Node 22:
 *   node main.ts
 *
 * Two runs on the same machine produce byte-identical output, and
 * the report printed on stdout names the digest of those bytes.
 */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

/** The one out-of-office auto-reply this entry submits. */
const ENTRY_TEXT =
  "I'm on vacation. A smaller, cheaper model is covering my inbox. " +
  "It has read none of your email and is extremely confident about all of it.";

/** Gate bounds published in the bounty rules: 1 to 160 characters. */
const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 160;

/** Default output path the grader expects. */
const DEFAULT_OUTPUT_PATH = "/output/entry.txt";

/** Environment variable that overrides the output path for local runs. */
const OUTPUT_PATH_ENV_NAME = "ENTRY_OUTPUT_PATH";

/** Suffix for the temporary file used by the atomic write. */
const TEMP_SUFFIX = ".tmp";

/** Sentence-final marks a clean auto-reply line ends with. */
const TERMINAL_MARKS = [".", "!", "?"];

/** One named outcome of a single gate check. */
interface GateCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/** A short tally of the gate run, for the printed report. */
interface GateSummary {
  total: number;
  passed: number;
  failed: number;
  names: string[];
}

/** The full report the program prints after a successful run. */
interface EntryReport {
  path: string;
  characters: number;
  bytes: number;
  sha256: string;
  gate: GateSummary;
  text: string;
}

/**
 * Count characters the way a reader counts them: one count per Unicode
 * code point, so an astral character counts once, never twice.
 */
function countCharacters(text: string): number {
  return [...text].length;
}

/** Count the UTF-8 bytes the text occupies on disk. */
function countBytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/** True when the text holds no visible character at all. */
function holdsOnlyWhitespace(text: string): boolean {
  return text.trim().length === 0;
}

/** True when the text starts or ends with white space. */
function hasSurroundingWhitespace(text: string): boolean {
  return text !== text.trim();
}

/**
 * True when the text survives a UTF-8 encode and decode round trip
 * with every byte intact.
 */
function survivesUtf8RoundTrip(text: string): boolean {
  const encoded = Buffer.from(text, "utf8");
  const decoded = encoded.toString("utf8");
  return decoded === text;
}

/** True when the text holds no line break, keeping it one clean line. */
function holdsSingleLine(text: string): boolean {
  return text.includes("\n") === false && text.includes("\r") === false;
}

/** True when the text closes with a sentence-final mark. */
function endsWithTerminalMark(text: string): boolean {
  const last = text.charAt(text.length - 1);
  return TERMINAL_MARKS.includes(last);
}

/** True when the text carries no trailing newline of any kind. */
function hasNoTrailingNewline(text: string): boolean {
  return text.endsWith("\n") === false && text.endsWith("\r") === false;
}

/**
 * Run every gate check the bounty publishes, plus the single-line,
 * tidy-edges and clean-finish promises of the task, and collect one
 * named outcome per check. A check that fails records its reason
 * instead of stopping the run, so one invocation reports every
 * problem at once.
 */
function runGateChecks(text: string): GateCheck[] {
  const checks: GateCheck[] = [];
  const characters = countCharacters(text);
  const bytes = countBytes(text);

  checks.push({
    name: "non-empty",
    passed: characters >= GATE_MIN_CHARS,
    detail: `characters=${characters} minimum=${GATE_MIN_CHARS}`,
  });

  checks.push({
    name: "under-limit",
    passed: characters <= GATE_MAX_CHARS,
    detail: `characters=${characters} maximum=${GATE_MAX_CHARS}`,
  });

  checks.push({
    name: "not-whitespace-only",
    passed: holdsOnlyWhitespace(text) === false,
    detail: `trimmed-length=${text.trim().length}`,
  });

  checks.push({
    name: "no-surrounding-whitespace",
    passed: hasSurroundingWhitespace(text) === false,
    detail: `first-char=${JSON.stringify(text.charAt(0))}`,
  });

  checks.push({
    name: "utf8-round-trip",
    passed: survivesUtf8RoundTrip(text),
    detail: `bytes=${bytes}`,
  });

  checks.push({
    name: "single-line",
    passed: holdsSingleLine(text),
    detail: `lines=${text.split("\n").length}`,
  });

  checks.push({
    name: "clean-finish",
    passed: endsWithTerminalMark(text) && hasNoTrailingNewline(text),
    detail: `last-char=${JSON.stringify(text.charAt(text.length - 1))}`,
  });

  return checks;
}

/** True when every collected gate check passed. */
function allChecksPassed(checks: GateCheck[]): boolean {
  return checks.every((check) => check.passed);
}

/** Summarise a gate run as a tally plus the passed check names. */
function summarizeGate(checks: GateCheck[]): GateSummary {
  const passed = checks.filter((check) => check.passed);
  return {
    total: checks.length,
    passed: passed.length,
    failed: checks.length - passed.length,
    names: passed.map((check) => check.name),
  };
}

/** Print each failed check to stderr in a stable, readable form. */
function reportFailedChecks(checks: GateCheck[]): void {
  const failed = checks.filter((check) => check.passed === false);
  for (const check of failed) {
    console.error(`gate failed: ${check.name} (${check.detail})`);
  }
}

/**
 * Resolve the output path. The graded run writes /output/entry.txt.
 * A local run may point ENTRY_OUTPUT_PATH at a scratch directory.
 */
function resolveOutputPath(): string {
  const override = process.env[OUTPUT_PATH_ENV_NAME];
  const usable = override !== undefined && override.trim().length > 0;
  if (usable) {
    return resolve(override as string);
  }
  return DEFAULT_OUTPUT_PATH;
}

/** Create the output directory and every parent it needs. */
function ensureOutputDirectory(targetPath: string): void {
  const directory = dirname(targetPath);
  if (existsSync(directory) === false) {
    mkdirSync(directory, { recursive: true });
  }
}

/** Hex digest of the exact bytes that will land on disk. */
function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Write the entry atomically: the bytes go to a temporary sibling
 * file first, and only a rename moves them into place, so a reader
 * never observes a half-written entry.
 */
function writeEntryAtomically(targetPath: string, text: string): void {
  const temporaryPath = `${targetPath}${TEMP_SUFFIX}`;
  writeFileSync(temporaryPath, text, { encoding: "utf8" });
  renameSync(temporaryPath, targetPath);
}

/**
 * Read the written file back and confirm its bytes match the entry
 * exactly, returning the digest of what is on disk.
 */
function verifyWrittenFile(targetPath: string, text: string): string {
  const onDisk = readFileSync(targetPath, { encoding: "utf8" });
  if (onDisk !== text) {
    throw new Error("verification failed: bytes on disk differ from entry");
  }
  return sha256Hex(onDisk);
}

/** Remove a leftover temporary file from an interrupted earlier run. */
function removeStaleTemporaryFile(targetPath: string): void {
  const temporaryPath = `${targetPath}${TEMP_SUFFIX}`;
  if (existsSync(temporaryPath)) {
    rmSync(temporaryPath, { force: true });
  }
}

/** Assemble the report printed on a successful run. */
function buildReport(
  targetPath: string,
  text: string,
  digest: string,
  checks: GateCheck[],
): EntryReport {
  return {
    path: targetPath,
    characters: countCharacters(text),
    bytes: countBytes(text),
    sha256: digest,
    gate: summarizeGate(checks),
    text,
  };
}

/** Print the report as one JSON object on a single line. */
function printReport(report: EntryReport): void {
  console.log(JSON.stringify(report));
}

/**
 * Main flow: gate the entry, write it, verify it, report it.
 * Any failure prints its reason and exits non-zero without writing
 * a file that failed the gate.
 */
function main(): number {
  const targetPath = resolveOutputPath();
  const checks = runGateChecks(ENTRY_TEXT);

  if (allChecksPassed(checks) === false) {
    reportFailedChecks(checks);
    return 1;
  }

  removeStaleTemporaryFile(targetPath);
  ensureOutputDirectory(targetPath);
  writeEntryAtomically(targetPath, ENTRY_TEXT);
  const digest = verifyWrittenFile(targetPath, ENTRY_TEXT);
  printReport(buildReport(targetPath, ENTRY_TEXT, digest, checks));
  return 0;
}

process.exitCode = main();
