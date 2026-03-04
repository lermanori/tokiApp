import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { title, description, category, severity, steps } = req.body;
        const user = req.user;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }

        const apiKey = process.env.TRELLO_API_KEY;
        const apiToken = process.env.TRELLO_API_TOKEN;
        const listId = process.env.TRELLO_BUG_LIST_ID;

        if (!apiKey || !apiToken || !listId) {
            logger.error('Trello credentials missing in environment variables');
            return res.status(500).json({ success: false, message: 'Bug reporting is currently unconfigured' });
        }

        const cardName = `[${severity || 'Bug'}] ${title}`;

        let cardDesc = `**Category:** ${category || 'None'}\n`;
        cardDesc += `**Severity:** ${severity || 'None'}\n`;
        cardDesc += `**Reporter:** ${user?.name || 'Unknown'} (${user?.id || 'No ID'})\n\n`;
        cardDesc += `**Description:**\n${description}\n\n`;

        if (steps) {
            cardDesc += `**Steps to Reproduce:**\n${steps}\n`;
        }

        const trelloUrl = `https://api.trello.com/1/cards?idList=${listId}&key=${apiKey}&token=${apiToken}`;

        // Using native fetch since Node 18+ supports it
        const response = await fetch(trelloUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: cardName,
                desc: cardDesc,
                pos: 'top',
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Trello API error: ${response.status} ${errorText}`);
            return res.status(500).json({ success: false, message: 'Failed to create bug report in Trello' });
        }

        const data = (await response.json()) as any;

        return res.status(200).json({
            success: true,
            message: 'Bug report submitted successfully',
            cardUrl: data.url
        });
    } catch (error) {
        logger.error('Error submitting bug report:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while reporting bug' });
    }
});

export default router;
