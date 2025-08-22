- refactor res.locals.projectThings to just res.locals.project

- Verify that .env and build/run scripts update when saving project settings. And then also verify that remixing does the right thing (stripping the .env file)

- When creating a project, make sure to bootstrap the run script off of what is in the .container dir


===================


- Make it possible for a logged in user to add additional login methods
  - create a user "profile" page?
    - if own profile, show current login methods + "add a login"
    - user name, bio, links to cool places
    - list of projects they're collaborators on
    - list of their own projects

- Show "logged in" status for users on the admin page?

