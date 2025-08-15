import passport from "passport";

// When a user succesfully signs in:
passport.serializeUser((user, done) => {
  done(null, user);
});

// When a user logs out:
passport.deserializeUser((user, done) => {
  done(null, user);
});

export { passport };
