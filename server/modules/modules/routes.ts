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

    // Localize module content based on language
    const localizedModules = modules.map((m) => ({
      ...m,
      title: lang === "es" && m.titleEs ? m.titleEs : m.title,
      description:
        lang === "es" && m.descriptionEs ? m.descriptionEs : m.description,
      content: lang === "es" && m.contentEs ? m.contentEs : m.content,
      quizQuestion:
        lang === "es" && m.quizQuestionEs ? m.quizQuestionEs : m.quizQuestion,
      quizOptions:
        lang === "es" && m.quizOptionsEs ? m.quizOptionsEs : m.quizOptions,
      correctAnswer:
        lang === "es" && m.correctAnswerEs
          ? m.correctAnswerEs
          : m.correctAnswer,
    }));

    res.json(localizedModules);
  })
);

/**
 * Get module by ID
 */
router.get(
  "/:id",
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
    const moduleId = parseInt(req.params.id);
    const module = await storage.getModule(moduleId);

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Localize module content based on language
    const localizedModule = {
      ...module,
      title: lang === "es" && module.titleEs ? module.titleEs : module.title,
      description:
        lang === "es" && module.descriptionEs
          ? module.descriptionEs
          : module.description,
      content:
        lang === "es" && module.contentEs ? module.contentEs : module.content,
      quizQuestion:
        lang === "es" && module.quizQuestionEs
          ? module.quizQuestionEs
          : module.quizQuestion,
      quizOptions:
        lang === "es" && module.quizOptionsEs
          ? module.quizOptionsEs
          : module.quizOptions,
      correctAnswer:
        lang === "es" && module.correctAnswerEs
          ? module.correctAnswerEs
          : module.correctAnswer,
    };

    res.json(localizedModule);
  })
);

export default router;

