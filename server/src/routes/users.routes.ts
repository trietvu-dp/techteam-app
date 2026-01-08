import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireAdminOrSuperAdmin, requireUserSchool, hashPassword } from "../middleware/auth.ts";

export const usersRouter = Router();

// Get all users for a school
usersRouter.get('/', requireAuth, requireAdminOrSuperAdmin, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        let users = await storage.getUsersBySchool(user.schoolId);

        // Filter by role if query parameter provided
        const roleFilter = req.query.role as string | undefined;
        if (roleFilter) {
            users = users.filter(u => u.role === roleFilter);
        }

        // Sort alphabetically by last name, first name
        users.sort((a, b) => {
            const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
            const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
            return nameA.localeCompare(nameB);
        });

        // Remove sensitive fields
        const sanitizedUsers = users.map(({passwordHash, ...user}) => user);

        res.json(sanitizedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({message: "Failed to fetch users"});
    }
})

// Update current user profile
usersRouter.put('/me', requireAuth, async (req: any, res) => {
    try {
        const user = req.user;

        // Filter to only allowed fields
        const allowedUpdates: any = {};
        if (req.body.firstName !== undefined) allowedUpdates.firstName = req.body.firstName;
        if (req.body.lastName !== undefined) allowedUpdates.lastName = req.body.lastName;
        if (req.body.email !== undefined) allowedUpdates.email = req.body.email;
        if (req.body.selectedAvatar !== undefined) allowedUpdates.selectedAvatar = req.body.selectedAvatar;

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({message: "No valid fields to update"});
        }

        const updatedUser = await storage.updateUser(user.id, allowedUpdates);

        // Remove sensitive fields from response
        const {passwordHash, ...sanitizedUser} = updatedUser;

        res.json(sanitizedUser);
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({message: "Failed to update profile"});
    }
})

// Invite a new user (admin or super admin)
usersRouter.post('/invite', requireAuth, requireUserSchool, requireAdminOrSuperAdmin, async (req: any, res) => {
    try {
        const user = req.user;

        const {username, email, password, firstName, lastName} = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({message: "username, email, and password are required"});
        }

        const passwordHash = await hashPassword(password);

        const newUser = await storage.createUser({
            username,
            email,
            passwordHash,
            firstName,
            lastName,
            schoolId: user.schoolId,
            role: 'student',
            points: 0,
            streak: 0,
            selectedAvatar: 'rocket',
            isActive: true,
        });

        // Remove sensitive fields from response
        const {passwordHash: _, ...sanitizedUser} = newUser;

        res.status(201).json(sanitizedUser);
    } catch (error) {
        console.error("Error inviting user:", error);
        res.status(500).json({message: "Failed to invite user"});
    }
})

// Activate/deactivate a user (admin or super admin)
usersRouter.put('/:id/activate', requireAuth, requireUserSchool, requireAdminOrSuperAdmin, async (req: any, res) => {
    try {
        const user = req.user;
        const {id} = req.params;
        const {isActive} = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({message: "isActive must be a boolean"});
        }

        // Get the target user
        const targetUser = await storage.getUser(id);
        if (!targetUser) {
            return res.status(404).json({message: "User not found"});
        }

        // Check permissions: super_admin can activate any user, regular admin only their school
        const isSuperAdmin = user.role === 'super_admin';
        if (!isSuperAdmin && targetUser.schoolId !== user.schoolId) {
            return res.status(403).json({message: "Forbidden - Insufficient permissions"});
        }

        const updatedUser = await storage.updateUser(id, {isActive});

        // Remove sensitive fields from response
        const {passwordHash, ...sanitizedUser} = updatedUser;

        res.json(sanitizedUser);
    } catch (error) {
        console.error("Error activating/deactivating user:", error);
        res.status(500).json({message: "Failed to update user status"});
    }
})
