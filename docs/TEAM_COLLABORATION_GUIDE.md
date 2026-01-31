# Team Collaboration Guide: Scaling to 3 Developers

## Overview
To work effectively as a team of 3, you cannot all work on the "Master" version at the same time on one computer. You must move to a **Distributed Workflow** using Git.

Crucially, **I (the AI Assistant) live in your local Code Editor.** I do not "live" in the cloud.
*   If Developer A asks me to write code, it happens on Developer A's machine.
*   For Developer B to see it, Developer A must **PUSH** the code to GitHub, and Developer B must **PULL** it.

---

## 1. The Golden Rule: "Branches"
Never work directly on the `main` branch. If three people edit `main` at once, you will overwrite each other's work.

### Recommended Structure
1.  **`main` Branch**: (Protected) - This is what runs on Vercel. Only "Perfect" code goes here.
2.  **`development` Branch**: (Shared) - This is where you combine everyone's work to test it together.
3.  **Feature Branches**: (Individual) - This is where you actually work.
    *   `feat/dev1-weighbridge` (Developer 1 working on Weighbridge)
    *   `feat/dev2-fleet` (Developer 2 working on Fleet)
    *   `fix/dev3-bugs` (Developer 3 fixing bugs)

---

## 2. The Daily Workflow

### Step 1: Start of Day (Get latest code)
Before you start typing, always get the latest updates from your team.
```bash
git checkout development
git pull origin development
```

### Step 2: Create your Workspace
Create a branch for your specific task.
```bash
git checkout -b feat/my-new-feature
```
*Now, you can ask me (AI) to write code, modify files, and break things. It won't affect your teammates.*

### Step 3: Save & Share (Push)
When you are done or want to save:
```bash
git add .
git commit -m "Added new fleet map"
git push origin feat/my-new-feature
```

### Step 4: Merge (Combine Work)
Go to GitHub.com and open a **Pull Request (PR)** from `feat/my-new-feature` to `development`.
*   Team leads review the code.
*   Click "Merge".
*   Now everyone has your changes!

---

## 3. How to Use the AI Assistant as a Team
Since each of you has a separate computer, you each have your own "Personal AI Pair Programmer".

*   **Developer A (Testing):** "Hey AI, write a test for the Weighbridge module." -> *AI writes test on A's machine.* -> *A pushes code.*
*   **Developer B (UI):** "Hey AI, change the sidebar color to Blue." -> *AI changes CSS on B's machine.* -> *B pushes code.*

**Conflict Warning:**
If Dev A changes line 10 of `App.jsx` and Dev B changes line 10 of `App.jsx`, Git will report a **Merge Conflict**.
*   **Solution:** Communicate! "I am working on the Sidebar, you work on the Map."

---

## 4. Setup Checklist for New Members
1.  **Install VS Code** on their laptops.
2.  **Clone the Repo**:
    ```bash
    git clone https://github.com/phanikumarca91-Avanti/Avanti-Digital-Application.git
    cd Avanti-Digital-Application
    npm install
    ```
3.  **Create their Branch**: `git checkout -b feat/dev-name-task`
4.  **Run Locally**: `npm run dev`

---

## 5. Vercel Deployments
*   Vercel automatically deploys the `main` branch.
*   You can configure Vercel to also deploy the `development` branch to a "Preview Link" (e.g., `avanti-app-git-development.vercel.app`).
*   **Use the Preview Link** for team testing. Only merge to `main` when the User (Client) needs to see it.
