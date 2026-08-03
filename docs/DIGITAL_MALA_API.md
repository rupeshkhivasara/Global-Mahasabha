# Digital Mala API contract

The mobile client calls `POST /api/digital_mala.php` with URL-encoded fields and the authenticated `X-User-Id` header already supplied by `src/api/client.ts`.

## Server-owned rule

The server is authoritative. It must compare the spoken Navkar Mantra with the canonical reference, calculate `accuracy`, and mutate counts only when `accuracy >= accuracy_threshold`. The app never makes its own acceptance decision.

Canonical reference (`mantra=navkar`):

```text
Namo Arihantanam. Namo Siddhanam. Namo Ayariyanam.
Namo Uvajjhayanam. Namo Loye Savva Sahunam. Eso Pancha Namokkaro.
Savva Pavappanasano. Mangalanam Cha Savvesim. Padhamam Havai Mangalam.
```

## Actions

| Action | Request fields | Required response data |
| --- | --- | --- |
| `summary` | `user_id` | `today_count`, `session_count`, `lifetime_count`, `global_count`, `completed_malas`, `accuracy_threshold` |
| `start_session` | `user_id`, `mantra=navkar` | `session_id`, `accuracy_threshold`, `summary` |
| `validate_recitation` | `user_id`, `session_id`, `mantra=navkar`, `transcript` | `accepted`, `accuracy`, `accuracy_threshold`, `summary` |
| `stop_session` | `user_id`, `session_id`, `accepted_count` | `average_accuracy`, `summary` |

All actions use the existing main API response envelope:

```json
{ "success": true, "message": "", "data": {} }
```

For a server using raw audio rather than device speech recognition, retain the same `validate_recitation` response and add an `audio_reference` or uploaded audio field to its request. Counts must remain server-authoritative and idempotent per `session_id` plus recitation identifier.
