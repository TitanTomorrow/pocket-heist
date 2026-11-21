---
description: Create a feature spec file and branch from a short idea
argument-hint: "[Short feature description, optionally: 'figma: <component-link>']"
allowed-tools: Read, Write, Glob, Bash(git switch:*), Bash(git status:*), Bash(git branch:*)
---

You are helping to spin up a new feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title in Title Case (e.g. New Heist Form) and a kebab-case slug (e.g. new-heist-form)
- A safe git branch name not already taken (e.g. claude/feature/new-heist-form)
- A detailed markdown spec file under the _specs/ directory

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Check the current branch

Run `git status` to check the current Git branch and the state of the working directory.

- If there are any uncommitted, unstaged, or untracked files in the working directory, abort this entire process. Tell the user to commit or stash changes before proceeding, and DO NOT GO ANY FURTHER.
- If the working directory is clean but the current branch is not `main`, run `git switch main` so the new feature branch is created from `main`. If the switch fails, report the error and DO NOT GO ANY FURTHER.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract the values below. If `$ARGUMENTS` contains `figma:`, first split it there: the text before `figma:` (with any trailing comma or whitespace trimmed) is the feature description, and the text after it is the `figma_hint`. Derive `feature_title` and `feature_slug` from the feature description only, never from the Figma link.

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

4. `figma_hint` (optional)  
   - If `$ARGUMENTS` contains the substring `figma:`  
   - Then the text after `figma:` is the figma component link.  
   - Trim whitespace.  
   - Example input:  
     - `/spec Card component, figma: https://www.figma.com/design/some-link`  
     - `figma_hint` becomes `https://www.figma.com/design/some-link`.

If you cannot infer a sensible `feature_title` and `feature_slug`, ask the user to clarify instead of guessing.

## Step 2.5 Pull Figma context when needed

If `figma_hint` is present and Figma MCP tools are available:

Use the **figma-design-extractor** subagent to provide a design guide for the feature, citing the 'figma hint'

1. Use the Figma MCP tools to locate the component, layer or frame.  
2. Record the component's name as shown in Figma as `figma_component_name`.
3. Extract only information that is useful for implementation, such as:  
   - Dimensions and layout (grid, spacing, alignment)  
   - Key typography tokens (font family, size, weight)  
   - Color tokens and semantic usage (primary, surface, border, error etc.)  
   - Border radius, shadows, and any notable visual detail  
   - Icons, buttons, links or other UI elements
4. Fill the template's "Figma Design Reference" section with:  
   - File: the `figma_hint` link, for future lookups  
   - Component name: `figma_component_name`  
   - Key visual constraints: 3 to 8 concise sub-bullets summarising the information above
5. Also use `figma_component_name` for the `figma_component` line at the top of the template.
6. If lookup fails or the tools are not available, still fill in File with the `figma_hint` link, use "Unknown" for the component name, and record a key visual constraint like:  
   - `"Design reference could not be retrieved. See Figma manually for details."`

Always summarise into human friendly notes.

## Step 3. Switch to a new Git branch

Before making any content, check whether `branch_name` is already taken by running `git branch --list "<branch_name>*"`. If it is, append the next free two-digit version number to it, starting at `-01` (e.g. `claude/feature/card-component-01`, then `-02`), and use that as `branch_name` from here on.

Then create and switch to the branch with `git switch -c <branch_name>`.

## Step 4. Draft the spec content

Create a markdown spec document that Plan mode can use directly and save it in the _specs folder using the `feature_slug`. Use the exact structure as defined in the spec template file here: @_specs/template.md. Do not add technical implementation details such as code examples.

If there is no `figma_hint`, leave out the `figma_component` line and the entire "Figma Design Reference" section. Do not include them with placeholder or "N/A" values.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

Branch: <branch_name>
Spec file: _specs/<feature_slug>.md
Title: <feature_title>

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch name to use.