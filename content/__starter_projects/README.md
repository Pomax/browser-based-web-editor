# Starter projects

This dir houses all the "starter" projects that folks can pick as default content for newly created projects. If you want to make a new starter, just create a child directory with an appropriate name, put some files in there, and the server will pick up the new starter on restart.

## Creating a new starter project

Create a directory and put your files in. Remember not to include anything that gets automatically built up during a run such as `node_modules` or the like, leave that up to the code to put in.

Create a `.container` folder, and then inside of that, create a `settings.json` file. This file will be used by the setup script to add your starter project to the database, or update the records for it if it's already in the database.

A basic `settings.json` will look like:

```json
{
  "description": "Your starter project's description goes here",
  "run_script": "npm start"
}
```

Note that your starter _must_ have a `run_script`, otherwise nothing will happen when folks try to remix it.

In addition to the `description` and `run_script` keys, any other key from the `ProjectSettings` model (which maps to the `project_settings` table in the database) can be used. For example, the web graphics starter uses the following settings:

```json
{
  "description": "A basic web graphics example, using <graphics-element>",
  "run_script": "npx http-server -c-1 -p $PORT --cors",
  "default_file": "sketches/sketch.js",
  "default_collapse": "graphics-element"
}
```

This will allow remixes to automatically open on the `sketches/sketch.js` file, which is the most "important" file in the starter, and it will automatically collapse the `graphics-element` dir when opened in the editor, because it's just a static asset dir that folks won't be doing anything with, so there's no point in making its content take up file tree real estate.

Note that the `run_script` and `default_collapse` values can contain newlines, so that you can define complex run instructions, as well as multiple dirs that should be collapsed. Users will be able to change these after remixing the starter as their own project, but making sure the starter values already do the right thing is, obviously, the goal here.

## Keeping the starter database records up to date

Whenever you update a starter project's settings, just rerun `node setup` and it'll update the database with the new settings. You won't even need to interact with it, it'll just run and complete, and you're done.

Of course, this _will not_ update any remixes that people already made: those remixes are now their project, and their settings are their own, irrespective of whether the starter got updated after they remixed it.
