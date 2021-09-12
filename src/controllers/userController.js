import User from "../models/User";
import bcrypt from "bcrypt";
import fetch from "node-fetch";

export const getJoin = (req, res) => {
  res.render("join", { pageTitle: "Join" });
};
export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const exists = await User.exists({ $or: [{ username }, { email }] });
  const pageTitle = "Join";
  if (password !== password2) {
    {
      return res.status(400).render("join", {
        pageTitle,
        errorMessage: "Password confirmation does not match",
      });
    }
  }
  if (exists) {
    return res.status(400).render("join", {
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
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
};

export const getLogin = (req, res) => {
  res.render("login", { pageTitle: "Login" });
};

export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = "Login";
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "An account with this username does not exists.",
    });
  }
  const checkLogin = await bcrypt.compare(password, user.password);
  if (!checkLogin) {
    return res.status(400).render("login", {
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
  return res.render("edit-profile", { pageTitle: "Edit profile" });
};
export const postEdit = async (req, res) => {
  const pageTitle = "Edit profile";
  const {
    session: {
      user: { _id, email, username },
    },
    body: {
      name: updated_name,
      email: updated_email,
      username: updated_username,
      location: updated_location,
    },
  } = req;

  console.log(updated_email);
  console.log(updated_name);

  const sessionParams = { email: email, username: username };
  const userParams = { email: updated_email, username: updated_username };

  const check_diffrence =
    JSON.stringify(sessionParams) === JSON.stringify(userParams);

  if (!check_diffrence) {
    const exists = await User.findOne({
      $or: [{ email: updated_email }, { username: updated_username }],
    });
    if (exists && exists._id !== _id) {
      return res.status(400).render("edit-profile", {
        pageTitle,
        errorMessage: "Username/Email is already exists. Please Try Again.",
      });
    }
  } else if (check_diffrence) {
    return res.status(400).render("edit-profile", {
      pageTitle,
      errorMessage: "You Entered Same Profile. Please Try Again.",
    });
  }
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      name: updated_name,
      email: updated_email,
      username: updated_username,
      location: updated_location,
    },
    { new: true }
  );
  req.session.user = updatedUser;
  return res.redirect("/users/edit");
};
export const logout = (req, res) => {
  req.session.destroy();
  return res.redirect("/");
};
export const see = (req, res) => res.send("See User");
