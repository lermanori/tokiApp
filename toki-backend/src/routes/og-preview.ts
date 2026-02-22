import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import logger from '../utils/logger';

const router = Router();

// Category-based fallback images (same mapping as frontend metaTags.ts)
const CATEGORY_IMAGES: Record<string, string> = {
    coffee: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    food: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    dinner: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    sports: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    music: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    art: 'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    culture: 'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    travel: 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    nature: 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    technology: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    work: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    networking: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    education: 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    wellness: 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    yoga: 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    beach: 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    drinks: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
};

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop';
const FRONTEND_BASE_URL = 'https://toki-app.com';

/**
 * GET /share/:id
 * Public (no auth) endpoint that serves HTML with OG meta tags for link previews.
 * Real users get redirected to the SPA via meta-refresh.
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
        t.id, t.title, t.description, t.location, t.time_slot,
        t.category, t.image_urls, t.image_url,
        u.name as host_name
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      WHERE t.id = $1 AND t.status = 'active'`,
            [id]
        );

        if (result.rows.length === 0) {
            // Redirect to frontend even if toki not found
            return res.redirect(`${FRONTEND_BASE_URL}/toki-details?tokiId=${id}`);
        }

        const toki = result.rows[0];

        // Build OG metadata
        const title = `${toki.title} | Toki`;
        const spaUrl = `${FRONTEND_BASE_URL}/toki-details?tokiId=${toki.id}`;

        // Show first sentence of description, max 50 chars + truncation
        let description = 'Toki';
        if (toki.description) {
            // Get first sentence (split on . ! ? or newline)
            const firstSentence = toki.description.split(/[.!?\n]/)[0].trim();
            description = firstSentence.length > 50
                ? firstSentence.substring(0, 50) + '...'
                : firstSentence;
        }

        // Resolve image: uploaded image → category fallback → default
        let imageUrl = toki.image_urls && toki.image_urls.length > 0
            ? toki.image_urls[0]
            : toki.image_url;

        if (!imageUrl) {
            const cat = (toki.category || '').toLowerCase();
            imageUrl = CATEGORY_IMAGES[cat] || DEFAULT_IMAGE;
        }

        // Escape HTML special chars for safe embedding
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${esc(spaUrl)}">
  
  <!-- Primary Meta Tags -->
  <title>${esc(title)}</title>
  <meta name="title" content="${esc(title)}">
  <meta name="description" content="${esc(description)}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(spaUrl)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:site_name" content="Toki">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${esc(spaUrl)}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(imageUrl)}">
  <meta name="twitter:image:alt" content="${esc(title)}">
</head>
<body>
  <p>Redirecting to <a href="${esc(spaUrl)}">${esc(title)}</a>...</p>
  <script>window.location.href = ${JSON.stringify(spaUrl)};</script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Short cache so previews update when event is edited, but crawlers don't hammer the DB
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(html);

    } catch (error) {
        logger.error('OG preview error:', error);
        // On error, still redirect to the SPA
        return res.redirect(`${FRONTEND_BASE_URL}/toki-details?tokiId=${req.params.id}`);
    }
});

export default router;
