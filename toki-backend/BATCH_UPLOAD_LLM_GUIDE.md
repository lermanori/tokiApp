# Batch Upload Guide for LLMs

This guide helps LLMs assist users in creating batch upload data for the Toki admin panel. Use this guide to help users structure their JSON data and organize their files correctly.

## Overview

The batch upload feature allows admins to upload multiple tokis at once via a ZIP archive. The ZIP file must contain:
1. A JSON file with toki data (e.g., `tokis.json`)
2. Image files referenced in the JSON

**KEY PRINCIPLE FOR LLMs:**
When helping users create batch upload JSON, coordinates (latitude and longitude) are **optional** but recommended. The backend will **automatically geocode** location strings to coordinates using Google Maps API if coordinates are missing. However, for best accuracy, users can include coordinates if they have them.

## Step-by-Step Process

### 1. Understanding the Structure

Explain to the user that they need to:
- Create a folder with all their files
- Include a JSON file with toki data
- Include image files (JPG, PNG, WebP)
- Zip everything together
- Upload the ZIP file to the admin panel

### 2. JSON File Structure

The JSON file must have this structure:

```json
{
  "tokis": [
    {
      "title": "Morning Yoga",
      "description": "Join us for a relaxing yoga session",
      "location": "Central Park",
      "latitude": 40.785091,
      "longitude": -73.968285,
      "timeSlot": "morning",
      "scheduledTime": "2025-11-15T09:00:00Z",
      "category": "wellness",
      "maxAttendees": 20,
      "visibility": "public",
      "tags": ["yoga", "wellness", "fitness"],
      "host_id": "user-123",
      "image": "yoga-session.jpg",
      "images": ["gallery-1.jpg", "gallery-2.jpg"],
      "externalLink": "https://example.com/event"
    }
  ]
}
```

### 3. Required Fields

**MUST be included (validation will fail without these):**
- `title` (string): The toki title
- `location` (string): Location name/address
- `timeSlot` (string): One of the valid time slots (see below)
- `category` (string): One of the valid categories (see below)
- `host_id` (string): UUID of an existing user in the system

### 4. Optional Fields

These fields are optional but recommended:
- `description` (string): Detailed description
- **`latitude` (number): Latitude coordinate (-90 to 90) - HIGHLY RECOMMENDED**
- **`longitude` (number): Longitude coordinate (-180 to 180) - HIGHLY RECOMMENDED**
- `scheduledTime` (string): ISO 8601 datetime (e.g., "2025-11-15T09:00:00Z")
- `maxAttendees` (number | null): Maximum attendees (1-1000, or null for unlimited)
- `visibility` (string): One of: "public", "connections", "friends", "private" (default: "public")
- `tags` (array of strings): Array of tag strings
- `image` (string): Filename of a single image file
- `images` (array of strings): Array of image filenames (for multiple images)
- `externalLink` (string): External URL
- `autoApprove` (boolean): Auto-approve join requests (default: false)

**⚠️ IMPORTANT NOTE ABOUT COORDINATES:**

**Automatic Geocoding:**
The batch upload system **automatically geocodes** location strings to coordinates using Google Maps API. When coordinates are missing, the system will:
- Use the `location` field to look up coordinates
- Automatically populate `latitude` and `longitude`
- Show a warning that coordinates were auto-geocoded

**When to manually include coordinates:**
While automatic geocoding works well, you may want to include coordinates manually when:
1. You need precise coordinates for a specific spot (e.g., exact meeting point in a large park)
2. The location name is ambiguous (e.g., "Springfield" exists in multiple states)
3. You want to avoid relying on the geocoding API

**Coordinate validation:**
If you include coordinates manually, ensure:
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Coordinates should match the location name for accuracy

**Best practice for location strings:**
For best geocoding results, use complete location strings:
- ✅ Good: "Central Park, New York, NY"
- ✅ Good: "Eiffel Tower, Paris, France"
- ❌ Poor: "The park" (too vague)
- ❌ Poor: "Downtown" (not specific enough)

### 5. Valid Categories

The category field MUST be one of these exact values:

- `sports` - Physical activities and sports
- `coffee` - Coffee meetups and cafes
- `music` - Music events and jam sessions
- `dinner` - Food and dining experiences
- `work` - Work-related activities and networking
- `culture` - Art and creative activities
- `nature` - Outdoor and nature activities
- `drinks` - Social drinking and nightlife
- `party` - Social gatherings and hangouts
- `wellness` - Wellness, meditation, and health
- `chill` - Relaxed, casual activities
- `morning` - Morning-oriented activities
- `shopping` - Shopping trips and retail experiences
- `education` - Learning and educational activities
- `film` - Movies and cinema experiences

**Important:** Category values are case-sensitive and must match exactly.

### 6. Valid Time Slots

The `timeSlot` field MUST be one of these exact values:

- `now` - Happening now
- `30min` - In 30 minutes
- `1hour` - In 1 hour
- `2hours` - In 2 hours
- `3hours` - In 3 hours
- `tonight` - Tonight
- `tomorrow` - Tomorrow
- `morning` - Morning
- `afternoon` - Afternoon
- `evening` - Evening

### 7. Valid Visibility Options

- `public` - Visible to everyone (default)
- `connections` - Visible to connections only
- `friends` - Visible to friends only
- `private` - Private event

### 8. Image Handling

**Image References:**
- Use the `image` field for a single image: `"image": "photo.jpg"`
- Use the `images` array for multiple images: `"images": ["photo1.jpg", "photo2.jpg"]`
- Image filenames must match exactly (case-sensitive) with files in the ZIP
- Supported formats: JPG, JPEG, PNG, WebP
- Maximum size: 10MB per image

**Image Naming:**
- Use descriptive filenames: `yoga-session.jpg`, `coffee-meetup.png`
- Avoid special characters except hyphens and underscores
- Keep filenames simple and consistent

### 9. Host ID

The `host_id` must be a valid UUID of an existing user in the system. 

**Important:** While you can include `host_id` in the JSON file, **users can easily change this in the preview UI** without needing to know UUIDs:

1. After uploading the ZIP file, click "Preview"
2. For any toki, click the "Edit" button
3. In the "Host" field, you'll see a searchable dropdown
4. Type the user's name or email to find them
5. Select the user from the dropdown
6. The system automatically converts the selection to the correct `host_id`

**How to find a host_id for the JSON:**
- Check the admin panel's Users table
- Use the user's UUID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Or leave it as a placeholder and edit it in the preview UI

**Common mistakes:**
- Using email addresses instead of UUIDs in JSON
- Using non-existent user IDs
- Missing the field entirely

**Tip:** If you're not sure about the host_id, you can:
1. Use any valid UUID as a placeholder in the JSON
2. Upload and preview
3. Edit each toki to select the correct host from the dropdown

### 10. Creating the ZIP File

**Step-by-step instructions for users:**

1. Create a folder (e.g., `my-tokis`)
2. Place your JSON file in the folder (name it `tokis.json` or any name ending in `.json`)
3. Place all image files in the same folder
4. Ensure image filenames in JSON match the actual filenames exactly
5. Select all files in the folder
6. Right-click and choose "Compress" or "Send to > Compressed folder" (Windows) or use zip command (Mac/Linux)
7. Name the ZIP file (e.g., `my-tokis.zip`)

**Folder structure example:**
```
my-tokis/
├── tokis.json
├── yoga-session.jpg
├── coffee-meetup.png
└── gallery-1.jpg
```

After zipping:
```
my-tokis.zip
```

### 11. Complete Example

Here's a complete example with all fields:

```json
{
  "tokis": [
    {
      "title": "Morning Yoga in the Park",
      "description": "Join us for a rejuvenating yoga session in Central Park. All levels welcome!",
      "location": "Central Park, New York",
      "latitude": 40.785091,
      "longitude": -73.968285,
      "timeSlot": "morning",
      "scheduledTime": "2025-11-15T09:00:00Z",
      "category": "wellness",
      "maxAttendees": 25,
      "visibility": "public",
      "tags": ["yoga", "wellness", "fitness", "outdoor"],
      "host_id": "123e4567-e89b-12d3-a456-426614174000",
      "image": "yoga-session.jpg",
      "images": ["yoga-session.jpg", "park-view.jpg"],
      "externalLink": "https://example.com/yoga-event",
      "autoApprove": false
    },
    {
      "title": "Coffee & Networking",
      "description": "Casual networking meetup at our favorite coffee shop",
      "location": "Blue Bottle Coffee, SoHo",
      "latitude": 40.7231,
      "longitude": -74.0026,
      "timeSlot": "afternoon",
      "scheduledTime": "2025-11-16T14:00:00Z",
      "category": "coffee",
      "maxAttendees": null,
      "visibility": "connections",
      "tags": ["networking", "coffee", "business"],
      "host_id": "123e4567-e89b-12d3-a456-426614174000",
      "image": "coffee-meetup.jpg"
    }
  ]
}
```

### 12. Common Mistakes to Avoid

**JSON Errors:**
- Missing required fields (title, location, timeSlot, category, host_id)
- Invalid category (not in the list above)
- Invalid timeSlot (not in the list above)
- Invalid visibility value
- Invalid maxAttendees (must be 1-1000 or null)
- Missing or invalid host_id (user doesn't exist)
- Invalid latitude (must be between -90 and 90)
- Invalid longitude (must be between -180 and 180)
- Missing coordinates (will show a warning and toki won't appear on map)

**Image Errors:**
- Image filename in JSON doesn't match actual filename (case-sensitive!)
- Image file missing from ZIP
- Image format not supported (must be JPG, PNG, or WebP)
- Image too large (>10MB)

**File Structure Errors:**
- No JSON file in ZIP
- JSON file has invalid syntax
- JSON doesn't have a "tokis" array
- Empty "tokis" array

### 13. Validation Process

When the user uploads the ZIP:
1. System extracts the ZIP
2. Finds the JSON file
3. Validates JSON structure
4. Matches images to tokis by filename
5. Validates each toki:
   - Required fields present
   - Category is valid
   - Time slot is valid
   - Host ID exists
   - Images exist and are valid
6. Shows preview with validation status

**Preview shows:**
- ✓ Valid tokis (ready to create)
- ✗ Invalid tokis (with error messages)
- Warnings for missing optional fields

### 14. Tips for Users

1. **Start small**: Test with 1-2 tokis first
2. **Check filenames**: Ensure image filenames match exactly (case-sensitive)
3. **Validate host_id**: Make sure the user exists before including their ID
4. **Use valid categories**: Double-check category spelling
5. **Test JSON**: Validate JSON syntax before zipping
6. **Organize files**: Keep all files in one folder before zipping

### 15. Troubleshooting

**"No JSON file found in zip"**
- Ensure there's a `.json` file in the ZIP
- Check that the file extension is `.json` (not `.txt` or `.json.txt`)

**"Invalid JSON file"**
- Check for syntax errors (missing commas, quotes, brackets)
- Use a JSON validator online
- Ensure proper encoding (UTF-8)

**"Image file not found"**
- Check filename spelling (case-sensitive)
- Ensure image is in the ZIP file
- Check for extra spaces in filenames

**"Invalid category"**
- Use exact category from the list (case-sensitive)
- Common mistakes: "wellness" vs "Wellness", "coffee" vs "Coffee"

**"host_id does not exist"**
- Verify the user ID in the admin panel
- Use UUID format, not email or name

**"latitude must be between -90 and 90"**
- Check that latitude values are within valid range
- Latitude ranges from -90 (South Pole) to +90 (North Pole)

**"longitude must be between -180 and 180"**
- Check that longitude values are within valid range
- Longitude ranges from -180 to +180 (wraps around the globe)

**"No coordinates provided - this toki will not appear on the map"**
- This warning appears when automatic geocoding fails or is unavailable
- Check that `GOOGLE_MAPS_API_KEY` is configured in the backend
- Ensure the location string is specific enough (e.g., "Central Park, New York" not just "park")
- As a last resort, manually add latitude and longitude to the JSON

**"Coordinates auto-geocoded from location..."**
- This is an informational warning (not an error)
- The system successfully geocoded the location string to coordinates
- The toki will appear on the map at the geocoded location
- If coordinates are incorrect, you can manually edit them in the preview step

### 16. Best Practices

1. **Naming conventions:**
   - Use descriptive, lowercase filenames: `yoga-session.jpg`
   - Avoid spaces: use hyphens or underscores
   - Keep it simple: `coffee-meetup.jpg` not `Coffee Meetup Event Photo 2025.jpg`

2. **JSON organization:**
   - One toki per object in the array
   - Use consistent field ordering
   - Add comments in your working file (remove before zipping if needed)

3. **Image optimization:**
   - Resize large images before zipping (recommended: max 2000px width)
   - Use JPEG for photos, PNG for graphics
   - Keep file sizes reasonable (<5MB per image)

4. **Data quality:**
   - Fill in descriptions for better user experience
   - Add relevant tags
   - Include coordinates for better location accuracy

## Quick Reference

**Required Fields:**
- title, location, timeSlot, category, host_id

**Valid Categories:**
sports, coffee, music, dinner, work, culture, nature, drinks, party, wellness, chill, morning, shopping, education, film

**Valid Time Slots:**
now, 30min, 1hour, 2hours, 3hours, tonight, tomorrow, morning, afternoon, evening

**Valid Visibility:**
public, connections, friends, private

**Image Formats:**
JPG, JPEG, PNG, WebP (max 10MB each)

**ZIP Size Limit:**
50MB total

---

Use this guide to help users create properly formatted batch upload data. Always validate the JSON structure and check that all referenced files exist before the user creates the ZIP archive.
