# Git and Deployment Rules

- **NEVER RUN `git commit` OR `git push` AUTOMATICALLY.**
- Only make local file changes, typechecks (`npm run lint`), and builds (`npm run build`).
- Do NOT stage, commit, or push any changes to GitHub/remote repositories unless the user explicitly commands: "commit", "push", or "deploy to repo" in the prompt.
