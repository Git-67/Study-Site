# AGENTS.md

Guidance for AI agents working in this repository.

## Creating lessons

When asked to create, write or generate a lesson (or a lesson template), read
`LESSON_CREATION.md` in the repository root first and follow it. It describes
the lesson JSON format produced by the Create lesson page (Save as…), the
validation rules, and how to publish a lesson through `lessons/` and
`lessons/index.json`.

`LESSON_CREATION.md` is author-only and listed in `.gitignore`, so it exists
only on the author's machine. If it is missing, use `LessonStore.normalize()`
and `validate()` in `script.js` as the reference for the format.

See `DESIGN.md` for the site's visual design rules.
