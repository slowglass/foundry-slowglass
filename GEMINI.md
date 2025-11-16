# Project Description

## Key Concepts for Foundry VTT v13 Module Development
This project is a Foundry VTT Module that works with Foundry VTT Version 13 (See https://foundryvtt.com/api/v13/)

### Module Structure
- Modules are subfolders in `{userData}/Data/modules/`
- Must contain a `module.json` manifest file
- Recommended structure: templates/, scripts/, styles/, packs/, lang/

### Manifest Requirements
- `id`: unique identifier (lowercase, hyphens only)
- `title`: human-readable name
- `description`: module description
- `version`: version number
- `compatibility`: Foundry VTT version compatibility
- `authors`: array of author objects

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
