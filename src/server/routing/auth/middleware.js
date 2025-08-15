import { passport } from "./passport.js";

/**
 * ...docs go here...
 */
export const loginWithGithub = passport.authenticate(`github`, {
  scope: [`user:email`],
});

/**
 * ...docs go here...
 */
export const handleGithubCallback = passport.authenticate(`github`, {
  failureRedirect: `/auth/github/error`,
});

/**
 * ...docs go here...
 */
export const logout = (req, res, next) => {
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
};
