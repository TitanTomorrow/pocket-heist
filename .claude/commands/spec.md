---
description: Create a feature spec file and branch from a short idea
argument-hint: Short feature description
allowed-tools: Read, Write, Glob, Bash(git switch:*), Bash(git status:*), Bash(git branch:*)
---

You are helping to spin up a new feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title in kebab-case (e.g. new-heist-form)
- A safe git branch name not already taken (e.g. claude/feature/new-heist-form)
- A detailed markdown spec file under the _specs/ directory

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Check the current branch

Run `git status` to check the working directory and the current branch.

- If there are any uncommitted, unstaged, or untracked files, abort this entire process. Tell the user to commit or stash changes before proceeding, and DO NOT GO ANY FURTHER.
- If the working directory is clean but the current branch is not `main`, switch to `main` with `git switch main` so the new feature branch starts from `main`.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`  
   - A short, human readable title in Title Case.  
   - Example: "Card Component for Dashboard Stats".

2. `feature_slug`  
   - A git safe slug.  
   - Rules:  
     - Lowercase 
     - Kebab-case 
     - Only `a-z`, `0-9` and `-`  
     - Replace spaces and punctuation with `-`  
     - Collapse multiple `-` into one  
     - Trim `-` from start and end  
     - Maximum length 40 characters  
   - Example: `card-component` or `card-component-dashboard`.

3. `branch_name`  
   - Format: `claude/feature/<feature_slug>`  
   - Example: `claude/feature/card-component`.

If you cannot infer a sensible `feature_title` and `feature_slug`, ask the user to clarify instead of guessing.

## Step 3. Switch to a new Git branch

Before making any content, check whether `branch_name` already exists with `git branch --list <branch_name>`. If it is taken, append a version number to it (e.g. `claude/feature/card-component-01`), incrementing until the name is free. The 40-character limit applies to `feature_slug` only, not the version suffix. Use the final name as `branch_name` from here on.

Then create and switch to the branch with `git switch -c <branch_name>`.

## Step 4. Draft the spec content

Create a markdown spec document that Plan mode can use directly and save it in the _specs folder using the `feature_slug`. Use the exact structure as defined in the spec template file here: @_specs/template.md. Do not add technical implementation details such as code examples.

Fill the template placeholders as follows:

- `<feature_title>`: the `feature_title` from Step 2
- `<branch_name>`: the final `branch_name` from Step 3, including any version suffix
- `<figma-component-name>`: the Figma component name, if the user referenced one

If the user did not reference a Figma design, remove the `figma_component` line and the entire "Figma Design Reference" section rather than leaving them empty.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

```
Branch: <branch_name>
Spec file: _specs/<feature_slug>.md
Title: <feature_title>
```

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch name to use.