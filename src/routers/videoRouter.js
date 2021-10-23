import express from "express";
import {
  watch,
  getEdit,
  upload,
  deleteVideo,
  postEdit,
  postUpload,
} from "../controllers/videoController";
import {
  protectorMiddleware,
  publicOnlyMiddleware,
  videoUpload,
} from "../middelwares";

const videoRouter = express.Router();

videoRouter
  .route("/upload")
  .all(protectorMiddleware)
  .get(upload)
  .post(
    videoUpload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    postUpload
  );
videoRouter.get("/:id([0-9a-f]{24})", watch);

videoRouter
  .route("/:id([0-9a-f]{24})/edit-video")
  .all(protectorMiddleware)
  .get(getEdit)
  .post(postEdit);
videoRouter.route("/:id/delete").all(protectorMiddleware).get(deleteVideo);

export default videoRouter;
