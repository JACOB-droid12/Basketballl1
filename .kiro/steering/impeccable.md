---
inclusion: manual
---

# Impeccable: Frontend Design Skill

When the user invokes `/impeccable` (with or without a sub-command), follow the full instructions in the skill file:

#[[file:.kiro/skills/impeccable/SKILL.md]]

## Reference files

Load the appropriate reference file based on the sub-command and register:

- Brand register: #[[file:.kiro/skills/impeccable/reference/brand.md]]
- Product register: #[[file:.kiro/skills/impeccable/reference/product.md]]

## Sub-command references

Load the matching reference when a sub-command is invoked:

- craft: #[[file:.kiro/skills/impeccable/reference/craft.md]]
- shape: #[[file:.kiro/skills/impeccable/reference/shape.md]]
- teach: #[[file:.kiro/skills/impeccable/reference/teach.md]]
- document: #[[file:.kiro/skills/impeccable/reference/document.md]]
- extract: #[[file:.kiro/skills/impeccable/reference/extract.md]]
- critique: #[[file:.kiro/skills/impeccable/reference/critique.md]]
- audit: #[[file:.kiro/skills/impeccable/reference/audit.md]]
- polish: #[[file:.kiro/skills/impeccable/reference/polish.md]]
- bolder: #[[file:.kiro/skills/impeccable/reference/bolder.md]]
- quieter: #[[file:.kiro/skills/impeccable/reference/quieter.md]]
- distill: #[[file:.kiro/skills/impeccable/reference/distill.md]]
- harden: #[[file:.kiro/skills/impeccable/reference/harden.md]]
- onboard: #[[file:.kiro/skills/impeccable/reference/onboard.md]]
- animate: #[[file:.kiro/skills/impeccable/reference/animate.md]]
- colorize: #[[file:.kiro/skills/impeccable/reference/colorize.md]]
- typeset: #[[file:.kiro/skills/impeccable/reference/typeset.md]]
- layout: #[[file:.kiro/skills/impeccable/reference/layout.md]]
- delight: #[[file:.kiro/skills/impeccable/reference/delight.md]]
- overdrive: #[[file:.kiro/skills/impeccable/reference/overdrive.md]]
- clarify: #[[file:.kiro/skills/impeccable/reference/clarify.md]]
- adapt: #[[file:.kiro/skills/impeccable/reference/adapt.md]]
- optimize: #[[file:.kiro/skills/impeccable/reference/optimize.md]]
- live: #[[file:.kiro/skills/impeccable/reference/live.md]]

## Context loading

Run the context loader script to gather PRODUCT.md and DESIGN.md:

```bash
node .kiro/skills/impeccable/scripts/load-context.mjs
```

Consume the full JSON output. The script resolves context files from the project root, `.agents/context/`, or `docs/`.
