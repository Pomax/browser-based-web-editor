# Data management

requirements:

```
git config diff.sqlite3.binary true
git config diff.sqlite3.textconv "echo .dump | sqlite3"
```

All sqlite3 connections must start with `PRAGMA foreign_keys = ON;`

To create the db, run `sqlite3 data.sqlite3` and then `.read schema.sql`, optionally followed by a `.read seed.sql` to seed the database.
