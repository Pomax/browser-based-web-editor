# Data management

requirements:

```
git config diff.sqlite3.binary true
git config diff.sqlite3.textconv "echo .dump | sqlite3"
```

All sqlite3 connections must start with `PRAGMA foreign_keys = ON;`
