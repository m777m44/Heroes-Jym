# Third-party notices

**MAHDI-JYM** is a modified version of **openGym** (<https://github.com/DuarteSantos8/openGym>,
including the AI Coach fork at <https://github.com/alexpcosta/openGym>), renamed and extended
with walking/pedometer tracking, celebrations, smarter reminders and a dedicated body-weight
page. As required by the AGPL v3.0 (section 5), this notice records that the work was modified;
the list of changes is in [CHANGELOG.md](CHANGELOG.md) under 2.0.0.

- MAHDI-JYM modifications — Copyright (C) 2026 the MAHDI-JYM contributors.
- openGym — Copyright (C) 2026 Duarte Santos.

Both are licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

This permission was granted by the openGym copyright holder for openGym's code and is reproduced
here unchanged; it covers that code as it appears in MAHDI-JYM.

## Bundled AI provider CLI

The api image installs the [**Claude Code CLI**](https://github.com/anthropics/claude-code)
(`@anthropic-ai/claude-code`, pinned in `api/Dockerfile`) so the optional AI Coach works
without the instance owner installing anything. MAHDI-JYM invokes it as a separate process at
runtime and does not link against it or include its source; this is mere aggregation, and
MAHDI-JYM's own AGPL v3.0 licensing is unchanged.

The CLI is distributed under its own terms, and using it requires an account with the
provider. Both are matters between the instance owner and Anthropic — MAHDI-JYM ships no
credentials and asks its users for none. Instances that would rather not carry it can leave
the Coach disabled (the default) or set `COACH_DISABLED=1`.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

The exercise names, instructions (English in `frontend/src/lib/exercises-data.js`, Arabic
in `frontend/src/instr/ar.js`, regenerated via `scripts/build-instructions.mjs`), images
and animations (fetched into `media/` at build time) come from
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset)
and are **not** covered by MAHDI-JYM's AGPL license — they remain under that dataset's own terms.
The media files are not distributed in this repository; they are downloaded from the upstream
source on first run. If you redistribute MAHDI-JYM with the media included, review the upstream
license first.

## Food photographs (14.0)

The kitchen's 780 food and drink photos (`frontend/public/food/m/*.webp`, `frontend/public/food/t/*.webp`)
are photographs from **[Wikimedia Commons](https://commons.wikimedia.org/)**, each used under the free
licence its author chose: **Creative Commons Attribution (CC BY 1.0 – 4.0, some ported)**, **Attribution-ShareAlike
(CC BY-SA 2.0 – 4.0, some ported)**, **CC0** or the **public domain**. Files under GFDL-only terms, drawings,
logos and AI-generated images are excluded by `frontend/scripts/food-photos/fetch.mjs`.

- **Attribution:** the file name, the author and the licence of every photo are in
  [`frontend/src/lib/photos/credits.json`](frontend/src/lib/photos/credits.json) and are shown in the app —
  the camera button on each photo, and Kitchen → Tools → *Photo credits*. Each file's page is
  `https://commons.wikimedia.org/wiki/File:<file name>`, which links its licence.
- **Changes:** the photos were cropped (to 4:3 and to a square) and resized for the app, and saved as WebP.
- **ShareAlike:** the cropped and resized versions of CC BY-SA photos are shared under the same licence as
  their originals. The photos are separate works aggregated with the app; they do not change the app's
  AGPL v3.0 licence, and the app's licence does not change theirs.
