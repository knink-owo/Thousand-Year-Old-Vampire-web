# Thousand Year Old Vampire

[中文](README.md) · **English**

> You are undying. You will forget everything.

A web edition of **Thousand Year Old Vampire**, Tim Hutchings’ solo journaling RPG: you play a vampire who wakes in the tenth century and drifts through a thousand years of Prompts, dice, and diary pages.

- Play online: <https://knink-owo.github.io/Thousand-Year-Old-Vampire-web/>
- Offline: download `千年吸血鬼-单文件版.html` from the repository root and open it

## What this is

The game is by **Tim Hutchings** (2019). There is no GM and no rules overhead beyond a d10, a d6, and your own words.

- **Core loop**: read a Prompt → write an Experience and (optionally) a diary entry → roll d10 and d6 → the difference moves you forward or backward through 80 Prompts
- **Five traits**: Memories (five slots, up to three Experiences each), Skills, Resources, Characters, Marks
- **Two styles**: a quick game that skims a life, or a journaling game that writes a real vampire biography
- **Your data stays yours**: saves live in your browser only, the app works offline, and everything can be exported and imported as JSON

## How to play

1. On the title page, choose **Begin your journey** and build a character in six steps, ending with **Become a creature of the night**
2. Each turn: read the Prompt → write an Experience (and a diary entry in journal mode) → **Finish this turn and cast the dice of fate**
3. The right-hand panel manages the five traits; the effect list above it guides each instruction with one-click handling and per-row undo
4. The game ends when you are told to check a Skill or lose a Resource and can do neither

**Tutorial** on the title page walks through the rules as printed in the rulebook, with two full examples of play.

## Saves and backup

- Progress is saved automatically in this browser (`localStorage`) — refresh or close and continue. **Do not use private mode**
- **Unfinished journey** continues the current game; **History** lists past lives, and a finished journey can be reviewed read-only and exported as Markdown
- Export a save JSON from time to time; import it on another device to continue
- Optional anonymous analytics are **off by default**; when the site owner enables them only view switches are reported, never save contents

## Offline single-file build

`tyov-web` has two independent build chains: the PWA and a self-contained single file.

- `千年吸血鬼-单文件版.html` in the repository root is a **release artifact**, rebuilt with every version
- Under `file://` the browser may not persist `localStorage` reliably: the page can bind a local backup file (Chromium-based browsers) and writes every save into it as well
- An older copy you already downloaded keeps working — the save key (`tyov:save:v1`) is compatible across versions

## Run locally

```bash
git clone https://github.com/knink-owo/Thousand-Year-Old-Vampire-web.git
cd Thousand-Year-Old-Vampire-web/tyov-web
npm install
npm run dev
```

Node.js ≥ 20. All commands, tests and the release flow are in [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Language

The interface and all game content exist in Chinese and English. English is the default; the switcher sits under the title on the title page and in the top bar. A returning player with a save made before the English version is kept in Chinese. Links can carry `?lang=zh` or `?lang=en`.

The English Prompt pack and tutorial are **extracted verbatim from the official English rulebook**, never back-translated from the Chinese pack; a test asserts that every English entry appears verbatim in the source text.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): stack, layers, engine rules, storage (Chinese)
- [Development and release](docs/DEVELOPING.md): commands, tests, E2E, release steps (Chinese)
- [Data pipeline](docs/pipeline.md): from rulebook PDF to Prompt pack (Chinese)
- [Language support](docs/i18n.md): how the bilingual layer works (Chinese)
- [Changelog](CHANGELOG.md)

## Licence and copyright

- **Source code** is released under the MIT licence — see [LICENSE](LICENSE)
- **Game text** (Prompts, rules, example journeys, in either language) is © Tim Hutchings and is included for personal, non-commercial play; the MIT licence does not cover it. See [NOTICE.md](NOTICE.md)
- Official site: <https://www.thousandyearoldvampire.com/> · itch.io: <https://timhutchings.itch.io/tyov>
