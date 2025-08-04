import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

export function addPassportAuth(app) {
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

  passport.serializeUser((user, done) => {
    console.log(`${user.displayName} logged in`);
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(strategy);

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

export const authenticate = passport.authenticate(`github`);
