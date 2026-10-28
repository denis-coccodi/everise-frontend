# auth-feature-character-fields

`cdt-character-fields`: a member's character in the game, its name and its world, shared by the sign-up form and the settings (a widget library, so no page imports another).

- Both are optional, but both or neither: once given, the site calls the member "Avar Kriss (Odin)" instead of their username. The rules are `characterRules()` in `@everise/core/forms`, the backend's own, which the form's schema applies: `characterRules(path.characterName, path.server)`.
- It takes the form's two fields, `[name]` and `[world]`, and binds them to a text box and a select.
- The worlds come from `GET /api/market/regions`, the same list the backend accepts, one group per data centre ("Aether (North America)"). If they can't be loaded, it says so, and a world already saved stays selectable.
