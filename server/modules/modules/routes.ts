/**
 * Learning Modules Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { optionalAuth, requireCourses } from "../../middlewares/auth";
import { storage } from "../../storage";

const router = Router();

/**
 * Language helper function
 */
function reqLang(req: any): string {
  const q = (req.query.lang || req.headers["accept-language"] || "en")
    .toString()
    .slice(0, 2);
  return q === "es" ? "es" : "en";
}

/**
 * Get all modules
 */
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Check if user can access courses
    if (req.user) {
      const { canAccessCourses } = await import("../../utils/roles");
      if (!canAccessCourses(req.user)) {
        return res.status(403).json({
          message: "Premium subscription required to access courses",
          requiresUpgrade: true,
        });
      }
    } else {
      return res.status(401).json({
        message: "Authentication required to access courses",
      });
    }

    const lang = reqLang(req);
    const modules = await storage.getAllModules();

    // Get videos for each module
    const modulesWithVideos = await Promise.all(
      modules.map(async (m) => {
        const videos = await storage.getModuleVideos(m.id);
        return {
          ...m,
          title: lang === "es" && m.titleEs ? m.titleEs : m.title,
          description: lang === "es" && m.descriptionEs ? m.descriptionEs : m.description,
          videos: videos.map((v) => ({
            ...v,
            title: lang === "es" && v.titleEs ? v.titleEs : v.title,
            description: lang === "es" && v.descriptionEs ? v.descriptionEs : v.description,
          })),
        };
      })
    );

    res.json(modulesWithVideos);
  })
);

/**
 * Get module by ID
 * Allows viewing module details without premium access - PremiumGate handles content access
 */
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Allow viewing module details without premium access
    // The frontend will use PremiumGate to block premium content
    
    const lang = reqLang(req);
    const moduleId = parseInt(req.params.id);
    const module = await storage.getModule(moduleId);

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Get videos for this module
    const videos = await storage.getModuleVideos(moduleId);

    // Localize module content based on language
    const localizedModule = {
      ...module,
      title: lang === "es" && module.titleEs ? module.titleEs : module.title,
      description: lang === "es" && module.descriptionEs ? module.descriptionEs : module.description,
      videos: videos.map((v) => ({
        ...v,
        title: lang === "es" && v.titleEs ? v.titleEs : v.title,
        description: lang === "es" && v.descriptionEs ? v.descriptionEs : v.description,
      })),
    };

    res.json(localizedModule);
  })
);

export default router;

