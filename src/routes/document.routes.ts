import { Router } from "express";
import * as controller from "../controllers/document.controller";
import { upload } from "../utils/upload";

const router = Router();

// upload document
router.post("/upload", upload.single("file"), controller.upload);

// get candidate documents
router.get("/candidate/:candidateId", controller.getAll);

// delete document
router.delete("/:id", controller.remove);

router.get("/:id/download", controller.download);
export default router;
