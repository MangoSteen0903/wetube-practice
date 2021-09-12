import Video from "../models/Video";
import User from "../models/User";
export const home = async (req, res) => {
  const videos = await Video.find({}).sort({ createdAt: "desc" });
  return res.render("nav/home", {
    pageTitle: "Home",
    videos,
  });
};

export const watch = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id).populate("owner");
  console.log(video);
  if (!video) {
    return res.render("404", { pageTitle: "Video not found" });
  }
  return res.render("videos/watch", {
    pageTitle: video.title,
    video,
  });
};

export const getEdit = async (req, res) => {
  const { id } = req.params;
  const {
    user: { _id },
  } = req.session;

  const video = await Video.findById(id);
  if (!video) {
    return res.render("404", { pageTitle: "Video not found" });
  }
  console.log(video.owner, _id);
  if (video.owner.toString() !== _id) {
    return res.status(403).redirect("/");
  }
  res.render("videos/edit-video", {
    pageTitle: `Editing: ${video.title} `,
    video,
  });
};

export const postEdit = async (req, res) => {
  const { id } = req.params;
  const {
    user: { _id },
  } = req.session;
  const { title, description, hashtags } = req.body;
  const video = await Video.exists({ _id: id });
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found" });
  }

  const modifiedVideo = await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });
  if (modifiedVideo.owner.toString() !== _id) {
    return res.status(400).redirect("/");
  }

  return res.redirect(`/videos/${id}`);
};
export const upload = (req, res) => {
  return res.render("videos/upload", { pageTitle: "Upload Video" });
};

export const postUpload = async (req, res) => {
  const {
    user: { _id },
  } = req.session;
  const { path: fileUrl } = req.file;
  const { title, description, hashtags } = req.body;
  try {
    const newVideo = await Video.create({
      title,
      description,
      fileUrl,
      owner: _id,
      hashtags: Video.formatHashtags(hashtags),
    });
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    user.save();
    return res.redirect("/");
  } catch (error) {
    return res.status(400).render("videos/upload", {
      pageTitle: "Upload Video",
      errorMessage: error._message,
    });
  }
};

export const search = async (req, res) => {
  const { keyword } = req.query;
  let videos = [];
  if (keyword) {
    videos = await Video.find({
      title: {
        $regex: new RegExp(keyword, "i"),
      },
    }).sort({ createdAt: "desc" });
  }
  res.render("nav/search", {
    pageTitle: "Search Video",
    videos,
  });
};

export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  const {
    user: { _id },
  } = req.session;
  const video = await Video.findById(id);
  const video_owner = video.owner._id;
  const user = await User.findById(video_owner);
  console.log(user);
  if (!video) {
    return res.status(404).render("404", { pageTitle: "Video not found." });
  }
  if (String(video.owner) !== String(_id)) {
    return res.status(403).redirect("/");
  }

  await Video.findByIdAndDelete(id);
  user.videos.splice(user.videos.indexOf(id), 1);
  user.save();
  return res.redirect("/");
};
