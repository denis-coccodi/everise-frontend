# core-data-access

What several areas' stores share.

- `withCallState()`: a store feature for a call's loading and error state.
- `matchesSearch(search, texts)`: whether every word typed in a list's search box is in one of the texts, ignoring case and accents. The Events and Venues lists use it.

Run `nx test core-data-access` for its specs.
