import { passport } from "./passport.js";
import { Strategy as GitHubStrategy } from "passport-github2";
import { loginWithGithub, handleGithubCallback, logout } from "./middleware.js";

// Set up our routes:
import { Router } from "express";
const github = Router();
github.get(`/error`, (req, res) => res.send(`Unknown Error`));
github.get(`/callback`, handleGithubCallback, (req, res) => res.redirect(`/`));
github.get(`/logout`, logout);
github.get(`/`, loginWithGithub);

/**
 * And export the function that sets github oauth brokerage
 */
export function addPassportAuth(app) {
  // TODO: Init and session should be one-time across
  //       however many auth brokers we use
  app.use(passport.initialize());
  app.use(passport.session());

  const strategy = new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  );
  passport.use(strategy);
  app.use(`/auth/github`, github);
}
