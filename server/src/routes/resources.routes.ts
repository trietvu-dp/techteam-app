import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireUserSchool } from "../middleware/auth.ts";

export const resourcesRouter = Router();

// List global resources (supports category/contentType/search)
resourcesRouter.get('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const resources = await storage.getResources({
            category: req.query.category as string | undefined,
            contentType: req.query.contentType as string | undefined,
            search: req.query.search as string | undefined,
        });

        res.json(resources);
    } catch (error) {
        console.error("Error fetching resources:", error);
        res.status(500).json({message: "Failed to fetch resources"});
    }
});

// Fetch a single global resource by id
resourcesRouter.get('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const resource = await storage.getResource(req.params.id);
        if (!resource) {
            return res.status(404).json({message: "Resource not found"});
        }

        res.json(resource);
    } catch (error) {
        console.error("Error fetching resource:", error);
        res.status(500).json({message: "Failed to fetch resource"});
    }
});
