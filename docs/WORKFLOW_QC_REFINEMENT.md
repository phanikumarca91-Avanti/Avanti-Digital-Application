# Workflow: QC Module Refinement
**Assignee:** Team Member 2
**Module:** Quality Control (`QCModule.jsx`)

## Phase 1: Setup (First Time Only)
1.  **Install Tools:** Ensure you have VS Code, Node.js, and Git installed.
2.  **Get the Code:**
    ```bash
    git clone https://github.com/phanikumarca91-Avanti/Avanti-Digital-Application.git
    cd Avanti-Digital-Application
    npm install
    ```

## Phase 2: Daily Start (The "Pull")
Before starting work each day, get the latest changes from the team:
```bash
git checkout development
git pull origin development
```

## Phase 3: Start Working (The "Branch")
Create a dedicated workspace for your changes so you don't break the main app.
```bash
git checkout -b feat/qc-refinement
```
*You are now safe to make any changes.*

## Phase 4: Refinement Tasks
**Focus File:** `src/components/modules/QCModule.jsx`

**Suggested Refinement Goals:**
1.  **Validation:** Ensure all required fields (Moisture, Count, etc.) are filled before "Pass".
2.  **UI Polish:** Check alignment of input boxes on mobile/tablet views.
3.  **Lab Report Integration:** (If ready) Add fields for specific lab parameters.
4.  **Double Submission Check:** Verify the `isSubmitting` fix (recently applied) is working smoothly.

**How to Run Locally:**
```bash
npm run dev
# Open http://localhost:5173 in Chrome
# Log in as QC User -> Navigate to Quality Module
```

## Phase 5: Saving Work (The "Push")
Once you are happy with a change:
1.  **Stage Files:** `git add .`
2.  **Save Snapshot:** `git commit -m "Improved QC validation logic"`
3.  **Upload:** `git push origin feat/qc-refinement`

## Phase 6: Code Review & Merge
1.  Go to the GitHub Repository.
2.  You will see a yellow banner: "feat/qc-refinement had recent pushes".
3.  Click **"Compare & Pull Request"**.
4.  Title: "Refined QC Module Logic".
5.  Click **Create Pull Request**.
6.  *Wait for the Team Lead to approve and merge.*

---
**Tip:** If you are stuck, ask the AI: "Explain the `handleQCSubmit` function in `QCModule.jsx`" to understand the existing code before changing it.
