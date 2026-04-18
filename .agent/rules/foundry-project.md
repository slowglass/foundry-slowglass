---
trigger: always_on
---

# Project Description

## Key Concepts for Foundry VTT v13 and D&D 5e v5.x Module Development
This project is a Foundry VTT Module that works with **Foundry VTT Version 13** and the **D&D 5e System Version 5.x** (specifically v5.3.1).

### Architecture Requirements (D&D 5e v5.x)
- **Activities**: The system uses a modular Activity-based architecture. Activation types must be registered in `CONFIG.DND5E.activityActivationTypes`.
- **Modern Sheets**: NPC sheets use the `ActorSheet5eNPC2` class.
- **Data Hook**: Use the `dnd5e.getActorSheetData` hook for sheet data manipulation. Section headers in 5.x are controlled by the `label` property of objects in the `features` array.
- **NO LEGACY**: Do not assume V11 or dnd5e v4 logic. Avoid legacy config paths unless strictly needed for backwards compatibility with specific user items.

### JavaScript Integration
- Use `esmodules` array for ES6 modules (preferred)
- Use `scripts` array for traditional scripts
- Hooks system for event-driven development
- Key hooks: `init`, `ready`, `renderApplication`, etc.

### Chat Integration
- Use `ChatMessage.create()` to send messages to chat
- Access game data through `game` global object
- Use Hooks to listen for events and trigger actions

### Development Workflow
1. Create module folder structure
2. Write manifest.json
3. Create JavaScript files
4. Test in Foundry VTT
5. Use Developer Tools (F12) for debugging

## Git Usage Guidelines
- **IMPORTANT**: Always use `--no-pager` flag with git commands to avoid terminal blocking
- Reference `.gitusage` file in project root for complete git command guidelines
- Use `git --no-pager status`, `git --no-pager log --oneline`, etc.
- Follow commit message format: "Module Update: Brief description"
