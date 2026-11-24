# @shilp.dev/directus-counter

Atomically increments a numeric field (views, plays, downloads...) of any item. The item is found by its id or by any other field, such as a slug.

It is an endpoint extension, mounted at `/shilp/counter`.

## Install

Copy this folder (or the built `dist` + `package.json`) to `extensions/directus-counter` and restart Directus, or install `@shilp.dev/directus-counter` from npm.

## Configuration

Only the counters you list can be incremented. Restart Directus after changing it.

| Variable | Description |
| --- | --- |
| `SHILP_COUNTER_ALLOW_LIST` | Comma separated `collection.field` entries: the collection and the numeric field to increment in it, e.g. `memes.views,origins.views`. One counter per collection. Required: while it is empty the endpoint answers `NOT_CONFIGURED`. |

Any collection can be listed, system collections included (e.g. `directus_users.profile_views` for a custom field you added there).

## Usage

```
POST <DIRECTUS>/shilp/counter/<collection>/<finder-field>/<finder-field-value>
```

| Part | Description |
| --- | --- |
| `collection` | An allow listed collection, e.g. `memes`. |
| `finder-field` | Field to find the item by, e.g. `id` or `slug`. |
| `finder-field-value` | Value of that field. |

With `SHILP_COUNTER_ALLOW_LIST=memes.views`:

```bash
# memes.views of the meme with id 42
curl -X POST https://directus.example.com/shilp/counter/memes/id/42

# memes.views of the meme with slug "funny-cat"
curl -X POST https://directus.example.com/shilp/counter/memes/slug/funny-cat
```

The response holds the item's primary key and its new count:

```json
{ "data": { "id": 42, "views": 1301 } }
```

The increment is one `UPDATE ... SET views = COALESCE(views, 0) + 1`, so concurrent requests are never lost, and an empty counter starts at 1.

## Access

The endpoint is public: no token is needed, which suits counters on public websites. It doesn't need permissions on the collection either: the increment bypasses them, so the counter can stay read-only for every role. Only the allow listed `collection.field` pairs can be changed.

## Errors

Errors have the same shape as Directus' own: `{ "errors": [{ "message": "...", "extensions": { "code": "..." } }] }`.

| Status | Code | When |
| --- | --- | --- |
| 404 | `COLLECTION_NOT_FOUND` | The collection is not in `SHILP_COUNTER_ALLOW_LIST`. |
| 404 | `FIELD_NOT_FOUND` | The finder field doesn't exist in the collection. |
| 404 | `ITEM_NOT_FOUND` | No item has that finder field value. |
| 409 | `MULTIPLE_ITEMS_FOUND` | More than one item has that value. Find items by a unique field. |
| 500 | `INVALID_CONFIG` | An allow listed collection or counter field doesn't exist, or the field is not numeric. |
| 503 | `NOT_CONFIGURED` | `SHILP_COUNTER_ALLOW_LIST` is empty. |

## Notes

The update goes straight to the database, so it doesn't create revisions or activity, doesn't run `items.update` hooks or flows, and doesn't clear the Directus data cache.
