# File tree behaviour

- [x] creates file entries
- [x] creates dir entries
- [x] creates empty dir entries
- [x] `remove-empty` removes dirs that are empty after explicit last-file delete.

# File events

## filetree:file:create

- in root

  - [x] sets `name` attribute
  - [x] sets `path` attribute
  - [x] sets heading text
  - [x] creates tab and editor
  - [x] autofocus on editor
  - [x] edits works

- in dir

  - [x] sets `name` attribute
  - [x] sets `path` attribute
  - [x] sets heading text
  - [x] creates tab and editor
  - [x] autofocus on editor
  - [x] edits works

- in dir, from root

  - [x] sets `name` attribute
  - [x] sets `path` attribute
  - [x] sets heading text
  - [x] creates tab and editor
  - [x] autofocus on editor
  - [x] edits works

- in nested dir

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- in nested dir, from root
  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

## filetree:file:rename

- in root

  - [x] renames file
  - [x] updates `path` attribute
  - [x] updates heading text
  - [x] creates tab and editor
  - [x] autofocus on editor
  - [x] edits works

- in dir

  - [ ] renames file
  - [ ] updates `path` attribute
  - [ ] updates heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- in nested dir
  - [ ] renames file
  - [ ] updates `path` attribute
  - [ ] updates heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

## filetree:file:upload

- drag-and-drop file in root

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- drag-and-drop file in dir

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- drag-and-drop file in nested dir
  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

## filetree:file:move

- move file from root to dir

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- move file from dir to root

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- move file from root to nested dir

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- move file from nested dir to root

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- move file from dir to nested dir

  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

- move file from nested dir to dir
  - [ ] sets `name` attribute
  - [ ] sets `path` attribute
  - [ ] sets heading text
  - [ ] creates tab and editor
  - [ ] autofocus on editor
  - [ ] edits works

## filetree:file:delete

- [x] file is removed
- [x] `cmInstances` record is removed

# Dir events

## filetree:dir:create

- [ ]

## filetree:dir:rename

- [ ]

## dir related part of filetree:file:upload

- [ ] drag-and-drop entire dir

## filetree:dir:move

- [ ]

## filetree:dir:delete

- [ ]
