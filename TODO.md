- rather than tacking data onto file editors, tack them onto the <file-entry> elements of the <file-tree>. That way the file tree is always the authority.
So really: rewrite the code to use "file" instances that can be saved onto file-entry DOM nodes, housing:

- a reference to their editor pane
- a reference to their tab bar tab
- a var that contains their content
- a var that contains that content's "hash"


At the least. That way most of the code can be generic, and the CM specific code can just work with those file objects.