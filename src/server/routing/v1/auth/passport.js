import passport from "passport";
import { processUserLogin } from "../../../database.js";

// When a user succesfully signs in:
passport.serializeUser((user, done) => {
  // Run a database check for this user: if they already exist,
  // cool. If they don't, build a user account. If there's a 
  // user account but no separate login binding that ties
  // the github id to the user record, that's an error.
  if (user) processUserLogin(user);

  // And then let passport do whatever it does.
  done(null, user);
});

// When a user logs out:
passport.deserializeUser((user, done) => {
  done(null, user);
});

export { passport };
