import User from "../models/User";
import Video from "../models/Video";
import bcrypt from "bcrypt";
import fetch from "node-fetch";

export const getJoin = (req, res) => {
  res.render("nav/join", { pageTitle: "Join" });
};
export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const exists = await User.exists({ $or: [{ username }, { email }] });
  const pageTitle = "Join";
  if (password !== password2) {
    {
      return res.status(400).render("nav/join", {
        pageTitle,
        errorMessage: "Password confirmation does not match",
      });
    }
  }
  if (exists) {
    return res.status(400).render("nav/join", {
      pageTitle,
      errorMessage: "This Username/email is already exists.",
    });
  }
  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
    return res.redirect("/login");
  } catch (error) {
    return res.status(400).render("nav/join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
};

export const getLogin = (req, res) => {
  res.render("nav/login", { pageTitle: "Login" });
};

export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = "Login";
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("nav/login", {
      pageTitle,
      errorMessage: "An account with this username does not exists.",
    });
  }
  const checkLogin = await bcrypt.compare(password, user.password);
  if (!checkLogin) {
    return res.status(400).render("nav/login", {
      pageTitle,
      errorMessage: "Wrong password",
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  return res.redirect("/");
};

export const startGithubLogin = (req, res) => {
  const baseUrl = `https://github.com/login/oauth/authorize`;
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};
export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = "https://api.github.com";

    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();

    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find(
      (emailObj) => emailObj.primary === true && emailObj.verified === true
    );
    if (!emailObj) {
      //set notification
      return res.redirect("/login");
    }

    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.avatar_url,
        name: userData.name ? userData.name : userData.login,
        username: userData.login,
        email: emailObj.email,
        password: "",
        socialOnly: true,
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    return res.redirect("/login");
  }
};
export const getEdit = async (req, res) => {
  return res.render("users/edit-profile", { pageTitle: "Edit profile" });
};
export const postEdit = async (req, res) => {
  const pageTitle = "Edit profile";
  const {
    session: {
      user: {
        _id,
        email: session_email,
        username: session_username,
        avatarUrl,
      },
    },
    body: { name, email, username, location },
    file,
  } = req;
  let searchParams = [];
  let isEmailChange = false;
  let isUsernameChange = false;
  let errorMessage = "";
  if (session_email !== email) {
    searchParams.push({ email });
    isEmailChange = true;
  }
  if (session_username !== username) {
    searchParams.push({ username });
    isUsernameChange = true;
  }
  if (searchParams.length > 0) {
    const exists = await User.findOne({
      $or: searchParams,
    });
    if (exists && exists._id.toString() !== _id) {
      if (isEmailChange) {
        errorMessage = "Email is already exists. Please Try Again.";
      }
      if (isUsernameChange) {
        errorMessage = "Username is already exists. Please Try Again";
      }
      if (isEmailChange && isUsernameChange) {
        errorMessage = "Username/Email is already exists. Please Try Again";
      }
      return res.status(400).render("users/edit-profile", {
        pageTitle,
        errorMessage,
      });
    }
  }
  console.log(file);
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      avatarUrl: file ? file.location : avatarUrl,
      name,
      email,
      username,
      location,
    },
    { new: true }
  );
  req.session.user = updatedUser;
  return res.redirect("/users/edit");
};

export const logout = (req, res) => {
  req.flash("info", "Bye Bye");
  req.session.destroy();
  return res.redirect("/");
};

export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly === true) {
    req.flash("error", "Can't Change password.");
    return res.redirect("/");
  }
  return res.render("users/change-password", { pageTitle: "Change Password" });
};
export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    body: { old_pw, new_pw, new_pw_confirm },
  } = req;
  const user = await User.findById(_id);
  const password = user.password;
  const check_pw = await bcrypt.compare(old_pw, password);
  if (!check_pw) {
    return res.status(400).render("users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "Password is incorrect.",
    });
  }
  if (new_pw !== new_pw_confirm) {
    return res.status(400).render("users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "Password does not match. Please try again.",
    });
  }

  user.password = new_pw;
  await user.save();
  req.flash("info", "Password updated");
  return res.redirect("/users/logout");
};
export const see = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate({
    path: "videos",
    populate: {
      path: "owner",
      model: "User",
    },
  });
  if (!user) {
    return res.status(404).render("404", { pageTitle: "User not found" });
  }

  return res.render("users/profile", {
    pageTitle: `${user.name}'s Profile`,
    user,
  });
};
