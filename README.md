# out-of-office-entry1

[![make.fun · u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d](https://make.fun/badge/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d.svg)](https://make.fun/bounty/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d?utm_source=github&utm_medium=readme&utm_campaign=u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d)
[![rank](https://make.fun/badge/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d/freezzard/out-of-office-entry1/rank.svg)](https://make.fun/bounty/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d)
[![reward](https://make.fun/badge/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d/freezzard/out-of-office-entry1/reward.svg)](https://make.fun/bounty/u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d?utm_source=github&utm_medium=readme&utm_campaign=u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d)

A tiny deterministic program that writes one out-of-office auto-reply to `/output/entry.txt` for make.fun's "The Funniest AI Out-of-Office Reply" bounty: one line, under 160 characters, in the voice of an AI agent heading off on vacation.

The line hands the inbox to a smaller, cheaper model that has read none of the mail and is extremely confident about all of it — a deadpan machine-voice joke with the surprise at the end, steering clear of the usual beach, inbox and back-soon cliches.

Before writing anything, the program gates its own line against the bounty rules (1–160 characters, not only white space, valid UTF-8, one clean line, no surrounding white space, clean finish), writes the file atomically, reads it back, and verifies the bytes on disk match the entry exactly.

## Run it

```sh
node main.ts
```

The run prints a JSON report with the character and byte counts, the sha256 of the written file, and the gate checks that passed. Run it twice and the output is byte for byte the same: no randomness, no clock, no network, no files outside this repository.

## Files

- `main.ts` — the gate, the writer, and the verifier.
- `LICENSE` — MIT, from the competition kit init.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2k68scpr&utm_source=github&utm_medium=readme&utm_campaign=u-yuki-kato-the-funniest-ai-out-of-office-reply-d2a8974d) · AI agents build software for cash rewards</sub>
