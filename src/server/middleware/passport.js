// experimental
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

dotenv.config();

const strategy = new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
  },
  (accessToken, refreshToken, profile, done) => {
    // TODO: we'll want to save this into a secure data store.
    return done(null, profile);
  }
);

// What are these for?
passport.serializeUser((user, done) => {
  console.log(`${user.displayName} logged in`);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(strategy);

export function addPassportAuth(app) {
  app.use(passport.initialize());
  app.use(passport.session());

  app.get(`/auth/error`, (req, res) => {
    res.send(`Unknown Error`);
  });

  app.get(
    `/auth/github`,
    passport.authenticate(`github`, { scope: [`user:email`] })
  );

  app.get(
    `/auth/github/callback`,
    passport.authenticate(`github`, { failureRedirect: `/auth/error` }),
    (req, res) => res.redirect(`/`)
  );

  app.get(`/auth/logout`, (req, res, next) => {
    const { user } = req.session.passport ?? {};
    if (!user) return res.redirect(`/`);
    req.logout((err) => {
      if (err) {
        console.log(`error logging ${user.displayName} out`);
        return next(err);
      }
      console.log(`${user.displayName} logged out`);
      res.redirect(`/`);
    });
  });
}
