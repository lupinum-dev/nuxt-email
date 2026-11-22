---
"@lupinum/nuxt-email": minor
---

Add `@source inline()` in `app/emails/tailwind.css` for class names that are built at run time, and make `createTestRenderer()` fail on classes that have no effect.

`@source inline("text-{red,emerald}-600")` adds classes that are not written completely in the source, for example a name built from a prop. Tailwind expands the braces. `@source` with a path was ignored and now fails the build with a clear message.

The `renderEmail` function of `createTestRenderer()` fails when a render keeps a class as written: a wrong name, a name built at run time, or a utility that only changes another class. List the classes that must stay in the new `allowUnknownClasses` option, or pass `true` to allow every class. Production renders and the development preview do not change.

A class that a plain rule in `tailwind.css` defines is now known to the build even when its name is built at run time.

Fix named `group` and `peer` marker classes such as `group/item`: they now get the class name that the `group-hover/item:` rule selects.
