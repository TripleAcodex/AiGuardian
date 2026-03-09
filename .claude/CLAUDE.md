# Global Development Rules

## Code Review with Coach Agent

Run the `coach` sub-agent **only when explicitly requested** by the user (e.g., user says "проверь код", "запусти coach", "/coach", "сделай ревью").

**Do NOT automatically run coach after every task.** This causes context overflow and crashes.

**When coach is requested:**
1. Run the `coach` sub-agent using the Task tool (subagent_type="coach")
2. Provide the user's requirements/spec as context
3. List the files that were changed
4. Fix ALL issues the coach identifies (CRITICAL, MAJOR, and MINOR)
5. Run coach again to verify fixes
6. Repeat until coach returns score = 100% (APPROVED ✅)
7. Only then report to the user that the task is complete

**If no spec was provided by the user and they request a coach review, ask for it first.**
