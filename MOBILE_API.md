# Global Mahasabha Vihar — Mobile API Reference

Base URL examples use `https://globalmahasabha.com`. Adjust for local/staging.

**Related:** [MOBILE_APP_SOLUTION.md](./MOBILE_APP_SOLUTION.md) — screens, flows, and architecture.

---

## Table of Contents

1. [Authentication APIs (Main)](#1-authentication-apis-main)
2. [Vihar Mobile APIs](#2-vihar-mobile-apis)
3. [Existing Vihar Web APIs](#3-existing-vihar-web-apis)
4. [Error Codes](#4-error-codes)
5. [Place Form Fields](#5-place-form-fields)

---

## 1. Authentication APIs (Main)

These live at `/api/` and use the shared `tbl_users` table with **11-digit geographic User ID** on registration.

### 1.1 Login

**`POST /api/login.php`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identity` | string | Yes | Email, 10-digit mobile, or 11-digit User ID |
| `password` | string | Yes | Account password |
| `fcm_token` | string | No | Firebase device token for push |

**Example request (form-urlencoded):**
```
identity=01020300001
password=MyPass123
fcm_token=dGhpcyBpcyBhIGZha2UgdG9rZW4
```

**Success `200`:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 42,
      "user_code": "01020300001",
      "full_name": "Rajesh Kumar",
      "email": "raj@example.com",
      "mobile": "9876543210",
      "approval_status": "approved"
    }
  }
}
```

**Errors:** `401` invalid credentials, `422` missing fields, `405` not POST.

---

### 1.2 Register (11-digit User ID)

**`POST /api/register.php`**

Uses the same algorithm as the website `user_panel/register.php`:

`user_code = state_code(2) + district_code(2) + city_code(2) + sequence(5)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `full_name` | string | Yes | Full name |
| `email` | string | Yes | Valid email (unique) |
| `mobile` | string | Yes | Exactly 10 digits (unique) |
| `password` | string | Yes | Min 8 characters |
| `address` | string | Yes | Full address |
| `state_id` | int | Yes | From locations API |
| `district_id` | int | Yes | From locations API |
| `city_id` | int | Yes | From locations API |
| `pincode` | string | No | 6 digits if provided |
| `fcm_token` | string | No | Push token |

**Example:**
```
full_name=Rajesh Kumar
email=raj@example.com
mobile=9876543210
password=SecurePass1
address=123 Main Street
state_id=1
district_id=5
city_id=12
pincode=110001
```

**Success `200`:**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user_id": 42,
    "user_code": "01020300001"
  }
}
```

**Errors:** `409` email/mobile exists, `422` validation, `500` DB error.

---

### 1.3 Location Lookup (Registration)

**`GET /api/locations.php`**

#### States
```
GET /api/locations.php?type=states
```
```json
{
  "success": true,
  "message": "States loaded.",
  "data": {
    "states": [
      { "id": 1, "state_name": "Delhi", "state_code": "07" }
    ]
  }
}
```

#### Districts
```
GET /api/locations.php?type=districts&state_id=1
```

#### Cities
```
GET /api/locations.php?type=cities&state_id=1&district_id=5
```

---

### 1.4 Update User Profile

**`POST /api/update_user.php`**

| Parameter | Required | Notes |
|-----------|----------|-------|
| `user_id` | Yes | From login response |
| `full_name`, `email`, `mobile`, `address`, `state_name`, `district_name`, `city_name`, `pincode`, `fcm_token`, `password` | No | Send only fields to update |

**Success:**
```json
{
  "success": true,
  "message": "User updated successfully.",
  "data": { "user_id": 42, "affected_rows": 1 }
}
```

---

## 2. Vihar Mobile APIs

Base path: **`/vihar/api/mobile/`**

### Response envelope

```json
{
  "ok": true,
  "message": "Human-readable message",
  "data": { }
}
```

### Authentication for protected endpoints

Pass the logged-in user's ID using **one** of:

- Form/query: `user_id=42`
- Header: `X-User-Id: 42`

Obtain `user_id` from `POST /api/login.php` → `data.user.id`.

---

### 2.1 Home

**`GET /vihar/api/mobile/home.php`**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `lat` | No | User latitude for nearby Guruji |
| `lng` | No | User longitude |
| `guruji_limit` | No | Default `4`, max `8` |

**Response `data`:**
```json
{
  "banners": [{ "id": 1, "image_url": "https://...", "title": "..." }],
  "nearby_guruji": [{
    "id": 5,
    "name": "Acharya ...",
    "distance_km": 12.4,
    "guruji_token": "dmloYXJfZ3VydWppX3YxOjU",
    "profile_url": "https://..."
  }],
  "quick_links": [{ "title": "Route Planner", "icon_class": "...", "link_url": "..." }],
  "more_links": []
}
```

---

### 2.2 Guruji List

**`GET /vihar/api/mobile/guruji_list.php`**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `q` | No | Search name/mobile/about |
| `lat`, `lng` | No | Sort by distance |

**Response `data`:**
```json
{
  "guruji": [ { "id": 5, "name": "...", "distance_km": 3.2, "guruji_token": "..." } ],
  "count": 15
}
```

---

### 2.3 Guruji Detail

**`GET /vihar/api/mobile/guruji_detail.php`**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id` | One of id/token | Guruji numeric ID |
| `token` | One of id/token | Public guruji token |
| `user_id` | No | If sent, includes `is_favourite` |

**Response `data`:**
```json
{
  "guruji": { "id": 5, "name": "...", "about_info": "...", "lat": "28.61", "lng": "77.20" },
  "attachments": {
    "images": [{ "id": 1, "url": "https://..." }],
    "videos": [],
    "files": []
  },
  "questions": [],
  "is_favourite": false
}
```

---

### 2.4 Place Detail

**`GET /vihar/api/mobile/place_detail.php`**

| Parameter | Required |
|-----------|----------|
| `id` or `token` | Yes |

**Response `data`:**
```json
{
  "place": { "id": 10, "place_name": "...", "lat": "28.5", "long_": "77.1", "place_token": "..." },
  "cover_url": "https://...",
  "files": [{ "id": 1, "image_url": "https://..." }],
  "questions": []
}
```

---

### 2.5 Directories

**`GET /vihar/api/mobile/directories.php`**

| `type` value | Content |
|--------------|---------|
| `members` | Board members |
| `donors` | Donor gallery |
| `pillars` | Pillar supporters |
| `medical` | Medical help contacts |
| `human_resources` | HR contacts |
| `about` | About page HTML (single object, not array) |

```
GET /vihar/api/mobile/directories.php?type=donors&limit=50
```

---

### 2.6 Account (Protected)

**`GET /vihar/api/mobile/account.php`**

Requires `user_id`.

**Response `data`:**
```json
{
  "user": {
    "id": 42,
    "user_code": "01020300001",
    "full_name": "...",
    "email": "...",
    "mobile": "...",
    "approval_status": "approved",
    "vihar_role_type": "user"
  },
  "profile": null,
  "guruji_id": null,
  "can_user_menu": true,
  "can_guruji_menu": false
}
```

**`POST /vihar/api/mobile/account.php`**

| action | Extra parameters | Description |
|--------|------------------|-------------|
| `set_role` | `vihar_role_type` = `user` \| `guruji` \| `both` | Onboard Vihar role |
| `toggle_favourite` | `guruji_id` | Add/remove favourite |
| `update_location` | `lat`, `lng` | Guruji live GPS (Guruji role only) |

**Set role example:**
```
user_id=42
action=set_role
vihar_role_type=user
```

**Update Guruji location:**
```
user_id=42
action=update_location
lat=28.613939
lng=77.209023
```

---

### 2.8 Guruji Live Location (Protected) — **use for continuous GPS**

**`POST /vihar/api/mobile/guruji_location.php`**

Dedicated webservice for **continuous location updates** while a Guruji user is logged in on the mobile app. Updates `vihar_guruji.lat` and `vihar_guruji.lng` in the database.

**Requirements:**
1. User logged in via `POST /api/login.php` → store `user_id`
2. User must have Vihar role `guruji` or `both` (set via `account.php` `action=set_role`)
3. Guruji profile must exist (linked in `tbl_user_vihar_profiles`)

**Authentication:** pass `user_id` in body, query, or header `X-User-Id: 42`

#### Update location (POST)

Accepts **form-urlencoded** or **JSON** (`Content-Type: application/json`).

| Parameter | Required | Description |
|-----------|----------|-------------|
| `user_id` | Yes | From login response |
| `lat` | Yes | Latitude (-90 to 90) |
| `lng` | Yes | Longitude (-180 to 180) |
| `accuracy` | No | GPS accuracy in metres |
| `speed` | No | Speed m/s |
| `heading` | No | Bearing in degrees |
| `tracked_at` | No | Device timestamp (ISO string) |

**Form example:**
```
POST /vihar/api/mobile/guruji_location.php
user_id=42
lat=28.613939
lng=77.209023
accuracy=8.5
```

**JSON example:**
```json
{
  "user_id": 42,
  "lat": 28.613939,
  "lng": 77.209023,
  "accuracy": 8.5,
  "tracked_at": "2026-06-17T10:30:00+05:30"
}
```

**Success:**
```json
{
  "ok": true,
  "message": "Location updated.",
  "data": {
    "guruji_id": 5,
    "lat": 28.613939,
    "lng": 77.209023,
    "updated_at": "2026-06-17 10:30:05",
    "accuracy": 8.5
  }
}
```

**Errors:** `401` missing user_id, `403` not Guruji role, `404` no profile, `422` invalid/zero coordinates.

#### Get current saved location (GET)

```
GET /vihar/api/mobile/guruji_location.php?user_id=42
```

**Response:**
```json
{
  "ok": true,
  "message": "Current location loaded.",
  "data": {
    "guruji_id": 5,
    "lat": 28.613939,
    "lng": 77.209023,
    "updated_at": "2026-06-17 10:30:05",
    "name": "Acharya ..."
  }
}
```

#### Mobile app integration (continuous tracking)

Call this endpoint every **30–60 seconds** (or on significant movement) while Guruji mode is active:

```
1. Login → POST /api/login.php
2. Set role → POST account.php  action=set_role  vihar_role_type=guruji
3. Start GPS watcher → on each fix POST guruji_location.php with lat/lng
4. Stop watcher when user switches to User mode or logs out
```

---

### 2.9 My Places (Protected)

**`GET /vihar/api/mobile/my_places.php?user_id=42`**

Lists places owned by the user.

**`POST /vihar/api/mobile/my_places.php`**

#### Create place
```
user_id=42
place_name=Jain Dharamshala
lat=28.61
lng=77.20
address=...
... (all place fields, see §5)
```

#### Update place
```
user_id=42
place_id=10
place_name=Updated name
lat=28.61
lng=77.20
```

#### Delete place
```
user_id=42
action=delete
place_id=10
```

**Create success:**
```json
{
  "ok": true,
  "message": "Place created.",
  "data": {
    "place_id": 99,
    "place_token": "dmloYXJfcGxhY2VfdjE6OTk"
  }
}
```

---

## 3. Existing Vihar Web APIs

Reuse these from mobile without modification.

### 3.1 Map Places

**`GET /vihar/api/map_places.php`**

| Parameter | Description |
|-----------|-------------|
| `all=1` | Include places without GPS (default: only with coordinates) |

```json
{
  "ok": true,
  "places": [{
    "id": 10,
    "place_name": "...",
    "lat": "28.5",
    "lng": "77.1",
    "cover_url": "https://...",
    "place_token": "...",
    "detail_url": "/vihar/place.php?p=...",
    "directions_url": "https://www.google.com/maps/dir/?api=1&destination=..."
  }]
}
```

---

### 3.2 Geocode Autocomplete

**`GET /vihar/api/geocode.php?q=delhi`**

Min 2 characters. Returns autocomplete results for route planner.

---

### 3.3 Route Report

**`GET /vihar/api/route_report.php?token={share_token}`**  
Load a saved report.

**`POST /vihar/api/route_report.php`**

#### Generate route
```
action=generate
start_lat=28.61
start_lng=77.20
dest_lat=26.91
dest_lng=75.78
start_label=Delhi
dest_label=Jaipur
morning_km=8
evening_km=7
```

Returns full route report JSON (days, stops, polylines).

#### Save route
```
action=save
title=Delhi to Jaipur
report_json={...full report from generate...}
```

---

## 4. Error Codes

| HTTP | Main API (`success`) | Vihar mobile (`ok`) |
|------|----------------------|---------------------|
| 200 | Success | Success |
| 401 | Invalid login | Missing/invalid `user_id` |
| 403 | — | Wrong Vihar role |
| 404 | — | Resource not found |
| 405 | Wrong method | Wrong method |
| 409 | Duplicate email/mobile | — |
| 422 | Validation error | Validation error |
| 500 | Server/DB error | Server error |

---

## 5. Place Form Fields

Minimum required for create/update: **`place_name`**, **`lat`**, **`lng`**.

Additional writable columns (POST as form fields):

| Field | Description |
|-------|-------------|
| `place_type_id` | Category ID |
| `address`, `city`, `area`, `pincode` | Location text |
| `building_age` | Building age |
| `room1_size` … `room5_fan` | Up to 5 rooms |
| `water_source`, `water_cooler`, `water_cooler_count` | Water |
| `food_arrangement`, `milk_arrangement` | Food |
| `parking_available`, `parking_type` | Parking |
| `mandir_distance_km`, `petrol_pump_distance_km` | Distances |
| `digambar_jain_population` | Community size |
| `owner_name`, `owner_mobile`, `owner_whatsapp` | Owner contact |
| `remarks` | Free text |

Full list: `vihar/includes/place_helpers.php` → function `vihar_place_writable_fields()`.

New places are created with **`is_visible = 0`** until admin approves.

---

## Quick Integration Example (Flutter/Dart pseudocode)

```dart
// 1. Register
final reg = await http.post(
  Uri.parse('$base/api/register.php'),
  body: {
    'full_name': name,
    'email': email,
    'mobile': mobile,       // 10 digits
    'password': password,
    'address': address,
    'state_id': '$stateId',
    'district_id': '$districtId',
    'city_id': '$cityId',
  },
);
final userCode = jsonDecode(reg.body)['data']['user_code']; // 11 digits — show to user!

// 2. Login
final login = await http.post(
  Uri.parse('$base/api/login.php'),
  body: {'identity': userCode, 'password': password},
);
final userId = jsonDecode(login.body)['data']['user']['id'];

// 3. Vihar home with GPS
final home = await http.get(Uri.parse(
  '$base/vihar/api/mobile/home.php?lat=$lat&lng=$lng',
));

// 4. Protected call
final places = await http.get(Uri.parse(
  '$base/vihar/api/mobile/my_places.php?user_id=$userId',
));
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial mobile API pack: auth (11-digit register), locations, vihar/mobile endpoints |
